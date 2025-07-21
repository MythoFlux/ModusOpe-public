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
    
    case 'TOGGLE_PROJECT_MODAL':
      return { ...state, showProjectModal: !state.showProjectModal, selectedProjectId: action.payload };

    case 'TOGGLE_COURSE_MODAL':
      return { ...state, showCourseModal: !state.showCourseModal, courseModalInfo: action.payload };
    
    case 'TOGGLE_SCHEDULE_TEMPLATE_MODAL':
      return { ...state, showScheduleTemplateModal: !state.showScheduleTemplateModal, selectedScheduleTemplate: action.payload };
    
    case 'TOGGLE_RECURRING_CLASS_MODAL':
      return { ...state, showRecurringClassModal: !state.showRecurringClassModal, selectedRecurringClass: action.payload };

    case 'TOGGLE_TASK_MODAL':
      return { ...state, showTaskModal: !state.showTaskModal, selectedTask: action.payload };
      
    case 'CLOSE_MODALS':
      return {
        ...state,
        showEventModal: false,
        showProjectModal: false,
        showCourseModal: false,
        showScheduleTemplateModal: false,
        showRecurringClassModal: false,
        showTaskModal: false,
        selectedEvent: undefined,
        selectedProjectId: undefined,
        courseModalInfo: undefined,
        selectedScheduleTemplate: undefined,
        selectedRecurringClass: undefined,
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
