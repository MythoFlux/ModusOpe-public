// src/components/Calendar/WeekView.tsx
import React, { useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { formatDate, isToday, isSameDay, addDays, formatTimeString } from '../../utils/dateUtils';
import { Event } from '../../types';
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';

// Apufunktio tapahtumien asettelun laskemiseen
const useEventLayout = (eventsByDay: Map<string, Event[]>, displayDates: Date[]) => {
  return useMemo(() => {
    const layoutMap = new Map<string, (Event & { layout: { top: number; height: number; left: string; width: string } })[]>();

    displayDates.forEach(date => {
      const dayKey = date.toISOString().split('T')[0];
      const timedEvents = (eventsByDay.get(dayKey) || [])
        .filter(e => !!e.start_time)
        .sort((a, b) => {
          const aStartTime = a.start_time || '00:00';
          const bStartTime = b.start_time || '00:00';
          return aStartTime.localeCompare(bStartTime);
        });

      if (timedEvents.length === 0) {
        layoutMap.set(dayKey, []);
        return;
      }

      // Muunnetaan tapahtumat minuuteiksi päivän alusta
      const eventsWithMinutes = timedEvents.map(event => {
        const eventDate = new Date(event.date);
        const startMinutes = eventDate.getHours() * 60 + eventDate.getMinutes();
        let endMinutes;
        if (event.end_time) {
          const [endHour, endMinute] = event.end_time.split(':').map(Number);
          endMinutes = endHour * 60 + endMinute;
        } else {
          endMinutes = startMinutes + 60; // Oletuskesto 60 min
        }
        return { ...event, startMinutes, endMinutes };
      });

      // Ryhmitellään päällekkäiset tapahtumat
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
            const hourRowHeight = 48; // Yhden tunnin rivin korkeus px
            const top = (event.startMinutes / 60) * hourRowHeight;
            const height = ((event.endMinutes - event.startMinutes) / 60) * hourRowHeight;

            dayLayoutEvents.push({
              ...event,
              layout: {
                top,
                height: Math.max(height, 20),
                width: `calc(${100 / totalColumns}% - 4px)`,
                left: `calc(${(colIndex / totalColumns) * 100}% + 2px)`,
              }
            });
          });
        });
      });

      layoutMap.set(dayKey, dayLayoutEvents);
    });

    return layoutMap;
  }, [eventsByDay, displayDates]);
};


