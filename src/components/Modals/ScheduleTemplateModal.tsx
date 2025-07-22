// src/components/Modals/ScheduleTemplateModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Clock, Type, FileText, Palette, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../../contexts/AppContext';
import { ScheduleTemplate } from '../../types';
import { useConfirmation } from '../../hooks/useConfirmation';

export default function ScheduleTemplateModal() {
  // --- LISÄTTY: session-tieto haetaan kontekstista ---
  const { state, dispatch } = useApp();
  const { showScheduleTemplateModal, selectedScheduleTemplate, session } = state;
  const { getConfirmation } = useConfirmation();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dayOfWeek: 0,
    startTime: '08:10',
    endTime: '09:25',
    color: '#3B82F6'
  });

  const weekDays = [
    { value: 0, label: 'Maanantai' },
    { value: 1, label: 'Tiistai' },
    { value: 2, label: 'Keskiviikko' },
    { value: 3, label: 'Torstai' },
    { value: 4, label: 'Perjantai' }
  ];

  const colorOptions = [
    { name: 'Sininen', value: '#3B82F6' },
    { name: 'Violetti', value: '#8B5CF6' },
    { name: 'Vihreä', value: '#10B981' },
    { name: 'Keltainen', value: '#F59E0B' },
    { name: 'Punainen', value: '#EF4444' },
    { name: 'Pinkki', value: '#EC4899' },
    { name: 'Turkoosi', value: '#06B6D4' },
    { name: 'Oranssi', value: '#F97316' },
    { name: 'Harmaa', value: '#6B7280' },
    { name: 'Indigo', value: '#6366F1' },
    { name: 'Lime', value: '#84CC16' },
    { name: 'Ruskea', value: '#A3A3A3' }
  ];

  useEffect(() => {
    if (selectedScheduleTemplate) {
      setFormData({
        name: selectedScheduleTemplate.name,
        description: selectedScheduleTemplate.description || '',
        dayOfWeek: selectedScheduleTemplate.dayOfWeek,
        startTime: selectedScheduleTemplate.startTime,
        endTime: selectedScheduleTemplate.endTime,
        color: selectedScheduleTemplate.color
      });
    } else {
      setFormData({
        name: '',
        description: '',
        dayOfWeek: 0,
        startTime: '08:10',
        endTime: '09:25',
        color: '#3B82F6'
      });
    }
  }, [selectedScheduleTemplate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- LISÄTTY: Varmistus, että käyttäjä on kirjautunut ---
    if (!session?.user && !selectedScheduleTemplate) {
        alert("Sinun täytyy olla kirjautunut luodaksesi tuntiryhmän.");
        return;
    }

    const templateData: any = { // <-- MUUTETTU: any, jotta user_id voidaan lisätä
      id: selectedScheduleTemplate?.id || uuidv4(),
      name: formData.name,
      description: formData.description,
      dayOfWeek: formData.dayOfWeek,
      startTime: formData.startTime,
      endTime: formData.endTime,
      color: formData.color
    };

    // --- LISÄTTY: Käyttäjän ID:n lisääminen, jos luodaan uusi ---
    if (!selectedScheduleTemplate) {
        templateData.user_id = session.user.id;
    }

    if (selectedScheduleTemplate) {
      dispatch({ type: 'UPDATE_SCHEDULE_TEMPLATE', payload: templateData });
    } else {
      dispatch({ type: 'ADD_SCHEDULE_TEMPLATE', payload: templateData });
    }

    dispatch({ type: 'CLOSE_MODALS' });
  };

  const handleDelete = async () => {
    if (selectedScheduleTemplate) {
        const confirmed = await getConfirmation({
            title: 'Poista tuntiryhmä?',
            message: `Haluatko varmasti poistaa tämän tuntiryhmän? Tämä poistaa myös kaikki siihen liittyvät tulevat oppitunnit kalenterista.`
        });
        if (confirmed) {
            dispatch({ type: 'DELETE_SCHEDULE_TEMPLATE', payload: selectedScheduleTemplate.id });
            dispatch({ type: 'CLOSE_MODALS' });
        }
    }
  };

  if (!showScheduleTemplateModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedScheduleTemplate ? 'Muokkaa tuntiryhmää' : 'Luo tuntiryhmä'}
          </h2>
          <button
            onClick={() => dispatch({ type: 'CLOSE_MODALS' })}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Type className="w-4 h-4 inline mr-2" />
              Nimi
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tuntiryhmän numero tai nimi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Kuvaus
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              placeholder="Lisätietoja tuntiryhmästä"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Viikonpäivä
            </label>
            <select
              value={formData.dayOfWeek}
              onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {weekDays.map(day => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Alkuaika
              </label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loppuaika
              </label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Palette className="w-4 h-4 inline mr-2" />
              Väri
            </label>
            <div className="grid grid-cols-6 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    formData.color === color.value 
                      ? 'border-gray-800 ring-2 ring-gray-300' 
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <div>
              {selectedScheduleTemplate && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Poista
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => dispatch({ type: 'CLOSE_MODALS' })}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Peruuta
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {selectedScheduleTemplate ? 'Päivitä' : 'Luo'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
