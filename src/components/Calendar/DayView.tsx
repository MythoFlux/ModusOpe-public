// src/components/Calendar/DayView.tsx
import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { formatDate, isSameDay, addDays, formatTimeString, isToday } from '../../utils/dateUtils'; 
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Event } from '../../types';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import TimeIndicator from '../Shared/TimeIndicator';

export default function DayView() {
  const { state, dispatch } = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentTime = useCurrentTime();

  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      const hourToShow = isToday(selectedDate) ? currentTime.getHours() : 8;
      scrollContainerRef.current.scrollTop = (hourToShow - 1) * 48;
    }
  }, [state.selectedDate, state.currentView, currentTime]);

  const { selectedDate, events } = state;

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = addDays(selectedDate, direction === 'next' ? 1 : -1);
    dispatch({ type: 'SET_SELECTED_DATE', payload: newDate });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    const timezoneOffset = newDate.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(newDate.getTime() + timezoneOffset);
    dispatch({ type: 'SET_SELECTED_DATE', payload: adjustedDate });
  };

  const dayEvents = useMemo(() =>
    events.filter(event => isSameDay(new Date(event.date), selectedDate)),
    [events, selectedDate]
  );

  const allDayEvents = useMemo(() => dayEvents.filter(e => !e.start_time), [dayEvents]);
  const timedEvents = useMemo(() => dayEvents.filter(e => !!e.start_time), [dayEvents]);

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

  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });
  
  const renderCurrentTimeIndicator = () => {
    if (!isToday(selectedDate)) return null;
    const topPosition = (currentTime.getHours() * 48) + (currentTime.getMinutes() * 48 / 60);
    return <TimeIndicator top={topPosition} currentTime={currentTime} showTimeLabel={true} />;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2">
          <button onClick={() => navigateDay('prev')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-xl font-semibold text-gray-900">
            {formatDate(selectedDate)}
          </h3>
          <button onClick={() => navigateDay('next')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <label htmlFor="day-view-date-picker" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              id="day-view-date-picker"
              name="day-view-date-picker"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={handleDateChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
        </div>
        <p className="text-sm text-gray-600">
          {dayEvents.length} tapahtuma{dayEvents.length !== 1 ? 'a' : ''}
        </p>
      </div>

      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 flex-shrink-0">
         <div className="flex">
            <div className="w-20 py-1 px-2 text-xs text-gray-500 text-right flex items-center justify-end">koko pv</div>
            <div className="flex-1 p-1 border-l border-gray-200 min-h-[30px] space-y-1">
              {allDayEvents.map(event => (
                  <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: event.color + '20', color: event.color, borderLeft: `3px solid ${event.color}` }}
                  >
                      {event.title}
                  </div>
              ))}
            </div>
         </div>
      </div>


      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="flex">
          <div className="w-20 py-2">
            {timeSlots.map((time) => (
              <div key={time} className="h-12 text-xs text-gray-500 pr-2 text-right flex items-start">
                {time}
              </div>
            ))}
          </div>

          <div className="flex-1 border-l border-gray-200 relative">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="h-12 border-b border-gray-100"
              />
            ))}

            {renderCurrentTimeIndicator()}

            {timedEvents.map((event) => {
              // KORJAUS: Sama logiikka kuin WeekView:ssä
              let startHour = 0;
              let startMinute = 0;
              if (event.start_time) {
                 const [h, m] = event.start_time.split(':').map(Number);
                 startHour = h;
                 startMinute = m;
              } else {
                 const d = new Date(event.date);
                 startHour = d.getHours();
                 startMinute = d.getMinutes();
              }
              
              const top = (startHour * 48) + (startMinute * 48 / 60);
              
              let height = 48;
              if (event.end_time && event.start_time) {
                const [endHour, endMinute] = event.end_time.split(':').map(Number);
                // Käytetään samoja lukuja keston laskemiseen
                const duration = (endHour - startHour) + ((endMinute - startMinute) / 60);
                height = duration * 48;
              }

              return (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className="absolute left-2 right-2 rounded-lg p-3 cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    top: `${top}px`,
                    height: `${Math.max(height, 40)}px`,
                    backgroundColor: event.color + '20',
                    borderLeft: `4px solid ${event.color}`,
                    minHeight: '40px'
                  }}
                >
                  <div className="flex items-baseline justify-between h-full">
                    <span className="font-medium text-gray-900 truncate pr-2">
                      {event.title}
                    </span>
                    {event.start_time && (
                      <span className="text-sm text-gray-600 flex-shrink-0 whitespace-nowrap">
                        {formatTimeString(event.start_time)}
                        {event.end_time && ` - ${formatTimeString(event.end_time)}`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {timedEvents.length === 0 && allDayEvents.length === 0 && (
              <div className="flex items-center justify-center h-full absolute inset-0 text-gray-500">
                Ei tapahtumia tälle päivälle
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
