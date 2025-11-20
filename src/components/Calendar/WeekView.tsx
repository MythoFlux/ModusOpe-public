// src/components/Calendar/WeekView.tsx
import React, { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { isSameDay, addDays, formatTimeString, isToday } from '../../utils/dateUtils';
import { Event } from '../../types';
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import TimeIndicator from '../Shared/TimeIndicator';

const HOUR_HEIGHT = 48; // Pikselikorkeus yhdelle tunnille

// Yksinkertainen jäsennys, joka vastaa DayView-näkymän logiikkaa
const getMinutesFromTimeString = (timeString: string | undefined | null): number | null => {
  if (!timeString) return null;
  const parts = timeString.split(':');
  if (parts.length < 2) return null;
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes)) return null;
  
  return Math.max(0, Math.min(23, hours)) * 60 + Math.max(0, Math.min(59, minutes));
};

const useEventLayout = (eventsByDay: Map<string, Event[]>, displayDates: Date[]) => {
  return useMemo(() => {
    const layoutMap = new Map<string, (Event & { layout: { top: number; height: number; left: string; width: string } })[]>();

    displayDates.forEach(date => {
      const dayKey = date.toISOString().split('T')[0];
      
      const timedEvents = (eventsByDay.get(dayKey) || [])
        .filter(e => !!e.start_time)
        .sort((a, b) => {
           const minA = getMinutesFromTimeString(a.start_time) || 0;
           const minB = getMinutesFromTimeString(b.start_time) || 0;
           return minA - minB;
        });

      if (timedEvents.length === 0) {
        layoutMap.set(dayKey, []);
        return;
      }

      const eventsWithMinutes = timedEvents.map(event => {
        const startMinutes = getMinutesFromTimeString(event.start_time) || 0;
        let endMinutes = getMinutesFromTimeString(event.end_time);
        
        if (endMinutes === null || endMinutes <= startMinutes) {
            endMinutes = startMinutes + 60; // Oletuskesto 60min
        }
        
        return { ...event, startMinutes, endMinutes };
      });

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

      layoutMap.set(dayKey, dayLayoutEvents);
    });

    return layoutMap;
  }, [eventsByDay, displayDates]);
};

