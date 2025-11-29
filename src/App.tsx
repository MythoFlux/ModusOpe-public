// src/App.tsx
import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import Calendar from './components/Calendar/Calendar';
import ProjectList from './components/Projects/ProjectList';
import CourseList from './components/Courses/CourseList';
import TaskList from './components/Tasks/TaskList';
import EventModal from './components/Modals/EventModal';
import EventDetailsModal from './components/Modals/EventDetailsModal';
import TaskDetailsModal from './components/Modals/TaskDetailsModal';
import ProjectModal from './components/Modals/ProjectModal';
import CourseModal from './components/Modals/CourseModal';
import ScheduleTemplateModal from './components/Modals/ScheduleTemplateModal';
import TaskModal from './components/Modals/TaskModal';
import KanbanView from './components/Kanban/KanbanView';
import ConfirmationModal from './components/Modals/ConfirmationModal';
import Auth from './components/Auth';
import { Menu, Plus, Calendar as CalendarIcon, BookOpen, ClipboardCheck, CheckSquare } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { state, dispatch } = useApp();
  const { isMobileMenuOpen, session } = state;

  const [isFabMenuOpen, setFabMenuOpen] = useState(false);

  // KÄYTETTÄVYYS: Sulje modaalit Escape-näppäimellä
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Tarkistetaan onko jokin modaali auki ennen dispatchausta turhien renderöintien välttämiseksi
        if (
          state.showEventModal || 
          state.showEventDetailsModal || 
          state.showTaskModal || 
          state.showTaskDetailsModal || 
          state.showProjectModal || 
          state.showCourseModal || 
          state.showScheduleTemplateModal
        ) {
          dispatch({ type: 'CLOSE_MODALS' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, dispatch]);

  if (!session) {
    return <Auth />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'calendar': return <Calendar />;
      case 'courses': return <CourseList />;
      case 'projects': return <ProjectList />;
      case 'tasks': return <TaskList />;
      case 'kanban': return <KanbanView />;
      default: return <Dashboard />;
    }
  };

  const fabActions = [
    { label: 'Tapahtuma', icon: CalendarIcon, action: () => dispatch({ type: 'TOGGLE_EVENT_MODAL' }) },
    { label: 'Kurssi', icon: BookOpen, action: () => dispatch({ type: 'TOGGLE_COURSE_MODAL' }) },
    { label: 'Projekti', icon: ClipboardCheck, action: () => dispatch({ type: 'TOGGLE_PROJECT_MODAL' }) },
    { label: 'Tehtävä', icon: CheckSquare, action: () => dispatch({ type: 'TOGGLE_TASK_MODAL' }) },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden p-4 bg-white shadow-md flex items-center">
          <button onClick={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })}>
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold ml-4">ModusOpe</h1>
        </header>

        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => dispatch({ type: 'TOGGLE_MOBILE_MENU' })}
        />
      )}

      {isFabMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-30 md:hidden"
          onClick={() => setFabMenuOpen(false)}
        />
      )}

      <div className="md:hidden fixed bottom-6 right-6 z-40">
        {isFabMenuOpen && (
          <div className="flex flex-col items-end space-y-3 mb-3">
            {fabActions.map(item => (
              <div key={item.label} className="flex items-center">
                <span className="bg-white text-sm text-gray-800 rounded-md px-3 py-1 mr-3 shadow-sm">{item.label}</span>
                <button
                  onClick={() => {
                    item.action();
                    setFabMenuOpen(false);
                  }}
                  className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-lg text-blue-600"
                >
                  <item.icon className="w-6 h-6" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setFabMenuOpen(!isFabMenuOpen)}
          className="w-16 h-16 flex items-center justify-center rounded-full text-white shadow-xl transition-transform duration-200"
          style={{ backgroundImage: 'linear-gradient(to bottom, #6b7280, #1f2937)' }}
        >
          <Plus className={`w-8 h-8 transition-transform duration-300 ${isFabMenuOpen ? 'rotate-45' : ''}`} />
        </button>
      </div>

      <EventDetailsModal />
      <TaskDetailsModal />
      <EventModal />
      <ProjectModal />
      <CourseModal />
      <ScheduleTemplateModal />
      <TaskModal />
      <ConfirmationModal />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
