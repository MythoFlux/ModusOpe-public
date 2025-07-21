import React from 'react';
import { useApp } from '../../contexts/AppContext';
import CalendarHeader from './CalendarHeader';
import MonthView from './MonthView';
import WeekView from './WeekView';
import DayView from './DayView';
import ScheduleTemplateView from './ScheduleTemplateView';

export default function Calendar() {
  const { state } = useApp();
  const { currentView } = state;

  const renderView = () => {
    switch (currentView) {
      case 'month':
        return <MonthView />;
      case 'week':
        return <WeekView />;
      case 'day':
        return <DayView />;
      case 'schedule':
        return <ScheduleTemplateView />;
      default:
        return <MonthView />;
    }
  };

  return (
    // Tämä rakenne on nyt oikein, kun App.tsx on korjattu
    <div className="p-4 md:p-8 h-full flex flex-col">
      <CalendarHeader />
      <div className="flex-1 min-h-0"> 
        {renderView()}
      </div>
    </div>
  );
}
