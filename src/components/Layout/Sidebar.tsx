import React from 'react';
import { Calendar, BookOpen, CheckSquare, ClipboardCheck, Home, ChevronLeft, LayoutDashboard } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { state, dispatch } = useApp();
  const { isSidebarCollapsed, isMobileMenuOpen } = state;

const menuItems = [
    { id: 'dashboard', label: 'Kojelauta', icon: Home },
    { id: 'calendar', label: 'Kalenteri', icon: Calendar },
    { id: 'courses', label: 'Kurssit', icon: BookOpen },
    { id: 'projects', label: 'Projektit', icon: ClipboardCheck },
    { id: 'tasks', label: 'Tehtävät', icon: CheckSquare },
    { id: 'kanban', label: 'Kanban', icon: LayoutDashboard }
  ];
  
  const sidebarClasses = `
    h-full bg-white shadow-lg flex flex-col transition-all duration-300 z-40
    fixed md:relative 
    ${isSidebarCollapsed ? 'w-20' : 'w-64'}
    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0
  `;

  return (
    <div className={sidebarClasses}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isSidebarCollapsed && (
          <div>
            <h1 className="text-xl font-bold text-gray-800">ModusOpe</h1>
            <p className="text-sm text-gray-600 mt-1">Opettajien modus operandi</p>
          </div>
        )}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          // Piilotetaan tämä painike mobiilissa
          className="p-1.5 rounded-full hover:bg-gray-100 hidden md:block"
        >
          <ChevronLeft className={`transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    onTabChange(item.id);
                    // Suljetaan mobiilivalikko valinnan jälkeen
                    if (isMobileMenuOpen) {
                      dispatch({ type: 'TOGGLE_MOBILE_MENU' });
                    }
                  }}
                  className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${isSidebarCollapsed ? 'justify-center' : ''} ${
                    activeTab === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {!isSidebarCollapsed && <span className="ml-3">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {!isSidebarCollapsed && (
        <div className="hidden md:block p-6 border-t border-gray-200">
          <button
            onClick={() => {
              dispatch({ type: 'TOGGLE_EVENT_MODAL' });
              if (isMobileMenuOpen) dispatch({ type: 'TOGGLE_MOBILE_MENU' });
            }}
            className="w-full flex items-center justify-center btn-glossy mb-2"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Lisää tapahtuma
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'TOGGLE_COURSE_MODAL' });
              if (isMobileMenuOpen) dispatch({ type: 'TOGGLE_MOBILE_MENU' });
            }}
            className="w-full flex items-center justify-center btn-glossy mb-2"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Lisää kurssi
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'TOGGLE_PROJECT_MODAL' });
              if (isMobileMenuOpen) dispatch({ type: 'TOGGLE_MOBILE_MENU' });
            }}
            className="w-full flex items-center justify-center btn-glossy mb-2"
          >
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Lisää projekti
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'TOGGLE_TASK_MODAL' });
              if (isMobileMenuOpen) dispatch({ type: 'TOGGLE_MOBILE_MENU' });
            }}
            className="w-full flex items-center justify-center btn-glossy mb-2"
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Lisää tehtävä
          </button>
        </div>
      )}
    </div>
  );
}
