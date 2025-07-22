// src/contexts/AppContext.tsx
import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Event, Project, Task, CalendarView, ScheduleTemplate, RecurringClass, KanbanColumn, Subtask } from '../types';
import { supabase } from '../supabaseClient';

import { projectReducerLogic } from '../reducers/projectReducer';
import { eventReducerLogic } from '../reducers/eventReducer';
import { uiReducerLogic } from '../reducers/uiReducer';
import { updateDeadlineEvents } from '../utils/eventUtils';

// getInitialEvents ja generalTasksProject pysyvät samoina...
function getInitialEvents(projects: Project[]): Event[] {
  const projectDeadlines = projects
    .filter(project => project.end_date && project.type !== 'course')
    .map(project => ({
      id: `project-deadline-${project.id}`,
      title: `DL: ${project.name}`,
      date: new Date(project.end_date!),
      type: 'deadline',
      color: '#EF4444',
      projectId: project.id,
    }));

  const taskDeadlines = projects.flatMap(p => p.tasks)
    .filter(task => task.dueDate)
    .map(task => ({
        id: `task-deadline-${task.id}`,
        title: `Tehtävä: ${task.title}`,
        date: new Date(task.dueDate!),
        type: 'deadline',
        color: '#F59E0B',
        projectId: task.projectId,
    }));

  return [...projectDeadlines, ...taskDeadlines];
}

export const GENERAL_TASKS_PROJECT_ID = 'general_tasks_project';

const generalTasksProject: Project = {
  id: GENERAL_TASKS_PROJECT_ID,
  name: 'Yleiset tehtävät',
  description: 'Tänne kerätään kaikki tehtävät, joita ei ole liitetty mihinkään tiettyyn projektiin.',
  type: 'none',
  color: '#6B7280',
  start_date: new Date(),
  tasks: [],
  columns: [
    { id: 'todo', title: 'Suunnitteilla' },
    { id: 'inProgress', title: 'Työn alla' },
    { id: 'done', title: 'Valmis' },
  ],
};


