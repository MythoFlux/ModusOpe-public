import { AppAction, AppState } from '../contexts/AppContext';
import { generateRecurringEvents } from '../utils/eventUtils';

export function eventReducerLogic(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    
    case 'UPDATE_EVENT':
      return { ...state, events: state.events.map(event => event.id === action.payload.id ? action.payload : event) };
    
    case 'DELETE_EVENT':
      return { ...state, events: state.events.filter(event => event.id !== action.payload) };

    case 'ADD_SCHEDULE_TEMPLATE':
      return { ...state, scheduleTemplates: [...state.scheduleTemplates, action.payload] };

    case 'UPDATE_SCHEDULE_TEMPLATE': {
      const newTemplates = state.scheduleTemplates.map(template =>
        template.id === action.payload.id ? action.payload : template
      );
      // Huom: Tämä ei vielä päivitä olemassa olevia tapahtumia. Se vaatisi laajempaa logiikkaa.
      return { ...state, scheduleTemplates: newTemplates };
    }

    case 'DELETE_SCHEDULE_TEMPLATE': {
      return {
        ...state,
        scheduleTemplates: state.scheduleTemplates.filter(template => template.id !== action.payload),
        recurringClasses: state.recurringClasses.filter(rc => rc.scheduleTemplateId !== action.payload),
        events: state.events.filter(event => event.scheduleTemplateId !== action.payload)
      };
    }

    case 'ADD_RECURRING_CLASS': {
      const template = state.scheduleTemplates.find(t => t.id === action.payload.scheduleTemplateId);
      if (!template) return state;
      const newEvents = generateRecurringEvents(action.payload, template);
      return { ...state, recurringClasses: [...state.recurringClasses, action.payload], events: [...state.events, ...newEvents] };
    }

    case 'UPDATE_RECURRING_CLASS': {
      const template = state.scheduleTemplates.find(t => t.id === action.payload.scheduleTemplateId);
      if (!template) return state;
      
      const updatedRecurringClasses = state.recurringClasses.map(rc => 
        rc.id === action.payload.id ? action.payload : rc
      );

      const eventsWithoutOldRecurring = state.events.filter(
        event => !(event.scheduleTemplateId && event.id.startsWith(`recurring-${action.payload.id}-`))
      );
      const newEvents = generateRecurringEvents(action.payload, template);
      
      return { 
        ...state, 
        recurringClasses: updatedRecurringClasses, 
        events: [...eventsWithoutOldRecurring, ...newEvents] 
      };
    }

    case 'DELETE_RECURRING_CLASS': {
      return { 
        ...state, 
        recurringClasses: state.recurringClasses.filter(rc => rc.id !== action.payload), 
        events: state.events.filter(event => !event.id.startsWith(`recurring-${action.payload}-`)) 
      };
    }

    default:
      return state;
  }
}
