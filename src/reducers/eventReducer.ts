// src/reducers/eventReducer.ts
import { AppAction, AppState } from '../contexts/AppContext';
import { generateRecurringEvents } from '../utils/eventUtils';

export function eventReducerLogic(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'DELETE_PROJECT_SUCCESS': {
      const projectId = action.payload;
      const projectToDelete = state.projects.find(p => p.id === projectId);

      if (projectToDelete?.type === 'course') {
        return {
          ...state,
          recurringClasses: state.recurringClasses.filter(rc => rc.project_id !== projectId),
          events: state.events.filter(event => event.project_id !== projectId)
        }
      }

      return {
          ...state,
          events: state.events.filter(event => event.project_id !== projectId)
      };
    }

    case 'ADD_EVENT_SUCCESS': {
      return { ...state, events: [...state.events, action.payload] };
    }
    
    case 'UPDATE_EVENT_SUCCESS': {
      return { 
        ...state, 
        events: state.events.map(event => event.id === action.payload.id ? action.payload : event) 
      };
    }
    
    case 'DELETE_EVENT_SUCCESS': {
      return { 
        ...state, 
        events: state.events.filter(event => event.id !== action.payload) 
      };
    }

    case 'ADD_SCHEDULE_TEMPLATE_SUCCESS': {
      return { ...state, scheduleTemplates: [...state.scheduleTemplates, action.payload] };
    }

    case 'UPDATE_SCHEDULE_TEMPLATE_SUCCESS': {
      const updatedTemplate = action.payload;
      const newTemplates = state.scheduleTemplates.map(template =>
        template.id === updatedTemplate.id ? updatedTemplate : template
      );
      return { ...state, scheduleTemplates: newTemplates };
    }

    case 'DELETE_SCHEDULE_TEMPLATE_SUCCESS': {
      const templateId = action.payload;
      return {
        ...state,
        scheduleTemplates: state.scheduleTemplates.filter(template => template.id !== templateId),
        recurringClasses: state.recurringClasses.filter(rc => rc.schedule_template_id !== templateId),
        events: state.events.filter(event => event.schedule_template_id !== templateId)
      };
    }

    case 'ADD_RECURRING_CLASS_SUCCESS': {
      const newClasses = action.payload;
      const newEvents = newClasses.flatMap(newClass => {
          const template = state.scheduleTemplates.find(t => t.id === newClass.schedule_template_id);
          return template ? generateRecurringEvents(newClass, template) : [];
      });
      return { 
          ...state, 
          recurringClasses: [...state.recurringClasses, ...newClasses], 
          events: [...state.events, ...newEvents] 
      };
    }
    
    // HUOM: UPDATE ja DELETE recurring class vaatisivat myös oman service-funktion,
    // mutta jätetään ne toistaiseksi ennalleen yksinkertaisuuden vuoksi.
    // Ne eivät kärsi ID-ristiriidasta.
    case 'UPDATE_RECURRING_CLASS': {
      const updatedClass = action.payload;
      const template = state.scheduleTemplates.find(t => t.id === updatedClass.schedule_template_id);
      if (!template) return state;
      
      const updatedRecurringClasses = state.recurringClasses.map(rc => 
        rc.id === updatedClass.id ? updatedClass : rc
      );

      const eventsWithoutOldRecurring = state.events.filter(
        event => !(event.schedule_template_id && event.id.startsWith(`recurring-${updatedClass.group_name}-${updatedClass.schedule_template_id}`))
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
      if (!classToDelete) return state;

      return { 
        ...state, 
        recurringClasses: state.recurringClasses.filter(rc => rc.id !== classId), 
        events: state.events.filter(event => !(event.group_name === classToDelete.group_name && event.schedule_template_id === classToDelete.schedule_template_id))
      };
    }

    default:
      return state;
  }
}
