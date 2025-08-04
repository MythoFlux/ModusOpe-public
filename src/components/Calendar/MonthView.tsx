// src/components/Calendar/MonthView.tsx
import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getDaysInMonth, isSameDay, isToday, formatTimeString } from '../../utils/dateUtils';
import { Event } from '../../types';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';

export default function MonthView() {
  const { state, dispatch } = useApp();
  const { selectedDate, events } = state;

  const daysInMonth = useMemo(() => getDaysInMonth(selectedDate), [selectedDate]);
  const currentMonth = selectedDate.getMonth();

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    daysInMonth.forEach(day => {
      const dayEvents = events.filter(event => isSameDay(new Date(event.date), day) && event.type !== 'class');
      
      dayEvents.sort((a, b) => {
        if (!a.startTime) return -1;
        if (!b.startTime) return 1;
        return a.startTime.localeCompare(b.startTime);
      });
      map.set(day.toISOString().split('T')[0], dayEvents);
    });
    return map;
  }, [daysInMonth, events]);

  const handleDateClick = (date: Date) => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date });
    dispatch({ type: 'SET_VIEW', payload: 'day' });
  };

  const handleEventClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.type === 'deadline' && event.project_id) { // KORJATTU
        if (event.project_id === GENERAL_TASKS_PROJECT_ID) { // KORJATTU
            return;
        }
      dispatch({ type: 'TOGGLE_PROJECT_MODAL', payload: event.project_id }); // KORJATTU
    } else {
      dispatch({ type: 'TOGGLE_EVENT_MODAL', payload: event });
    }
  };

  const weekDays = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDays.map((day) => (
          <div key={day} className="p-4 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
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
                    {event.startTime && (
                      <span className="font-medium">{formatTimeString(event.startTime)} </span>
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