export default function WeekView() {
  const { state, dispatch } = useApp();
  const { selectedDate, events } = state;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const currentTime = useCurrentTime();
  
  const [showWeekend, setShowWeekend] = useState(false);

  const getEarliestEventHour = (currentEvents: Event[], dates: Date[]) => {
      let minHour = 24;
      dates.forEach(date => {
          const dateKey = date.toISOString().split('T')[0];
          const daysEvents = currentEvents.filter(e => isSameDay(new Date(e.date), date) && e.start_time);
          daysEvents.forEach(e => {
              const mins = getMinutesFromTimeString(e.start_time);
              if (mins !== null) {
                  const h = Math.floor(mins / 60);
                  if (h < minHour) minHour = h;
              }
          });
      });
      return minHour === 24 ? 8 : minHour;
  };

  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      const currentHour = currentTime.getHours();
      
      const earliestEventHour = getEarliestEventHour(events, showWeekend ? 
        Array.from({length: 7}, (_, i) => addDays(getMondayOfWeek(selectedDate), i)) : 
        Array.from({length: 5}, (_, i) => addDays(getMondayOfWeek(selectedDate), i))
      );

      let hourToShow = 8;

      if (isToday(selectedDate)) {
          hourToShow = Math.min(currentHour, earliestEventHour);
      } else {
          hourToShow = earliestEventHour;
      }

      const scrollHour = Math.max(0, hourToShow - 1);
      scrollContainerRef.current.scrollTop = scrollHour * HOUR_HEIGHT;
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

  const displayDates = useMemo(() => showWeekend ? weekDates : weekDates.slice(0, 5), [showWeekend, weekDates]);
  const displayDays = useMemo(() => ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'].slice(0, displayDates.length), [displayDates]);

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
      dispatch({ type: 'TOGGLE_EVENT_DETAILS_MODAL', payload: event });
    }
  };

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>, date: Date) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    const clickedHour = Math.floor(y / HOUR_HEIGHT);
    const clickedMinutes = Math.floor((y % HOUR_HEIGHT) / (HOUR_HEIGHT / 2)) * 30;

    const startTimeString = `${clickedHour.toString().padStart(2, '0')}:${clickedMinutes.toString().padStart(2, '0')}`;
    const endHour = clickedHour + 1;
    const endTimeString = `${endHour.toString().padStart(2, '0')}:${clickedMinutes.toString().padStart(2, '0')}`;

    const newEventTemplate = {
        date: date,
        start_time: startTimeString,
        end_time: endTimeString,
        type: 'class'
    } as any;

    dispatch({ type: 'TOGGLE_EVENT_MODAL', payload: newEventTemplate });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = addDays(selectedDate, direction === 'next' ? 7 : -7);
    dispatch({ type: 'SET_SELECTED_DATE', payload: newDate });
  };

  const goToThisWeek = () => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: new Date() });
  };

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
  
  const renderCurrentTimeIndicator = (date: Date) => {
    if (!isToday(date)) return null;
    const topPosition = (currentTime.getHours() * HOUR_HEIGHT) + (currentTime.getMinutes() * HOUR_HEIGHT / 60);
    return <TimeIndicator top={topPosition} currentTime={currentTime} />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
      {/* Header */}
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

      {/* Scrollable Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
        <div className="relative min-h-full" ref={gridRef}>
            <div className="grid" style={{ gridTemplateColumns: gridColumns }}>
                
                {/* Time Labels Column */}
                <div className="col-start-1 bg-gray-50 border-r border-gray-200 sticky left-0 z-20">
                    {/* Header empty cell */}
                    <div className="h-[65px] border-b border-gray-200 bg-gray-50 sticky top-0 z-30"></div>
                    {/* Time slots */}
                    {timeSlots.map((time, i) => (
                        <div key={time} className="h-12 text-xs font-medium text-gray-400 pr-2 text-right flex items-start pt-1 relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                             <span className="-mt-2">{i === 0 ? '' : time}</span>
                        </div>
                    ))}
                </div>

                {/* Days Columns Container */}
                <div className="col-start-2 col-span-full grid" style={{ gridTemplateColumns: `repeat(${displayDates.length}, 1fr)` }}>
                    {displayDates.map((date, index) => {
                        const timedEvents = laidOutEventsByDay.get(date.toISOString().split('T')[0]) || [];
                        const allDayEvents = (eventsByDay.get(date.toISOString().split('T')[0]) || []).filter(e => !e.start_time);
                        
                        return (
                            <div key={index} className="border-r border-gray-100 last:border-r-0 flex flex-col relative">
                                {/* Day Header (Sticky) */}
                                <div className="sticky top-0 bg-white z-20 border-b border-gray-200">
                                    <div className={`py-2 px-2 text-center ${isToday(date) ? 'bg-blue-50' : 'bg-white'}`}>
                                        <div className={`text-sm font-medium ${isToday(date) ? 'text-blue-600' : 'text-gray-600'}`}>{displayDays[index]}</div>
                                        <div className={`text-lg font-semibold mt-1 inline-flex items-center justify-center w-8 h-8 rounded-full ${isToday(date) ? 'bg-blue-600 text-white' : 'text-gray-900'}`}>{date.getDate()}</div>
                                    </div>
                                    {/* All Day Events Area */}
                                    <div className="py-1 px-1 bg-white min-h-[8px] border-t border-gray-50">
                                        {allDayEvents.map(event => (
                                            <div
                                                key={event.id}
                                                onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                                className="text-[10px] px-1 py-0.5 rounded border-l-2 cursor-pointer hover:opacity-80 transition-shadow shadow-sm truncate font-medium mb-0.5"
                                                style={{ backgroundColor: event.color + '20', color: event.color, borderColor: event.color }}
                                                title={event.title}
                                            >
                                                {event.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Grid and Events Area */}
                                <div className="relative flex-1" onClick={(e) => handleGridClick(e, date)}>
                                    {/* Grid Lines */}
                                    {timeSlots.map((time, i) => (
                                        <div key={time} className="border-b border-gray-100 pointer-events-none" style={{ height: `${HOUR_HEIGHT}px` }} />
                                    ))}

                                    {/* Current Time Indicator */}
                                    {renderCurrentTimeIndicator(date)}

                                    {/* Events */}
                                    {timedEvents.map((event) => {
                                        const displayTime = () => {
                                           if (event.start_time) {
                                              return `${formatTimeString(event.start_time)}${event.end_time ? ` - ${formatTimeString(event.end_time)}` : ''}`;
                                           }
                                           return '';
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
                                                title={`${event.title} (${displayTime()})`}
                                            >
                                                <span className="font-semibold mr-1">{event.title}</span>
                                                <span className="opacity-75 text-[10px]">{displayTime()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
