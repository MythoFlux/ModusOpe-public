// src/components/Modals/ScheduleTemplateModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Clock, Type, FileText, Loader2 } from 'lucide-react';
import { useApp, useAppServices } from '../../contexts/AppContext';
import { ScheduleTemplate } from '../../types';
import { DEFAULT_COLOR } from '../../constants/colors';
import FormInput from '../Forms/FormInput';
import FormTextarea from '../Forms/FormTextarea';
import FormSelect from '../Forms/FormSelect';
import ColorSelector from '../Forms/ColorSelector';

export default function ScheduleTemplateModal() {
  const { state, dispatch } = useApp();
  const services = useAppServices();
  const { showScheduleTemplateModal, selectedScheduleTemplate, session } = state;
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    day_of_week: 0,
    start_time: '08:00',
    end_time: '09:00',
    color: DEFAULT_COLOR,
  });

  useEffect(() => {
    if (selectedScheduleTemplate) {
      setFormData({
        name: selectedScheduleTemplate.name,
        description: selectedScheduleTemplate.description || '',
        day_of_week: selectedScheduleTemplate.day_of_week,
        start_time: selectedScheduleTemplate.start_time,
        end_time: selectedScheduleTemplate.end_time,
        color: selectedScheduleTemplate.color,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        day_of_week: 0,
        start_time: '08:00',
        end_time: '09:00',
        color: DEFAULT_COLOR,
      });
    }
  }, [selectedScheduleTemplate, showScheduleTemplateModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user && !selectedScheduleTemplate) {
      alert("Sinun täytyy olla kirjautunut luodaksesi tuntipohjan.");
      return;
    }
    setIsLoading(true);

    const templateData: any = { // Käytetään 'any' väliaikaisesti id:n poistoa varten
      id: selectedScheduleTemplate?.id || '',
      name: formData.name,
      description: formData.description,
      day_of_week: Number(formData.day_of_week),
      start_time: formData.start_time,
      end_time: formData.end_time,
      color: formData.color,
    };

    try {
        if (selectedScheduleTemplate) {
            await services.updateScheduleTemplate(templateData as ScheduleTemplate);
        } else {
            // MUUTETTU: Poistetaan 'id'-kenttä ennen uuden pohjan lisäämistä
            const { id, ...newTemplateData } = templateData;
            await services.addScheduleTemplate(newTemplateData);
        }
        dispatch({ type: 'CLOSE_MODALS' });
    } catch (error: any) {
        alert(`Tallennus epäonnistui: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
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
            value={formData.day_of_week}
            onChange={(e) => setFormData({ ...formData, day_of_week: Number(e.target.value) })}
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
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
            <FormInput
              id="template-end-time"
              label="Loppuaika"
              type="time"
              required
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
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
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedScheduleTemplate ? 'Päivitä' : 'Luo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
