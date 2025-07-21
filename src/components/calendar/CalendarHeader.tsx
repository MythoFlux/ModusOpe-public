import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { addMonths, getMonthName, getYear } from '../../utils/dateUtils';
import { CalendarView } from '../../types';

export default function CalendarHeader() {
  const { state, dispatch } = useApp();
  const { selectedDate, currentView } = state;

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = addMonths(selectedDate, direction === 'next' ? 1 : -1);
    dispatch({ type: 'SET_SELECTED_DATE', payload: newDate });
  };

  const setView = (view: CalendarView) => {
    dispatch({ type: 'SET_VIEW', payload: view });
  };

  const goToToday = () => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: new Date() });
  };

  const showNavigation = currentView !== 'schedule' && currentView !== 'day';

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-4">
        {showNavigation && (
          <>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-semibold text-gray-800 min-w-[200px] text-center">
                {getMonthName(selectedDate)} {getYear(selectedDate)}
              </h2>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Tänään
            </button>
          </>
        )}
        {currentView === 'schedule' && (
          <h2 className="text-2xl font-semibold text-gray-800">
            Kiertotuntikaavio
          </h2>
        )}
      </div>

      <div className="flex bg-gray-100 rounded-lg p-1">
        {(['month', 'week', 'day', 'schedule'] as CalendarView[]).map((view) => (
          <button
            key={view}
            onClick={() => setView(view)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              currentView === view
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {view === 'month' && 'Kuukausi'}
            {view === 'week' && 'Viikko'}
            {view === 'day' && 'Päivä'}
            {view === 'schedule' && 'Kiertotuntikaavio'}
          </button>
        ))}
      </div>
    </div>
  );
}
