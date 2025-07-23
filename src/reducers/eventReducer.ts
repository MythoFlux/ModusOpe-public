// src/reducers/eventReducer.ts
import { AppAction, AppState } from '../contexts/AppContext';
import { generateRecurringEvents } from '../utils/eventUtils';
import { supabase } from '../supabaseClient';
import { createProjectWithTemplates } from '../utils/projectUtils';

export function eventReducerLogic(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // --- MUUTOS: KOKO 'ADD_PROJECT' CASE ON POISTETTU TÄÄLTÄ ---

    case 'DELETE_PROJECT': {
      const projectId = action.payload;
      const projectToDelete = state.projects.find(p => p.id === projectId);

      if (projectToDelete && projectToDelete.type === 'course') {
        const deleteRecurringClassesAsync = async () => {
            const { error } = await supabase
                .from('recurring_classes')
                .delete()
                .match({ project_id: projectId });
            if (error) console.error("Error deleting recurring classes:", error);
        };
        deleteRecurringClassesAsync();

        return {
          ...state,
          recurringClasses: state.recurringClasses.filter(rc => rc.projectId !== projectId),
          events: state.events.filter(event => event.projectId !== projectId)
        }
      }

      return {
          ...state,
          events: state.events.filter(event => event.projectId !== projectId)
      };
    }

    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    
    case 'UPDATE_EVENT':
      return { ...state, events: state.events.map(event => event.id === action.payload.id ? action.payload : event) };
    
    case 'DELETE_EVENT':
      return { ...state, events: state.events.filter(event => event.id !== action.payload) };

    case 'ADD_SCHEDULE_TEMPLATE': {
      const newTemplate = { ...action.payload, user_id: state.session?.user.id };

      const addTemplateAsync = async () => {
        const { error } = await supabase.from('schedule_templates').insert([newTemplate]);
        if (error) console.error("Error adding schedule template:", error);
      };
      addTemplateAsync();

      return { ...state, scheduleTemplates: [...state.scheduleTemplates, action.payload] };
    }

    case 'UPDATE_SCHEDULE_TEMPLATE': {
      const updatedTemplate = action.payload;

      const updateTemplateAsync = async () => {
        const { error } = await supabase.from('schedule_templates').update(updatedTemplate).match({ id: updatedTemplate.id });
        if (error) console.error("Error updating schedule template:", error);
      };
      updateTemplateAsync();

      const newTemplates = state.scheduleTemplates.map(template =>
        template.id === updatedTemplate.id ? updatedTemplate : template
      );
      
      return { ...state, scheduleTemplates: newTemplates };
    }

    case 'DELETE_SCHEDULE_TEMPLATE': {
      const templateId = action.payload;

      const deleteTemplateAsync = async () => {
        const { error } = await supabase.from('schedule_templates').delete().match({ id: templateId });
        if (error) console.error("Error deleting schedule template:", error);
      };
      deleteTemplateAsync();
      
      return {
        ...state,
        scheduleTemplates: state.scheduleTemplates.filter(template => template.id !== templateId),
        recurringClasses: state.recurringClasses.filter(rc => rc.scheduleTemplateId !== templateId),
        events: state.events.filter(event => event.scheduleTemplateId !== templateId)
      };
    }

    case 'ADD_RECURRING_CLASS': {
       const newClass = { ...action.payload, user_id: state.session?.user.id };

      const addClassAsync = async () => {
        const { error } = await supabase.from('recurring_classes').insert([newClass]);
        if (error) console.error("Error adding recurring class:", error);
      };
      addClassAsync();

      const template = state.scheduleTemplates.find(t => t.id === newClass.scheduleTemplateId);
      if (!template) return state;
      const newEvents = generateRecurringEvents(newClass, template);
      return { ...state, recurringClasses: [...state.recurringClasses, newClass], events: [...state.events, ...newEvents] };
    }

    case 'UPDATE_RECURRING_CLASS': {
      const updatedClass = action.payload;
      
      const updateClassAsync = async () => {
          const { error } = await supabase.from('recurring_classes').update(updatedClass).match({ id: updatedClass.id });
          if (error) console.error("Error updating recurring class:", error);
      };
      updateClassAsync();

      const template = state.scheduleTemplates.find(t => t.id === updatedClass.scheduleTemplateId);
      if (!template) return state;
      
      const updatedRecurringClasses = state.recurringClasses.map(rc => 
        rc.id === updatedClass.id ? updatedClass : rc
      );

      const eventsWithoutOldRecurring = state.events.filter(
        event => !(event.scheduleTemplateId && event.id.startsWith(`recurring-${updatedClass.groupName}-${updatedClass.scheduleTemplateId}`))
      );
      const newEvents = generateRecurringEvents(updatedClass, template);
      
      return { 
        ...state, 
        recurringClasses: updatedRecurringClasses, 
        events: [...eventsWithoutOldRecurring, ...newEvents] 
      };
    }

    case 'DELETE_RECURRING_CLASS': {
      const classId = action.payload;
      const classToDelete = state.recurringClasses.find(rc => rc.id === classId);

      const deleteClassAsync = async () => {
          const { error } = await supabase.from('recurring_classes').delete().match({ id: classId });
          if (error) console.error("Error deleting recurring class:", error);
      };
      deleteClassAsync();

      if (!classToDelete) return state;

      return { 
        ...state, 
        recurringClasses: state.recurringClasses.filter(rc => rc.id !== classId), 
        events: state.events.filter(event => !(event.groupName === classToDelete.groupName && event.scheduleTemplateId === classToDelete.scheduleTemplateId))
      };
    }

    default:
      return state;
  }
}
