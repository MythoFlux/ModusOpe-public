// src/contexts/AppContext.tsx
import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Event, Project, Task, CalendarView, ScheduleTemplate, RecurringClass, KanbanColumn, Subtask } from '../types';
import { supabase } from '../supabaseClient';

import { projectReducerLogic } from '../reducers/projectReducer';
import { eventReducerLogic } from '../reducers/eventReducer';
import { uiReducerLogic } from '../reducers/uiReducer';
import { updateDeadlineEvents, generateRecurringEvents } from '../utils/eventUtils';

// --- MUUTETTU FUNKTIO ALKAA ---
// Lisätty manualEvents-parametri, joka sisältää tietokannasta haetut tapahtumat
function getInitialEvents(
  projects: Project[],
  recurringClasses: RecurringClass[],
  templates: ScheduleTemplate[],
  manualEvents: Event[] // <-- LISÄTTY
): Event[] {
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

  const recurringEvents = recurringClasses.flatMap(rc => {
      const template = templates.find(t => t.id === rc.scheduleTemplateId);
      return template ? generateRecurringEvents(rc, template) : [];
  });

  // Yhdistetään dynaamisesti luodut tapahtumat ja tietokannasta haetut manuaaliset tapahtumat
  return [...projectDeadlines, ...taskDeadlines, ...recurringEvents, ...manualEvents];
}
// --- MUUTETTU FUNKTIO PÄÄTTYY ---


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
  // --- MUUTETTU RIVI ---
  | { type: 'INITIALIZE_DATA'; payload: { projects: Project[]; scheduleTemplates: ScheduleTemplate[]; recurringClasses: RecurringClass[]; manualEvents: Event[]; tasks: Task[] } }
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
      if (state.session === action.payload) return state;
      return { ...state, session: action.payload };
    case 'INITIALIZE_DATA':
      // --- MUUTETTU KOHTA ALKAA ---
      const { projects, scheduleTemplates, recurringClasses, manualEvents, tasks } = action.payload;

      // Jaotellaan tehtävät: ne, jotka kuuluvat projekteihin ja ne, jotka ovat yleisiä
      const projectTasks = tasks.filter(t => t.projectId && t.projectId !== GENERAL_TASKS_PROJECT_ID);
      const generalTasks = tasks.filter(t => !t.projectId || t.projectId === GENERAL_TASKS_PROJECT_ID);

      // Lisätään tehtävät niitä vastaaviin projekteihin
      const projectsWithTasks = projects.map(p => ({
        ...p,
        tasks: projectTasks.filter(t => t.projectId === p.id)
      }));

      // Päivitetään yleisten tehtävien projekti
      const updatedGeneralTasksProject = {
        ...generalTasksProject,
        tasks: generalTasks,
      };

      const initialProjectsWithGeneral = [updatedGeneralTasksProject, ...projectsWithTasks];

      return {
        ...state,
        projects: initialProjectsWithGeneral,
        scheduleTemplates,
        recurringClasses,
        events: getInitialEvents(initialProjectsWithGeneral, recurringClasses, scheduleTemplates, manualEvents),
        loading: false,
      };
      // --- MUUTETTU KOHTA PÄÄTTYY ---
    default:
      const stateAfterUi = uiReducerLogic(state, action);
      const stateAfterEvent = eventReducerLogic(stateAfterUi, action);
      const stateAfterProject = projectReducerLogic(stateAfterEvent, action);
      let finalState = stateAfterProject;

      if (finalState.projects !== state.projects || finalState.events !== state.events || finalState.recurringClasses !== state.recurringClasses) {
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SET_SESSION', payload: session });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ type: 'SET_SESSION', payload: session });
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!state.session) return;
      
      // --- MUUTETTU KOHTA ALKAA ---
      const [projectsRes, templatesRes, recurringRes, eventsRes, tasksRes] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('schedule_templates').select('*'),
          supabase.from('recurring_classes').select('*'),
          supabase.from('events').select('*'), // <-- LISÄTTY events-taulun haku
          supabase.from('tasks').select('*') // <-- LISÄTTY tasks-taulun haku
      ]);

      if (projectsRes.error || templatesRes.error || recurringRes.error || eventsRes.error || tasksRes.error) {
        console.error('Error fetching data:', projectsRes.error || templatesRes.error || recurringRes.error || eventsRes.error || tasksRes.error);
        dispatch({ type: 'INITIALIZE_DATA', payload: { projects: [], scheduleTemplates: [], recurringClasses: [], manualEvents: [], tasks: [] } });
        return;
      }
      // --- MUUTETTU KOHTA PÄÄTTYY ---
      
      const formattedProjects = (projectsRes.data || []).map((p: any) => ({
        ...p,
        start_date: new Date(p.start_date),
        end_date: p.end_date ? new Date(p.end_date) : undefined,
        tasks: [],
        columns: p.columns && p.columns.length > 0 ? p.columns : [
          { id: 'todo', title: 'Suunnitteilla' },
          { id: 'inProgress', title: 'Työn alla' },
          { id: 'done', title: 'Valmis' },
        ]
      }));

      const formattedRecurring = (recurringRes.data || []).map((rc: any) => ({
        ...rc,
        startDate: new Date(rc.startDate),
        endDate: new Date(rc.endDate),
      }));
      
      // --- LISÄTTY KOHTA ALKAA ---
      // Muotoillaan tietokannasta haetut tapahtumat oikeaan muotoon
      const formattedEvents = (eventsRes.data || []).map((e: any) => ({
        ...e,
        // Varmistetaan, että päivämäärä on Date-olio
        date: new Date(e.date),
        // Muunnetaan snake_case avaimet camelCase-avaimiksi sovelluksen sisäistä käyttöä varten
        startTime: e.start_time,
        endTime: e.end_time,
        projectId: e.project_id,
        scheduleTemplateId: e.schedule_template_id,
        groupName: e.group_name
      }));
      
      const formattedTasks = (tasksRes.data || []).map((t: any) => ({
        ...t,
        dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
      }));
      // --- LISÄTTY KOHTA PÄÄTTYY ---

      // --- MUUTETTU KOHTA ---
      dispatch({ 
        type: 'INITIALIZE_DATA', 
        payload: { 
          projects: formattedProjects, 
          scheduleTemplates: templatesRes.data || [], 
          recurringClasses: formattedRecurring,
          manualEvents: formattedEvents, // <-- Lisätään haetut tapahtumat mukaan
          tasks: formattedTasks // <-- Lisätään haetut tehtävät mukaan
        } 
      });
    };

    if (state.session) {
      fetchInitialData();
    } else {
      dispatch({ type: 'INITIALIZE_DATA', payload: { projects: [], scheduleTemplates: [], recurringClasses: [], manualEvents: [], tasks: [] }});
    }
  }, [state.session]);

  return (<AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>);
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) { throw new Error('useApp must be used within AppProvider'); }
  return context;
}
