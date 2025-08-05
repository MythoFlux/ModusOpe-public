// src/reducers/eventReducer.ts
import { AppAction, AppState } from '../contexts/AppContext';

export function eventReducerLogic(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'DELETE_PROJECT_SUCCESS': {
      const projectId = action.payload;
      // Poistetaan kaikki projektiin liittyvät tapahtumat (myös oppitunnit)
      return {
          ...state,
          events: state.events.filter(event => event.project_id !== projectId)
      };
    }

    case 'ADD_EVENT_SUCCESS': {
      // Jos lisätään useita tapahtumia kerralla (kuten kurssin oppitunnit)
      if (Array.isArray(action.payload)) {
        return { ...state, events: [...state.events, ...action.payload] };
      }
      // Yksittäisen tapahtuman lisäys
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
        events: state.events.filter(event => event.schedule_template_id !== templateId)
      };
    }

    default:
      return state;
  }
}
