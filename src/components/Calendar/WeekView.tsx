// src/components/Calendar/WeekView.tsx
import React, { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { isSameDay, addDays, formatTimeString, isToday } from '../../utils/dateUtils';
import { Event } from '../../types';
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import TimeIndicator from '../Shared/TimeIndicator';

const HOUR_HEIGHT = 48; 

// Yksinkertaistettu ajan laskenta uusille start_at -kentille
const getMinutesFromDate = (date: Date): number => {
  return date.getHours() * 60 + date.getMinutes();
};

const useEventLayout = (eventsByDay: Map<string, Event[]>, displayDates: Date[]) => {
  return useMemo(() => {
    const layoutMap = new Map<string, (Event & { layout: { top: number; height: number; left: string; width: string } })[]>();

    displayDates.forEach(date => {
      const dayKey = date.toISOString().split('T')[0];
      
      // Suodatetaan tapahtumat
      const timedEvents = (eventsByDay.get(dayKey) || [])
        .filter(e => {
          // Näytetään jos start_at on olemassa TAI vanha start_time on olemassa
          return e.start_at || e.start_time;
        })
        .map(e => {
           // Normalisoidaan: Jos start_at puuttuu, rakennetaan se vanhoista tiedoista lennossa (fallback)
           if (!e.start_at && e.start_time && e.date) {
             const [h, m] = e.start_time.split(':').map(Number);
             const d = new Date(e.date);
             d.setHours(h, m);
             return { ...e, start_at: d };
           }
           // Varmistetaan että start_at on Date-objekti (Supabase palauttaa stringin)
           if (e.start_at && typeof e.start_at === 'string') {
             return { ...e, start_at: new Date(e.start_at), end_at: e.end_at ? new Date(e.end_at) : undefined };
           }
           return e;
        })
        .sort((a, b) => {
           const dateA = a.start_at || new Date(a.date);
           const dateB = b.start_at || new Date(b.date);
           return dateA.getTime() - dateB.getTime();
        });

      if (timedEvents.length === 0) {
        layoutMap.set(dayKey, []);
        return;
      }

      const eventsWithMinutes = timedEvents.map(event => {
        // Käytetään nyt start_at tietoa, joka on luotettava timestamptz
        const eventStart = event.start_at || new Date(event.date);
        const startMinutes = getMinutesFromDate(eventStart);

        let endMinutes;
        if (event.end_at) {
          const eventEnd = new Date(event.end_at);
          endMinutes = getMinutesFromDate(eventEnd);
        } else if (event.end_time) {
           // Fallback vanhalle
           const [h, m] = event.end_time.split(':').map(Number);
           endMinutes = h * 60 + m;
        } else {
          endMinutes = startMinutes + 60;
        }
        
        if (endMinutes <= startMinutes) endMinutes = startMinutes + 45;

        return { ...event, startMinutes, endMinutes };
      });

      // --- Cluster Logic (Pysyy samana) ---
      const clusters: (typeof eventsWithMinutes)[] = [];
      if (eventsWithMinutes.length > 0) {
        let currentCluster = [eventsWithMinutes[0]];
        for (let i = 1; i < eventsWithMinutes.length; i++) {
          const event = eventsWithMinutes[i];
          const lastEventInCluster = currentCluster[currentCluster.length - 1];
          if (event.startMinutes < lastEventInCluster.endMinutes) {
            currentCluster.push(event);
          } else {
            clusters.push(currentCluster);
            currentCluster = [event];
          }
        }
        clusters.push(currentCluster);
      }

      const dayLayoutEvents: (Event & { layout: any })[] = [];

      clusters.forEach(cluster => {
        const columns: (typeof cluster)[] = [];
        cluster.forEach(event => {
          let placed = false;
          for (let i = 0; i < columns.length; i++) {
            const lastEventInColumn = columns[i][columns[i].length - 1];
            if (lastEventInColumn.endMinutes <= event.startMinutes) {
              columns[i].push(event);
              placed = true;
              break;
            }
          }
          if (!placed) {
            columns.push([event]);
          }
        });

        const totalColumns = columns.length;
        columns.forEach((column, colIndex) => {
          column.forEach(event => {
            const top = (event.startMinutes / 60) * HOUR_HEIGHT;
            const height = ((event.endMinutes - event.startMinutes) / 60) * HOUR_HEIGHT;

            dayLayoutEvents.push({
              ...event,
              layout: {
                top,
                height: Math.max(height, 24),
                width: `calc(${100 / totalColumns}% - 2px)`,
                left: `calc(${(colIndex / totalColumns) * 100}% + 1px)`,
              }
            });
          });
        });
      });
      // --- End Cluster Logic ---

      layoutMap.set(dayKey, dayLayoutEvents);
    });

    return layoutMap;
  }, [eventsByDay, displayDates]);
};

export default function WeekView() {
  const { state, dispatch } = useApp();
  const { selectedDate, events } = state;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentTime = useCurrentTime();
  const [showWeekend, setShowWeekend] = useState(false);

  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      const currentHour = currentTime.getHours();
      const hourToShow = (currentHour > 6 && isToday(selectedDate)) ? currentHour - 1 : 7;
      scrollContainerRef.current.scrollTop = Math.max(0, hourToShow * HOUR_HEIGHT);
    }
  }, [state.selectedDate, state.currentView, showWeekend]);

  const getMondayOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };
  const monday = useMemo(() => getMondayOfWeek(selectedDate), [selectedDate]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  }), [monday]);
  const weekDays = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
  const displayDates = useMemo(() => showWeekend ? weekDates : weekDates.slice(0, 5), [showWeekend, weekDates]);
  const displayDays = useMemo(() => showWeekend ? weekDays : weekDays.slice(0, 5), [showWeekend]);
  const gridColumns = `60px repeat(${displayDates.length}, 1fr)`;

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    displayDates.forEach(day => {
      const dayEvents = events.filter(event => isSameDay(new Date(event.date), day));
      map.set(day.toISOString().split('T')[0], dayEvents);
    });
    return map;
  }, [displayDates, events]);

  const laidOutEventsByDay = useEventLayout(eventsByDay, displayDates);

  const handleEventClick = (event: Event) => {
    if (event.type === 'deadline' && event.project_id) {
      if (event.project_id === GENERAL_TASKS_PROJECT_ID) return; 
      dispatch({ type: 'TOGGLE_PROJECT_MODAL', payload: event.project_id });
    } else {
      dispatch({ type: 'TOGGLE_EVENT_DETAILS_MODAL', payload: event });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = addDays(selectedDate, direction === 'next' ? 7 : -7);
    dispatch({ type: 'SET_SELECTED_DATE', payload: newDate });
  };
  const goToThisWeek = () => dispatch({ type: 'SET_SELECTED_DATE', payload: new Date() });
  const getWeekRange = () => {
    const startDate = weekDates[0]; 
    const endDate = weekDates[6];  
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.getDate()}. - ${endDate.getDate()}. ${startDate.toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' })}`;
    } else {
      return `${startDate.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}. - ${endDate.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', year: 'numeric' })}.`;
    }
  };
  const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
  
  const renderCurrentTimeIndicator = () => {
    const todayIndex = displayDates.findIndex(date => isToday(date));
    if (todayIndex === -1) return null;
    const topPosition = (currentTime.getHours() * HOUR_HEIGHT) + (currentTime.getMinutes() * HOUR_HEIGHT / 60);
    const gridColumnStart = todayIndex + 2;
    return (
        <div style={{ gridColumn: `${gridColumnStart} / span 1`, position: 'relative', height: 0, zIndex: 50 }}>
             <TimeIndicator top={topPosition} currentTime={currentTime} />
        </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white z-30 rounded-t-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => navigateWeek('prev')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <h3 className="text-lg font-semibold text-gray-900 min-w-[250px] text-center hidden sm:block">{getWeekRange()}</h3>
            <button onClick={() => navigateWeek('next')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <button onClick={goToThisWeek} className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium">Tämä viikko</button>
        </div>
        <button onClick={() => setShowWeekend(!showWeekend)} className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700">
          {showWeekend ? (<><EyeOff className="w-4 h-4" /><span className="hidden sm:inline">Piilota vkl</span></>) : (<><Eye className="w-4 h-4" /><span className="hidden sm:inline">Näytä vkl</span></>)}
        </button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
        <div className="sticky top-0 bg-white z-20 shadow-sm">
            <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: gridColumns }}>
              <div className="py-4 px-2 text-center bg-gray-50 border-r border-gray-100"></div>
              {displayDates.map((date, index) => (
                <div key={`header-${index}`} className={`py-2 px-2 text-center border-r border-gray-100 last:border-r-0 ${isToday(date) ? 'bg-blue-50' : 'bg-white'}`}>
                  <div className={`text-sm font-medium ${isToday(date) ? 'text-blue-600' : 'text-gray-600'}`}>{displayDays[index]}</div>
                  <div className={`text-lg font-semibold mt-1 inline-flex items-center justify-center w-8 h-8 rounded-full ${isToday(date) ? 'bg-blue-600 text-white' : 'text-gray-900'}`}>{date.getDate()}</div>
                </div>
              ))}
            </div>
            <div className="grid border-b border-gray-200 bg-white" style={{ gridTemplateColumns: gridColumns }}>
                <div className="py-2 px-2 text-xs font-medium text-gray-400 text-right flex items-center justify-end bg-gray-50 border-r border-gray-100">koko pv</div>
                {displayDates.map((date, index) => {
                    const allDayEvents = (eventsByDay.get(date.toISOString().split('T')[0]) || []).filter(e => !e.start_time && !e.start_at);
                    return (
                        <div key={`allday-${index}`} className="p-1 border-r border-gray-100 min-h-[32px] space-y-1">
                            {allDayEvents.map(event => (
                                <div
                                    key={event.id}
                                    onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                    className="text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-shadow shadow-sm truncate font-medium"
                                    style={{ backgroundColor: event.color + '20', color: event.color, borderLeft: `3px solid ${event.color}` }}
                                    title={event.title}
                                >
                                    {event.title}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="relative min-h-full">
            <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
                <div className="col-start-1 bg-gray-50 border-r border-gray-200">
                    {timeSlots.map((time, i) => (
                        <div key={time} className="h-12 text-xs font-medium text-gray-400 pr-2 text-right flex items-start pt-1 relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                             <span className="-mt-2">{i === 0 ? '' : time}</span>
                        </div>
                    ))}
                </div>
                <div className="col-start-2 col-span-full grid relative" style={{ gridTemplateColumns: `repeat(${displayDates.length}, 1fr)` }}>
                    {displayDates.map((_, dateIndex) => (
                         <div key={dateIndex} className="border-r border-gray-100 last:border-r-0">
                             {timeSlots.map((time, i) => (
                                 <div key={time} className={`border-b border-gray-100 ${i === 12 ? 'border-b-2 border-gray-200' : ''}`} style={{ height: `${HOUR_HEIGHT}px` }} />
                             ))}
                         </div>
                    ))}
                </div>
            </div>
            
            <div className="absolute top-0 left-0 w-full h-full grid pointer-events-none" style={{ gridTemplateColumns: gridColumns }}>
                {renderCurrentTimeIndicator()}
                <div className="col-start-1"></div>
                 {displayDates.map((date, dateIndex) => {
                    const timedEvents = laidOutEventsByDay.get(date.toISOString().split('T')[0]) || [];
                    return (
                        <div key={dateIndex} className="relative h-full pointer-events-auto">
                             {timedEvents.map((event) => {
                                // Apufunktio ajan näyttämiseen
                                const displayTime = () => {
                                    if (event.start_at) {
                                        const s = new Date(event.start_at);
                                        const e = event.end_at ? new Date(event.end_at) : null;
                                        return `${formatTimeString(s.toTimeString().slice(0,5))}${e ? ` - ${formatTimeString(e.toTimeString().slice(0,5))}` : ''}`;
                                    }
                                    return `${formatTimeString(event.start_time)}${event.end_time ? ` - ${formatTimeString(event.end_time)}` : ''}`;
                                };

                                return (
                                    <div
                                        key={event.id}
                                        onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                        className="absolute rounded px-2 py-1 cursor-pointer hover:opacity-90 transition-all text-xs z-10 shadow-sm hover:shadow-md truncate leading-tight"
                                        style={{
                                            top: `${event.layout.top}px`,
                                            height: `${event.layout.height}px`,
                                            left: event.layout.left,
                                            width: event.layout.width,
                                            backgroundColor: event.color + '15',
                                            borderLeft: `3px solid ${event.color}`,
                                            color: '#1f2937'
                                        }}
                                    >
                                        <span className="font-semibold mr-1">{event.title}</span>
                                        <span className="opacity-75 text-[10px]">{displayTime()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    );
                 })}
            </div>
        </div>
      </div>
    </div>
  );
}
