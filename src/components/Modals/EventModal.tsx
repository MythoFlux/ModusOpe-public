// src/components/Modals/EventModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Type, FileText, File, Loader2, AlertTriangle, Info } from 'lucide-react';
import { useApp, useAppServices } from '../../contexts/AppContext';
import { useConfirmation } from '../../hooks/useConfirmation';
import { Event, FileAttachment } from '../../types';
import AttachmentSection from '../Shared/AttachmentSection';
import { DEFAULT_COLOR } from '../../constants/colors';
import FormInput from '../Forms/FormInput';
import FormTextarea from '../Forms/FormTextarea';
import FormSelect from '../Forms/FormSelect';
import ColorSelector from '../Forms/ColorSelector';

export default function EventModal() {
  const { state, dispatch } = useApp();
  const services = useAppServices();
  const { showEventModal, selectedEvent, projects, session } = state;
  const { getConfirmation } = useConfirmation();
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    more_info: '',
    date: '',
    start_time: '',
    end_time: '',
    type: 'class' as Event['type'],
    project_id: '',
    color: DEFAULT_COLOR
  });
  
  const [updateAllInCourse, setUpdateAllInCourse] = useState(false);
  const [files, setFiles] = useState<FileAttachment[]>([]);

  const isDeadlineEvent = selectedEvent?.id.startsWith('project-deadline-') || selectedEvent?.id.startsWith('task-deadline-');

  useEffect(() => {
    if (selectedEvent) {
      const eventDate = new Date(selectedEvent.date);
      setFormData({
        title: selectedEvent.title,
        description: selectedEvent.description || '',
        more_info: selectedEvent.more_info || '',
        date: eventDate.toISOString().split('T')[0],
        start_time: selectedEvent.start_time || '',
        end_time: selectedEvent.end_time || '',
        type: selectedEvent.type,
        project_id: selectedEvent.project_id || '',
        color: selectedEvent.color
      });
      setFiles(selectedEvent.files || []);
    } else {
      setFormData({
        title: '',
        description: '',
        more_info: '',
        date: state.selectedDate.toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        type: 'class',
        project_id: '',
        color: DEFAULT_COLOR
      });
      setFiles([]);
    }
    setUpdateAllInCourse(false); // Resetoi valintaruutu aina modaalin avautuessa
    setActiveTab('details');
  }, [selectedEvent, state.selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDeadlineEvent) {
      alert("Määräaikoja ei voi muokata suoraan kalenterista. Muokkaa sen sijaan projektia tai tehtävää.");
      return;
    }

    if (!session?.user && !selectedEvent) {
        alert("Sinun täytyy olla kirjautunut luodaksesi tapahtuman.");
        return;
    }
    setIsLoading(true);

    const eventDate = new Date(formData.date);
    if (formData.start_time) {
      const [hours, minutes] = formData.start_time.split(':');
      eventDate.setHours(parseInt(hours), parseInt(minutes));
    }

    const eventData: Event = {
      id: selectedEvent?.id || '',
      title: formData.title,
      description: formData.description,
      more_info: formData.more_info,
      date: eventDate,
      start_time: formData.start_time || undefined,
      end_time: formData.end_time || undefined,
      type: formData.type,
      color: formData.color,
      project_id: formData.project_id || null,
      files: files
    };
    
    try {
        if (selectedEvent) {
            await services.updateEvent(eventData, updateAllInCourse);
        } else {
            const { id, ...newEventData } = eventData;
            await services.addEvent(newEventData);
        }
        dispatch({ type: 'CLOSE_MODALS' });
    } catch (error: any) {
        alert(`Tallennus epäonnistui: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    
    let message = `Haluatko varmasti poistaa tapahtuman "${selectedEvent.title}"? Toimintoa ei voi perua.`;
    let title = 'Vahvista poisto';

    if (selectedEvent.id.startsWith('task-deadline-')) {
        const taskTitle = selectedEvent.title.replace('Tehtävä: ', '');
        message = `Haluatko varmasti poistaa tehtävän "${taskTitle}"? Tämä poistaa tehtävän pysyvästi.`;
        title = 'Vahvista tehtävän poisto';
    } else if (selectedEvent.id.startsWith('project-deadline-')) {
        alert("Projektin määräaikaa ei voi poistaa kalenterista. Poista projekti tai sen päättymispäivä projektinäkymästä.");
        return;
    }

    const confirmed = await getConfirmation({ title, message });

    if (confirmed) {
      setIsLoading(true);
      try {
          if (selectedEvent.id.startsWith('task-deadline-') && selectedEvent.project_id) {
              const taskId = selectedEvent.id.replace('task-deadline-', '');
              await services.deleteTask(selectedEvent.project_id, taskId);
          } else {
              await services.deleteEvent(selectedEvent.id);
          }
          dispatch({ type: 'CLOSE_MODALS' });
      } catch (error: any) {
          alert(`Poisto epäonnistui: ${error.message}`);
      } finally {
          setIsLoading(false);
      }
    }
  };

  if (!showEventModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedEvent ? 'Muokkaa tapahtumaa' : 'Luo tapahtuma'}
          </h2>
          <button onClick={() => dispatch({ type: 'CLOSE_MODALS' })} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button onClick={() => setActiveTab('details')} className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
            <Type className="w-4 h-4 inline mr-2" />
            Perustiedot
          </button>
          <button onClick={() => setActiveTab('files')} className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'files' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
            <File className="w-4 h-4 inline mr-2" />
            Tiedostot ({files.length})
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' ? (
            <form id="event-details-form" onSubmit={handleSubmit} className="p-6 space-y-4">
              <FormInput
                id="event-title"
                label="Otsikko"
                icon={<Type className="w-4 h-4 inline mr-2" />}
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Tapahtuman otsikko"
                disabled={isDeadlineEvent}
              />
              <FormTextarea
                id="event-description"
                label="Kuvaus"
                icon={<FileText className="w-4 h-4 inline mr-2" />}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Tapahtuman kuvaus"
                disabled={isDeadlineEvent}
              />
               <FormTextarea
                id="event-more-info"
                label="Lisätietoa (esim. linkit)"
                icon={<Info className="w-4 h-4 inline mr-2" />}
                value={formData.more_info}
                onChange={(e) => setFormData({ ...formData, more_info: e.target.value })}
                rows={2}
                placeholder="Lisää linkkejä tai muuta tärkeää tietoa"
                disabled={isDeadlineEvent}
              />
              <FormInput
                id="event-date"
                label="Päivämäärä"
                icon={<Calendar className="w-4 h-4 inline mr-2" />}
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                disabled={isDeadlineEvent || updateAllInCourse}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  id="start_time"
                  label="Alkuaika"
                  icon={<Clock className="w-4 h-4 inline mr-2" />}
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  disabled={isDeadlineEvent || updateAllInCourse}
                />
                <FormInput
                  id="end_time"
                  label="Loppuaika"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  disabled={isDeadlineEvent || updateAllInCourse}
                />
              </div>
              <FormSelect
                id="event-type"
                label="Tyyppi"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Event['type'] })}
                disabled={isDeadlineEvent}
              >
                <option value="class">Tunti</option>
                <option value="meeting">Kokous</option>
                <option value="deadline">Määräaika</option>
                <option value="assignment">Tehtävä</option>
                <option value="personal">Henkilökohtainen</option>
              </FormSelect>
              <ColorSelector 
                label="Väri"
                selectedColor={formData.color}
                onChange={(color) => setFormData({ ...formData, color })}
              />
              <FormSelect
                id="event-project"
                label="Projekti (valinnainen)"
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                disabled={isDeadlineEvent}
              >
                <option value="">Ei projektia</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </FormSelect>
              
              {selectedEvent?.type === 'class' && selectedEvent.project_id && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-800">
                        Laaja muokkaus
                      </p>
                      <div className="mt-2 text-sm text-yellow-700">
                        <label className="flex items-center space-x-2">
                           <input
                            type="checkbox"
                            checked={updateAllInCourse}
                            onChange={() => setUpdateAllInCourse(!updateAllInCourse)}
                            className="h-4 w-4 rounded text-yellow-600 focus:ring-yellow-500 border-gray-300"
                           />
                           <span>Päivitä kaikki tämän kurssin oppitunnit</span>
                        </label>
                        <p className="text-xs mt-1">
                          Huom: Päivämäärä ja kellonajat eivät muutu muissa tapahtumissa.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          ) : (
            <AttachmentSection 
              files={files}
              onFilesChange={setFiles}
              fileInputId="file-upload-event"
            />
          )}
        </div>
        <div className="flex justify-between p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
            {selectedEvent && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Poista
              </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={() => dispatch({ type: 'CLOSE_MODALS' })}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Peruuta
              </button>
              <button
                type="submit"
                form="event-details-form"
                disabled={isLoading || isDeadlineEvent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedEvent ? 'Päivitä' : 'Luo'}
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}
