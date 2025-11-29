// src/reducers/uiReducer.ts
import { AppAction, AppState, ConfirmationModalState } from '../contexts/AppContext';

const initialConfirmationState: ConfirmationModalState = {
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
};

export function uiReducerLogic(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    
    case 'TOGGLE_EVENT_MODAL':
      return { ...state, showEventModal: !state.showEventModal, selectedEvent: action.payload };
    
    case 'TOGGLE_EVENT_DETAILS_MODAL':
      return { ...state, showEventDetailsModal: !state.showEventDetailsModal, selectedEvent: action.payload };
    
    case 'OPEN_EVENT_EDIT_MODAL':
      return {
        ...state,
        showEventDetailsModal: false,
        showEventModal: true
        // selectedEvent säilyy tilassa edellisestä actionista
      };

    case 'TOGGLE_PROJECT_MODAL':
      return { ...state, showProjectModal: !state.showProjectModal, selectedProjectId: action.payload };

    case 'TOGGLE_COURSE_MODAL':
      return { ...state, showCourseModal: !state.showCourseModal, courseModalInfo: action.payload };
    
    case 'TOGGLE_SCHEDULE_TEMPLATE_MODAL':
      return { ...state, showScheduleTemplateModal: !state.showScheduleTemplateModal, selectedScheduleTemplate: action.payload };
    
    case 'TOGGLE_TASK_MODAL':
      return { ...state, showTaskModal: !state.showTaskModal, selectedTask: action.payload };

    // UUSI: Tehtävän katselumodaalin hallinta
    case 'TOGGLE_TASK_DETAILS_MODAL':
      return { 
        ...state, 
        showTaskDetailsModal: !state.showTaskDetailsModal, 
        selectedTask: action.payload 
      };

    // UUSI: Siirtyminen katselutilasta muokkaustilaan
    case 'OPEN_TASK_EDIT_MODAL':
      return {
        ...state,
        showTaskDetailsModal: false,
        showTaskModal: true
        // selectedTask säilyy tilassa
      };
      
    case 'CLOSE_MODALS':
      return {
        ...state,
        showEventModal: false,
        showEventDetailsModal: false,
        showProjectModal: false,
        showCourseModal: false,
        showScheduleTemplateModal: false,
        showTaskModal: false,
        showTaskDetailsModal: false, // UUSI
        selectedEvent: undefined,
        selectedProjectId: undefined,
        courseModalInfo: undefined,
        selectedScheduleTemplate: undefined,
        selectedTask: undefined,
      };

    case 'TOGGLE_SIDEBAR':
      return { ...state, isSidebarCollapsed: !state.isSidebarCollapsed };

    case 'TOGGLE_MOBILE_MENU':
      return { ...state, isMobileMenuOpen: !state.isMobileMenuOpen };

    case 'SET_KANBAN_PROJECT':
      return { ...state, selectedKanbanProjectId: action.payload };

    case 'SHOW_CONFIRMATION_MODAL':
      return {
        ...state,
        confirmationModal: {
          ...action.payload,
          isOpen: true,
        },
      };

    case 'CLOSE_CONFIRMATION_MODAL':
      return {
        ...state,
        confirmationModal: initialConfirmationState,
      };
    
    default:
      return state;
  }
}