export interface ConfirmationModalState {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Muokataan AppStatea sisältämään sessio
export interface AppState {
  session: Session | null;
  loading: boolean;
  events: Event[];
  projects: Project[];
  scheduleTemplates: ScheduleTemplate[];
  recurringClasses: RecurringClass[];
  currentView: CalendarView;
  selectedDate: Date;
  showEventModal: boolean;
  showProjectModal: boolean;
  showCourseModal: boolean;
  showScheduleTemplateModal: boolean;
  showRecurringClassModal: boolean;
  showTaskModal: boolean;
  selectedEvent?: Event;
  selectedProjectId?: string;
  courseModalInfo?: { id?: string };
  selectedScheduleTemplate?: ScheduleTemplate;
  selectedRecurringClass?: RecurringClass;
  selectedTask?: Task;
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;
  selectedKanbanProjectId?: string | null;
  confirmationModal: ConfirmationModalState;
}

export type AppAction =
  | { type: 'SET_SESSION'; payload: Session | null }
  | { type: 'INITIALIZE_DATA'; payload: { projects: Project[] } }
  | { type: 'ADD_EVENT'; payload: Event }
  | { type: 'UPDATE_EVENT'; payload: Event }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'ADD_PROJECT'; payload: any }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'ADD_TASK'; payload: { projectId: string; task: Task } }
  | { type: 'UPDATE_TASK'; payload: { projectId: string; task: Task } }
  | { type: 'DELETE_TASK'; payload: { projectId: string; taskId: string } }
  | { type: 'ADD_SUBTASK'; payload: { projectId: string; taskId: string; subtask: Subtask } }
  | { type: 'UPDATE_SUBTASK'; payload: { projectId: string; taskId: string; subtask: Subtask } }
  | { type: 'DELETE_SUBTASK'; payload: { projectId: string; taskId: string; subtaskId: string } }
  | { type: 'ADD_SCHEDULE_TEMPLATE'; payload: ScheduleTemplate }
  | { type: 'UPDATE_SCHEDULE_TEMPLATE'; payload: ScheduleTemplate }
  | { type: 'DELETE_SCHEDULE_TEMPLATE'; payload: string }
  | { type: 'ADD_RECURRING_CLASS'; payload: RecurringClass }
  | { type: 'UPDATE_RECURRING_CLASS'; payload: RecurringClass }
  | { type: 'DELETE_RECURRING_CLASS'; payload: string }
  | { type: 'SET_VIEW'; payload: CalendarView }
  | { type: 'SET_SELECTED_DATE'; payload: Date }
  | { type: 'TOGGLE_EVENT_MODAL'; payload?: Event }
  | { type: 'TOGGLE_PROJECT_MODAL'; payload?: string }
  | { type: 'TOGGLE_COURSE_MODAL'; payload?: { id?: string } }
  | { type: 'TOGGLE_SCHEDULE_TEMPLATE_MODAL'; payload?: ScheduleTemplate }
  | { type: 'TOGGLE_RECURRING_CLASS_MODAL'; payload?: RecurringClass }
  | { type: 'TOGGLE_TASK_MODAL'; payload?: Task }
  | { type: 'CLOSE_MODALS' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_MOBILE_MENU' }
  | { type: 'SET_KANBAN_PROJECT'; payload: string | null }
  | { type: 'UPDATE_TASK_STATUS'; payload: { projectId: string; taskId: string; newStatus: string } }
  | { type: 'ADD_COLUMN'; payload: { projectId: string; title: string } }
  | { type: 'UPDATE_COLUMN'; payload: { projectId: string; column: KanbanColumn } }
  | { type: 'DELETE_COLUMN'; payload: { projectId: string; columnId: string } }
  | { type: 'SHOW_CONFIRMATION_MODAL'; payload: Omit<ConfirmationModalState, 'isOpen'> }
  | { type: 'CLOSE_CONFIRMATION_MODAL' }
  | { type: 'REORDER_COLUMNS'; payload: { projectId: string; startIndex: number; endIndex: number } };

const initialConfirmationState: ConfirmationModalState = {
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
};

const initialState: AppState = {
  session: null,
  loading: true,
  events: [],
  projects: [],
  scheduleTemplates: [],
  recurringClasses: [],
  currentView: 'month',
  selectedDate: new Date(),
  showEventModal: false,
  showProjectModal: false,
  showCourseModal: false,
  showScheduleTemplateModal: false,
  showRecurringClassModal: false,
  showTaskModal: false,
  isSidebarCollapsed: false,
  isMobileMenuOpen: false,
  selectedKanbanProjectId: null,
  confirmationModal: initialConfirmationState,
};

// Pääreducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SESSION':
      // Estetään turha uudelleenlataus, jos sessio on sama
      if (state.session === action.payload) return state;
      return { ...state, session: action.payload };
    case 'INITIALIZE_DATA':
      const initialProjectsWithGeneral = [generalTasksProject, ...action.payload.projects];
      return {
        ...state,
        projects: initialProjectsWithGeneral,
        events: getInitialEvents(initialProjectsWithGeneral),
        loading: false,
      };
    default:
      // Yhdistetään muiden reducereeiden logiikka
      const stateAfterUi = uiReducerLogic(state, action);
      const stateAfterEvent = eventReducerLogic(stateAfterUi, action);
      const stateAfterProject = projectReducerLogic(stateAfterEvent, action);
      let finalState = stateAfterProject;

      if (finalState.projects !== state.projects || finalState.events !== state.events) {
          finalState = {
              ...finalState,
              events: updateDeadlineEvents(finalState.projects, finalState.events)
          };
      }
      return finalState;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<AppAction>; } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // KOUKKU 1: Session tilan hallinta. Ajetaan vain kerran.
  useEffect(() => {
    // 1. Haetaan olemassaoleva sessio käynnistyksessä
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SET_SESSION', payload: session });
    });

    // 2. Asetetaan kuuntelija, joka reagoi sisään- ja uloskirjautumisiin
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ type: 'SET_SESSION', payload: session });
    });

    // 3. Siivotaan kuuntelija, kun komponentti poistuu
    return () => subscription.unsubscribe();
  }, []); // <-- Tyhjä riippuvuustaulukko varmistaa, että tämä ajetaan vain kerran

  // KOUKKU 2: Datan haku session perusteella.
  useEffect(() => {
    // Funktio datan hakemiseksi
    const fetchInitialData = async () => {
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*');

        if (error) {
            console.error('Error fetching projects:', error);
            // Varmistetaan, ettei lataustila jää jumiin virhetilanteessa
            dispatch({ type: 'INITIALIZE_DATA', payload: { projects: [] } });
        } else if (projects) {
            // --- TÄMÄ OSIO ON KORJATTU ---
            const formattedProjects = projects.map((p: any) => ({
                ...p,
                // Muunnetaan merkkijonot Date-olioiksi oikeilla kentänimillä
                start_date: new Date(p.start_date),
                end_date: p.end_date ? new Date(p.end_date) : undefined,
                parent_course_id: p.parent_course_id,
                tasks: [],
                columns: [
                    { id: 'todo', title: 'Suunnitteilla' },
                    { id: 'inProgress', title: 'Työn alla' },
                    { id: 'done', title: 'Valmis' },
                ]
            }));
            dispatch({ type: 'INITIALIZE_DATA', payload: { projects: formattedProjects } });
        }
    };

    // Haetaan data vain jos käyttäjä on kirjautunut sisään (sessio on olemassa)
    if (state.session) {
      fetchInitialData();
    } else {
      // Jos käyttäjä kirjautuu ulos (sessio on null), tyhjennetään data ja lopetetaan lataus
      dispatch({ type: 'INITIALIZE_DATA', payload: { projects: [] }});
    }
  }, [state.session]); // <-- Tämä koukku ajetaan aina, kun sessio muuttuu

  return (<AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>);
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) { throw new Error('useApp must be used within AppProvider'); }
  return context;
}
