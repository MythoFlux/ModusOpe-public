import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Plus, Trash2 } from 'lucide-react';
import { ScheduleTemplate } from '../../types';

export default function ScheduleTemplateView() {
  const { state, dispatch } = useApp();
  const { scheduleTemplates } = state;

  // MUUTOS: Viikonpäivien nimet on lyhennetty
  const weekDays = ['Ma', 'Ti', 'Ke', 'To', 'Pe'];
  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = (i + 6).toString().padStart(2, '0');
    return `${hour}:00`;
  });

  const handleAddTemplate = () => {
    dispatch({ type: 'TOGGLE_SCHEDULE_TEMPLATE_MODAL' });
  };

  const handleEditTemplate = (template: ScheduleTemplate) => {
    dispatch({ type: 'TOGGLE_SCHEDULE_TEMPLATE_MODAL', payload: template });
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Haluatko varmasti poistaa tämän tuntiryhmän? Tämä poistaa myös kaikki siihen liittyvät tulevat oppitunnit.')) {
      dispatch({ type: 'DELETE_SCHEDULE_TEMPLATE', payload: templateId });
    }
  };

  const getTemplatePosition = (template: ScheduleTemplate) => {
    const [startHour, startMinute] = template.startTime.split(':').map(Number);
    const [endHour, endMinute] = template.endTime.split(':').map(Number);
    
    // Kellonaika alkaa klo 6:00, joten vähennetään se laskuista
    const startPosition = ((startHour - 6) * 60) + startMinute;
    const duration = ((endHour - startHour) * 60) + (endMinute - startMinute);
    const hourRowHeight = 48; // 48px per tunti
    
    return {
      top: (startPosition / 60) * hourRowHeight,
      height: Math.max((duration / 60) * hourRowHeight, 24)
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Kiertotuntikaavio</h3>
          <p className="text-sm text-gray-600 mt-1">
            Määritä toistuvat oppitunnit viikon aikana
          </p>
        </div>
        <button
          onClick={handleAddTemplate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Lisää tuntiryhmään
        </button>
      </div>

      {/* Main Schedule Area */}
      <div className="flex-1 overflow-auto">
        <div className="relative">
          {/* Grid Container for Header and Content */}
          <div className="grid" style={{ gridTemplateColumns: '60px repeat(5, 1fr)' }}>
            {/* Top-left empty cell */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200"></div>

            {/* Weekday Headers */}
            {weekDays.map((day) => (
              <div key={day} className="sticky top-0 z-20 bg-white p-4 text-center font-medium text-gray-900 border-b border-l border-gray-200">
                {day}
              </div>
            ))}
            
            {/* Time Labels Column */}
            <div className="col-start-1 row-start-2">
              {timeSlots.map((time) => (
                <div key={time} className="h-12 pr-2 text-right text-xs text-gray-500 border-t border-gray-100 flex items-start pt-1">
                  {time}
                </div>
              ))}
            </div>

            {/* Grid Content Area (for lines and events) */}
            <div className="col-start-2 col-span-5 row-start-2 grid grid-cols-5">
              {/* Map through days to create columns */}
              {weekDays.map((_, dayIndex) => (
                <div key={dayIndex} className="relative border-l border-gray-200">
                  {/* Background time slots for this column */}
                  {timeSlots.map((time) => (
                    <div key={time} className="h-12 border-b border-gray-100" />
                  ))}
                  
                  {/* Templates for this day, positioned absolutely within this column */}
                  {scheduleTemplates
                    .filter(t => t.dayOfWeek === dayIndex)
                    .map((template) => {
                      const position = getTemplatePosition(template);
                      return (
                        <div
                          key={template.id}
                          onClick={() => handleEditTemplate(template)}
                          className="absolute left-1 right-1 rounded-lg p-2 cursor-pointer hover:opacity-80 transition-opacity group z-10"
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                            backgroundColor: template.color + '20',
                            borderLeft: `4px solid ${template.color}`,
                            minHeight: '24px',
                          }}
                        >
                          <div className="flex items-start justify-between h-full">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">
                                {template.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {template.startTime} - {template.endTime}
                              </div>
                              {template.description && (
                                <div className="text-xs text-gray-500 mt-1 truncate">
                                  {template.description}
                                </div>
                              )}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Estää muokkausikkunan avautumisen
                                  handleDeleteTemplate(template.id);
                                }}
                                className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state (if no templates exist) */}
        {scheduleTemplates.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ei tuntiryhmäksi määriteltyjä tunteja</h3>
            <p className="text-gray-600 mb-4">Luo ensimmäinen tuntiryhmä aloittaaksesi</p>
                  </div>
         )}
      </div>
    </div>
  );
}
