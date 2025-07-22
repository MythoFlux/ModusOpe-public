// src/components/Modals/ScheduleTemplateModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Clock, Type, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../../contexts/AppContext';
import { ScheduleTemplate } from '../../types';
import { DEFAULT_COLOR } from '../../constants/colors';
import FormInput from '../Forms/FormInput';
import FormTextarea from '../Forms/FormTextarea';
import FormSelect from '../Forms/FormSelect';
import ColorSelector from '../Forms/ColorSelector';

export default function ScheduleTemplateModal() {
  const { state, dispatch } = useApp();
  const { showScheduleTemplateModal, selectedScheduleTemplate, session } = state;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dayOfWeek: 0,
    startTime: '08:00',
    endTime: '09:00',
    color: DEFAULT_COLOR,
  });

  useEffect(() => {
    if (selectedScheduleTemplate) {
      setFormData({
        name: selectedScheduleTemplate.name,
        description: selectedScheduleTemplate.description || '',
        dayOfWeek: selectedScheduleTemplate.dayOfWeek,
        startTime: selectedScheduleTemplate.startTime,
        endTime: selectedScheduleTemplate.endTime,
        color: selectedScheduleTemplate.color,
      });
    } else {
      // Nollaa oletusarvoihin uutta pohjaa varten
      setFormData({
        name: '',
        description: '',
        dayOfWeek: 0,
        startTime: '08:00',
        endTime: '09:00',
        color: DEFAULT_COLOR,
      });
    }
  }, [selectedScheduleTemplate, showScheduleTemplateModal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user && !selectedScheduleTemplate) {
      alert("Sinun täytyy olla kirjautunut luodaksesi tuntipohjan.");
      return;
    }

    const templateData: ScheduleTemplate = {
      id: selectedScheduleTemplate?.id || uuidv4(),
      name: formData.name,
      description: formData.description,
      dayOfWeek: Number(formData.dayOfWeek),
      startTime: formData.startTime,
      endTime: formData.endTime,
      color: formData.color,
    };

    if (selectedScheduleTemplate) {
      dispatch({ type: 'UPDATE_SCHEDULE_TEMPLATE', payload: templateData });
    } else {
      dispatch({ type: 'ADD_SCHEDULE_TEMPLATE', payload: templateData });
    }

    dispatch({ type: 'CLOSE_MODALS' });
  };

  if (!showScheduleTemplateModal) return null;

  const weekDays = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedScheduleTemplate ? 'Muokkaa tuntipohjaa' : 'Luo uusi tuntipohja'}
          </h2>
          <button
            onClick={() => dispatch({ type: 'CLOSE_MODALS' })}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <FormInput
            id="template-name"
            label="Tuntiryhmän nimi"
            icon={<Type className="w-4 h-4 inline mr-2" />}
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="esim. Matematiikka 9A"
          />
          
          <FormTextarea
            id="template-description"
            label="Kuvaus (valinnainen)"
            icon={<FileText className="w-4 h-4 inline mr-2" />}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            placeholder="Tarkempi kuvaus tai muistiinpano"
          />

          <FormSelect
            id="template-day"
            label="Viikonpäivä"
            icon={<Clock className="w-4 h-4 inline mr-2" />}
            required
            value={formData.dayOfWeek}
            onChange={(e) => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
          >
            {weekDays.map((day, index) => (
              <option key={index} value={index}>
                {day}
              </option>
            ))}
          </FormSelect>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              id="template-start-time"
              label="Alkuaika"
              icon={<Clock className="w-4 h-4 inline mr-2" />}
              type="time"
              required
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
            <FormInput
              id="template-end-time"
              label="Loppuaika"
              type="time"
              required
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </div>

          <ColorSelector
            label="Väri"
            selectedColor={formData.color}
            onChange={(color) => setFormData({ ...formData, color })}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
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
        </form>
      </div>
    </div>
  );
}
