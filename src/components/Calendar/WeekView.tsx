// src/components/Calendar/WeekView.tsx
import React, { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { formatDate, isToday, isSameDay, addDays, formatTimeString } from '../../utils/dateUtils'; // <-- LISÄTTY formatTimeString
import { Event } from '../../types';
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';

export default function WeekView() {
  const { state, dispatch } = useApp();
  const { selectedDate, events } = state;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [showWeekend, setShowWeekend] = useState(false);

  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 8 * 48;
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

  const handleEventClick = (event: Event) => {
    if (event.type === 'deadline' && event.projectId) {
      if (event.projectId === GENERAL_TASKS_PROJECT_ID) {
        return; 
      }
      dispatch({ type: 'TOGGLE_PROJECT_MODAL', payload: event.projectId });
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
    const startDate = displayDates[0];
    const endDate = displayDates[displayDates.length - 1];
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.getDate()}. - ${endDate.getDate()}. ${startDate.toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' })}`;
    } else {
      return `${startDate.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short' })}. - ${endDate.toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', year: 'numeric' })}.`;
    }
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

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
                    const allDayEvents = (eventsByDay.get(date.toISOString().split('T')[0]) || []).filter(e => !e.startTime);
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
                    {timeSlots.map((time) => (
                        <div key={time} className="h-12 text-xs text-gray-500 pr-2 text-right flex items-start">{time}</div>
                    ))}
                </div>
                <div className="col-start-2 col-span-full grid" style={{ gridTemplateColumns: `repeat(${displayDates.length}, 1fr)` }}>
                    {displayDates.map((_, dateIndex) => (
                         <div key={dateIndex} className="border-l border-gray-200">
                             {timeSlots.map((time) => (
                                 <div key={time} className="h-12 border-b border-gray-100" />
                             ))}
                         </div>
                    ))}
                </div>
            </div>
            <div className="absolute top-0 left-0 w-full h-full grid" style={{ gridTemplateColumns: gridColumns }}>
                <div className="col-start-1"></div>
                 {displayDates.map((date, dateIndex) => {
                    const timedEvents = (eventsByDay.get(date.toISOString().split('T')[0]) || []).filter(e => !!e.startTime);
                    return (
                        <div key={dateIndex} className="relative">
                             {timedEvents.map((event) => {
                                const eventDate = new Date(event.date);
                                const startHour = eventDate.getHours();
                                const startMinute = eventDate.getMinutes();
                                const top = (startHour * 48) + (startMinute * 48 / 60);

                                let height = 48;
                                if (event.endTime && event.startTime) {
                                    const [endHour, endMinute] = event.endTime.split(':').map(Number);
                                    const [startHourTime, startMinuteTime] = event.startTime.split(':').map(Number);
                                    const duration = (endHour - startHourTime) + ((endMinute - startMinuteTime) / 60);
                                    height = duration * 48;
                                }

                                return (
                                    <div
                                        key={event.id}
                                        onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                        className="absolute left-1 right-1 rounded p-1 cursor-pointer hover:opacity-80 transition-opacity text-xs z-10"
                                        style={{
                                            top: `${top}px`,
                                            height: `${Math.max(height, 20)}px`,
                                            backgroundColor: event.color + '20',
                                            borderLeft: `3px solid ${event.color}`,
                                            minHeight: '20px'
                                        }}
                                    >
                                        <div className="font-medium text-gray-900 truncate">{event.title}</div>
                                        {event.startTime && (<div className="text-gray-600 text-xs">{formatTimeString(event.startTime)}{event.endTime && ` - ${formatTimeString(event.endTime)}`}</div>)}
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