export default function WeekView() {
  const { state, dispatch } = useApp();
  const { selectedDate, events } = state;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [showWeekend, setShowWeekend] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Päivittää joka minuutti

    return () => clearInterval(timer);
  }, []);

  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      const hourToShow = isToday(new Date()) ? currentTime.getHours() : 8;
      scrollContainerRef.current.scrollTop = Math.max(0, (hourToShow - 1) * 48);
    }
  }, [state.selectedDate, state.currentView, showWeekend, currentTime]);

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
      if (event.project_id === GENERAL_TASKS_PROJECT_ID) {
        return; 
      }
      dispatch({ type: 'TOGGLE_PROJECT_MODAL', payload: event.project_id });
    } else {
      dispatch({ type: 'TOGGLE_EVENT_MODAL', payload: event });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = addDays(selectedDate, direction === 'next' ? 7 : -7);
    dispatch({ type: 'SET_SELECTED_DATE', payload: newDate });
  };

  const goToThisWeek = () => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: new Date() });
  };

  const getWeekRange = () => {
    const startDate = weekDates[0]; // Käytetään aina koko viikon ensimmäistä päivää
    const endDate = weekDates[6];   // Käytetään aina koko viikon viimeistä päivää (sunnuntai)

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

    const topPosition = (currentTime.getHours() * 48) + (currentTime.getMinutes() * 48 / 60);
    const gridColumnStart = todayIndex + 2; // +1 for time column, +1 for 1-based index

    return (
        <div className="absolute left-0 right-0 z-20" style={{ top: `${topPosition}px`, gridColumn: `${gridColumnStart} / span 1`}}>
            <div className="relative h-px bg-red-500">
                <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-red-500 rounded-full"></div>
            </div>
        </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => navigateWeek('prev')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <h3 className="text-lg font-semibold text-gray-900 min-w-[280px] text-center">{getWeekRange()}</h3>
            <button onClick={() => navigateWeek('next')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <button onClick={goToThisWeek} className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">Tämä viikko</button>
        </div>
        <button onClick={() => setShowWeekend(!showWeekend)} className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
          {showWeekend ? (<><EyeOff className="w-4 h-4" /><span>Piilota viikonloppu</span></>) : (<><Eye className="w-4 h-4" /><span>Näytä viikonloppu</span></>)}
        </button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-white z-20">
            <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: gridColumns }}>
              <div className="py-4 px-2 text-center"></div>
              {displayDates.map((date, index) => (
                <div key={`header-${index}`} className="py-2 px-2 text-center border-l border-gray-200">
                  <div className="text-sm font-medium text-gray-600">{displayDays[index]}</div>
                  <div className={`text-lg font-semibold mt-1 ${isToday(date) ? 'bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center mx-auto' : 'text-gray-900'}`}>{date.getDate()}.</div>
                </div>
              ))}
            </div>

            <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: gridColumns }}>
                <div className="py-1 px-2 text-xs text-gray-500 text-right flex items-center justify-end">koko pv</div>
                {displayDates.map((date, index) => {
                    const allDayEvents = (eventsByDay.get(date.toISOString().split('T')[0]) || []).filter(e => !e.start_time);
                    return (
                        <div key={`allday-${index}`} className="p-1 border-l border-gray-200 min-h-[30px] space-y-1">
                            {allDayEvents.map(event => (
                                <div
                                    key={event.id}
                                    onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                    className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: event.color + '20', color: event.color, borderLeft: `3px solid ${event.color}` }}
                                >
                                    {event.title}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>

        <div className="relative">
            <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
                <div className="col-start-1">
                    {timeSlots.map((time, i) => (
                        <div key={time} className="h-12 text-xs text-gray-500 pr-2 text-right flex items-start">
                             {i === 0 ? '' : time}
                        </div>
                    ))}
                </div>
                <div className="col-start-2 col-span-full grid" style={{ gridTemplateColumns: `repeat(${displayDates.length}, 1fr)` }}>
                    {displayDates.map((_, dateIndex) => (
                         <div key={dateIndex} className="border-l border-gray-200">
                             {timeSlots.map((time, i) => (
                                 <div key={time} className={`h-12 ${i > 0 ? 'border-b border-gray-100' : ''}`} />
                             ))}
                         </div>
                    ))}
                </div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full grid" style={{ gridTemplateColumns: gridColumns }}>
                {renderCurrentTimeIndicator()}
                <div className="col-start-1"></div>
                 {displayDates.map((date, dateIndex) => {
                    const timedEvents = laidOutEventsByDay.get(date.toISOString().split('T')[0]) || [];
                    return (
                        <div key={dateIndex} className="relative">
                             {timedEvents.map((event) => {
                                return (
                                    <div
                                        key={event.id}
                                        onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                        className="absolute rounded p-1 cursor-pointer hover:opacity-80 transition-opacity text-xs z-10"
                                        style={{
                                            top: `${event.layout.top}px`,
                                            height: `${event.layout.height}px`,
                                            left: event.layout.left,
                                            width: event.layout.width,
                                            backgroundColor: event.color + '20',
                                            borderLeft: `3px solid ${event.color}`,
                                            minHeight: '20px'
                                        }}
                                    >
                                        <div className="font-medium text-gray-900 truncate">{event.title}</div>
                                        {event.start_time && (<div className="text-gray-600 text-xs">{formatTimeString(event.start_time)}{event.end_time && ` - ${formatTimeString(event.end_time)}`}</div>)}
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
