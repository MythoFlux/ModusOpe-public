// src/components/Calendar/MonthView.tsx
import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getDaysInMonth, isSameDay, isToday, formatTimeString } from '../../utils/dateUtils';
import { Event } from '../../types';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';

export default function MonthView() {
  const { state, dispatch } = useApp();
  const { selectedDate, events } = state;
  const [showCourses, setShowCourses] = useState(false);

  const daysInMonth = useMemo(() => getDaysInMonth(selectedDate), [selectedDate]);
  const currentMonth = selectedDate.getMonth();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    daysInMonth.forEach(day => {
      const dayEvents = events.filter(event => {
        const isSame = isSameDay(new Date(event.date), day);
        if (!isSame) return false;
        if (showCourses) return true; // Show all events if checkbox is checked
        return event.type !== 'class'; // Otherwise, hide 'class' type events
      });
      
      dayEvents.sort((a, b) => {
        if (!a.start_time) return -1;
        if (!b.start_time) return 1;
        return a.start_time.localeCompare(b.start_time);
      });
      map.set(day.toISOString().split('T')[0], dayEvents);
    });
    return map;
  }, [daysInMonth, events, showCourses]);

  const handleDateClick = (date: Date) => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date });
    dispatch({ type: 'SET_VIEW', payload: 'day' });
  };

  const handleEventClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.type === 'deadline' && event.project_id) {
        if (event.project_id === GENERAL_TASKS_PROJECT_ID) {
            return;
        }
      dispatch({ type: 'TOGGLE_PROJECT_MODAL', payload: event.project_id });
    } else {
      // MUUTETTU
      dispatch({ type: 'TOGGLE_EVENT_DETAILS_MODAL', payload: event });
    }
  };

  const weekDays = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="grid grid-cols-7 border-b border-gray-200 items-center">
        {weekDays.map((day) => (
          <div key={day} className="p-4 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>
       <div className="p-2 border-b border-gray-200">
        <label className="flex items-center space-x-2 cursor-pointer text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showCourses}
            onChange={() => setShowCourses(!showCourses)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span>Näytä kurssit</span>
        </label>
      </div>

      <div className="grid grid-cols-7">
        {daysInMonth.map((date, index) => {
          const dayEvents = eventsByDay.get(date.toISOString().split('T')[0]) || [];
          const isCurrentMonth = date.getMonth() === currentMonth;
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);

          return (
            <div
              key={index}
              onClick={() => handleDateClick(date)}
              className={`min-h-[120px] p-2 border-r border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 flex flex-col ${
                !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
              } ${isSelected ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium ${
                    isTodayDate
                      ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center'
                      : isCurrentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              <div className="space-y-0.5 flex-1 min-h-0 overflow-hidden">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => handleEventClick(event, e)}
                    className="text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: event.color + '20', color: event.color }}
                  >
                    {event.start_time && (
                      <span className="font-medium">{formatTimeString(event.start_time)} </span>
                    )}
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDateClick(date);
                    }}
                    className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline pt-0.5"
                  >
                    + {dayEvents.length - 2} lisää
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
