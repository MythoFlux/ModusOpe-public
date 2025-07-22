// src/components/Modals/EventModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Type, FileText, Palette, Users, CalendarRange, File } from 'lucide-react';
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
  // --- LISÄTTY: session-tieto haetaan kontekstista ---
  const { showEventModal, selectedEvent, projects, events, session } = state;

  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'class' as Event['type'],
    projectId: '',
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
        startTime: selectedEvent.startTime || '',
        endTime: selectedEvent.endTime || '',
        type: selectedEvent.type,
        projectId: selectedEvent.projectId || '',
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
        startTime: '',
        endTime: '',
        type: 'class',
        projectId: '',
        color: DEFAULT_COLOR
      });
      setFiles([]);
      setBulkEditOptions({ applyToAll: false, startDate: '', endDate: '' });
    }
    setActiveTab('details');
  }, [selectedEvent, state.selectedDate, isRecurringEvent, similarEvents]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // --- LISÄTTY: Varmistus, että käyttäjä on kirjautunut ---
    if (!session?.user && !selectedEvent) {
        alert("Sinun täytyy olla kirjautunut luodaksesi tapahtuman.");
        return;
    }

    const eventDate = new Date(formData.date);
    if (formData.startTime) {
      const [hours, minutes] = formData.startTime.split(':');
      eventDate.setHours(parseInt(hours), parseInt(minutes));
    }

    const eventData: any = {
      id: selectedEvent?.id || uuidv4(),
      title: formData.title,
      description: formData.description,
      date: eventDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      type: formData.type,
      color: formData.color,
      projectId: formData.projectId || undefined,
      scheduleTemplateId: selectedEvent?.scheduleTemplateId,
      groupName: selectedEvent?.groupName,
      files: files
    };
    
    // --- LISÄTTY: Käyttäjän ID:n lisääminen uuteen tapahtumaan ---
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
              projectId: formData.projectId || undefined,
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

  if (!showEventModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* ... loput JSX-koodista pysyy samana ... */}
      </div>
    </div>
  );
}
