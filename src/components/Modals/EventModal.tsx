// src/components/Modals/EventModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Type, FileText, File } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../../contexts/AppContext';
import { Event, FileAttachment } from '../../types';
import AttachmentSection from '../Shared/AttachmentSection';
import { DEFAULT_COLOR } from '../../constants/colors';
import FormInput from '../Forms/FormInput';
import FormTextarea from '../Forms/FormTextarea';
import FormSelect from '../Forms/FormSelect';
import ColorSelector from '../Forms/ColorSelector';

export default function EventModal() {
  const { state, dispatch } = useApp();
  const { showEventModal, selectedEvent, projects, events, session } = state;

  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    start_time: '',
    end_time: '',
    type: 'class' as Event['type'],
    project_id: '',
    color: DEFAULT_COLOR
  });

  const [files, setFiles] = useState<FileAttachment[]>([]);
  
  const [bulkEditOptions, setBulkEditOptions] = useState({
    applyToAll: false,
    startDate: '',
    endDate: ''
  });

  const isRecurringEvent = selectedEvent?.scheduleTemplateId && selectedEvent.id.startsWith('recurring-');
  
  const similarEvents = React.useMemo(() => {
    if (!selectedEvent || !isRecurringEvent || !selectedEvent.groupName) return [];
    
    return events.filter(event => 
      event.id !== selectedEvent.id &&
      event.title === selectedEvent.title &&
      event.groupName === selectedEvent.groupName &&
      event.id.startsWith('recurring-')
    );
  }, [selectedEvent, events, isRecurringEvent]);

  useEffect(() => {
    if (selectedEvent) {
      const eventDate = new Date(selectedEvent.date);
      setFormData({
        title: selectedEvent.title,
        description: selectedEvent.description || '',
        date: eventDate.toISOString().split('T')[0],
        start_time: selectedEvent.startTime || '',
        end_time: selectedEvent.endTime || '',
        type: selectedEvent.type,
        project_id: selectedEvent.projectId || '',
        color: selectedEvent.color
      });
      setFiles(selectedEvent.files || []);
      if (isRecurringEvent && similarEvents.length > 0) {
        const allDates = [selectedEvent, ...similarEvents].map(e => new Date(e.date));
        const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
        setBulkEditOptions({
          applyToAll: false,
          startDate: minDate.toISOString().split('T')[0],
          endDate: maxDate.toISOString().split('T')[0]
        });
      }
    } else {
      setFormData({
        title: '',
        description: '',
        date: state.selectedDate.toISOString().split('T')[0],
        start_time: '',
        end_time: '',
        type: 'class',
        project_id: '',
        color: DEFAULT_COLOR
      });
      setFiles([]);
      setBulkEditOptions({ applyToAll: false, startDate: '', endDate: '' });
    }
    setActiveTab('details');
  }, [selectedEvent, state.selectedDate, isRecurringEvent, similarEvents]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user && !selectedEvent) {
        alert("Sinun täytyy olla kirjautunut luodaksesi tapahtuman.");
        return;
    }

    const eventDate = new Date(formData.date);
    if (formData.start_time) {
      const [hours, minutes] = formData.start_time.split(':');
      eventDate.setHours(parseInt(hours), parseInt(minutes));
    }

    const eventData: any = {
      id: selectedEvent?.id || uuidv4(),
      title: formData.title,
      description: formData.description,
      date: eventDate,
      startTime: formData.start_time,
      endTime: formData.end_time,
      type: formData.type,
      color: formData.color,
      projectId: formData.project_id || undefined,
      scheduleTemplateId: selectedEvent?.scheduleTemplateId,
      groupName: selectedEvent?.groupName,
      files: files
    };
    
    if (!selectedEvent) {
        eventData.user_id = session.user.id;
    }

    if (selectedEvent) {
      dispatch({ type: 'UPDATE_EVENT', payload: eventData });

      if (bulkEditOptions.applyToAll && isRecurringEvent && similarEvents.length > 0) {
        const startDate = new Date(bulkEditOptions.startDate);
        const endDate = new Date(bulkEditOptions.endDate);

        similarEvents.forEach(event => {
          const eventDate = new Date(event.date);
          if (eventDate >= startDate && eventDate <= endDate) {
            const updatedEvent: Event = {
              ...event,
              title: formData.title,
              description: formData.description,
              type: formData.type,
              color: formData.color,
              projectId: formData.project_id || undefined,
              files: files
            };
            dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
          }
        });
      }
    } else {
      dispatch({ type: 'ADD_EVENT', payload: eventData });
    }

    dispatch({ type: 'CLOSE_MODALS' });
  };

  const handleDelete = () => {
    if (selectedEvent) {
      dispatch({ type: 'DELETE_EVENT', payload: selectedEvent.id });

      if (bulkEditOptions.applyToAll && isRecurringEvent && similarEvents.length > 0) {
        const startDate = new Date(bulkEditOptions.startDate);
        const endDate = new Date(bulkEditOptions.endDate);

        similarEvents.forEach(event => {
          const eventDate = new Date(event.date);
          if (eventDate >= startDate && eventDate <= endDate) {
            dispatch({ type: 'DELETE_EVENT', payload: event.id });
          }
        });
      }
      dispatch({ type: 'CLOSE_MODALS' });
    }
  };

  const getEventsInDateRange = () => {
    if (!bulkEditOptions.startDate || !bulkEditOptions.endDate || !isRecurringEvent) return 0;
    const startDate = new Date(bulkEditOptions.startDate);
    const endDate = new Date(bulkEditOptions.endDate);
    return similarEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startDate && eventDate <= endDate;
    }).length + 1;
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <FormInput
                id="event-title"
                label="Otsikko"
                icon={<Type className="w-4 h-4 inline mr-2" />}
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Tapahtuman otsikko"
              />
              <FormTextarea
                id="event-description"
                label="Kuvaus"
                icon={<FileText className="w-4 h-4 inline mr-2" />}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Tapahtuman kuvaus"
              />
              <FormInput
                id="event-date"
                label="Päivämäärä"
                icon={<Calendar className="w-4 h-4 inline mr-2" />}
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  id="start-time"
                  label="Alkuaika"
                  icon={<Clock className="w-4 h-4 inline mr-2" />}
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
                <FormInput
                  id="end-time"
                  label="Loppuaika"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
              <FormSelect
                id="event-type"
                label="Tyyppi"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Event['type'] })}
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
              >
                <option value="">Ei projektia</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </FormSelect>
              {isRecurringEvent && similarEvents.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  {/* Bulk edit content would go here */}
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
           {/* Button content would go here */}
        </div>
      </div>
    </div>
  );
}
