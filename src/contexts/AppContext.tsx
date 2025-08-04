// src/contexts/AppContext.tsx
import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { Event, Project, Task, CalendarView, ScheduleTemplate, RecurringClass, KanbanColumn, Subtask, AddProjectPayload } from '../types';
import { supabase } from '../supabaseClient';

import { projectReducerLogic } from '../reducers/projectReducer';
import { eventReducerLogic } from '../reducers/eventReducer';
import { uiReducerLogic } from '../reducers/uiReducer';
import { updateDeadlineEvents, generateRecurringEvents } from '../utils/eventUtils';
import { createProjectWithTemplates } from '../utils/projectUtils';

// Helper function to get initial events (remains the same)
function getInitialEvents(
  projects: Project[],
  recurringClasses: RecurringClass[],
  templates: ScheduleTemplate[],
  manualEvents: Event[]
): Event[] {
  const projectDeadlines = projects
    .filter(project => project.end_date && project.type !== 'course')
    .map(project => ({
      id: `project-deadline-${project.id}`,
      title: `DL: ${project.name}`,
      date: new Date(project.end_date!),
      type: 'deadline' as const,
      color: '#EF4444',
      project_id: project.id,
    }));

  const taskDeadlines = projects.flatMap(p => p.tasks)
    .filter(task => task.due_date)
    .map(task => ({
        id: `task-deadline-${task.id}`,
        title: `Tehtävä: ${task.title}`,
        date: new Date(task.due_date!),
        type: 'deadline' as const,
        color: '#F59E0B',
        project_id: task.project_id,
    }));

  const recurringEvents = recurringClasses.flatMap(rc => {
      const template = templates.find(t => t.id === rc.schedule_template_id);
      return template ? generateRecurringEvents(rc, template) : [];
  });

  return [...projectDeadlines, ...taskDeadlines, ...recurringEvents, ...manualEvents];
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
  | { type: 'INITIALIZE_DATA'; payload: { projects: Project[]; scheduleTemplates: ScheduleTemplate[]; recurringClasses: RecurringClass[]; manualEvents: Event[]; tasks: Task[] } }
  | { type: 'ADD_EVENT_SUCCESS'; payload: Event }
  | { type: 'UPDATE_EVENT_SUCCESS'; payload: Event }
  | { type: 'DELETE_EVENT_SUCCESS'; payload: string }
  | { type: 'ADD_PROJECT_SUCCESS'; payload: Project }
  | { type: 'UPDATE_PROJECT_SUCCESS'; payload: Project }
  | { type: 'DELETE_PROJECT_SUCCESS'; payload: string }
  | { type: 'ADD_TASK_SUCCESS'; payload: { projectId: string; task: Task } }
  | { type: 'UPDATE_TASK_SUCCESS'; payload: { projectId: string; task: Task } }
  | { type: 'DELETE_TASK_SUCCESS'; payload: { projectId: string; taskId: string } }
  | { type: 'ADD_SUBTASK'; payload: { projectId: string; taskId: string; subtask: Subtask } }
  | { type: 'UPDATE_SUBTASK'; payload: { projectId: string; taskId: string; subtask: Subtask } }
  | { type: 'DELETE_SUBTASK'; payload: { projectId: string; taskId: string; subtaskId: string } }
  | { type: 'ADD_SCHEDULE_TEMPLATE_SUCCESS'; payload: ScheduleTemplate }
  | { type: 'UPDATE_SCHEDULE_TEMPLATE_SUCCESS'; payload: ScheduleTemplate }
  | { type: 'DELETE_SCHEDULE_TEMPLATE_SUCCESS'; payload: string }
  | { type: 'ADD_RECURRING_CLASS_SUCCESS'; payload: RecurringClass[] }
  | { type: 'UPDATE_RECURRING_CLASS_SUCCESS'; payload: RecurringClass } // Added for completeness
  | { type: 'DELETE_RECURRING_CLASS_SUCCESS'; payload: string } // Added for completeness
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
  | { type: 'UPDATE_TASK_STATUS_SUCCESS'; payload: { projectId: string; taskId: string; newStatus: string } }
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

function appReducer(state: AppState, action: AppAction): AppState {
  let newState: AppState;

  switch (action.type) {
    case 'SET_SESSION':
      if (state.session === action.payload) return state;
      newState = { ...state, session: action.payload };
      break;
    case 'INITIALIZE_DATA':
      const { projects, scheduleTemplates, recurringClasses, manualEvents, tasks } = action.payload;
      const projectTasks = tasks.filter(t => t.project_id && t.project_id !== GENERAL_TASKS_PROJECT_ID);
      const generalTasks = tasks.filter(t => !t.project_id || t.project_id === GENERAL_TASKS_PROJECT_ID);
      const projectsWithTasks = projects.map(p => ({ ...p, tasks: projectTasks.filter(t => t.project_id === p.id) }));
      const updatedGeneralTasksProject = { ...generalTasksProject, tasks: generalTasks };
      const initialProjectsWithGeneral = [updatedGeneralTasksProject, ...projectsWithTasks];
      newState = {
        ...state,
        projects: initialProjectsWithGeneral,
        scheduleTemplates,
        recurringClasses,
        events: getInitialEvents(initialProjectsWithGeneral, recurringClasses, scheduleTemplates, manualEvents),
        loading: false,
      };
      break;
    default:
      const stateAfterUi = uiReducerLogic(state, action);
      const stateAfterEvent = eventReducerLogic(stateAfterUi, action);
      newState = projectReducerLogic(stateAfterEvent, action);
  }

  if (newState.projects !== state.projects || newState.events !== state.events) {
      return { ...newState, events: updateDeadlineEvents(newState.projects, newState.events) };
  }

  return newState;
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<AppAction>; } | null>(null);
const AppServiceContext = createContext<any>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const services = {
    // PROJECTS
    addProject: useCallback(async (projectPayload: AddProjectPayload) => {
        const { template_group_name, ...projectDataFromForm } = projectPayload;
        const { id, files, columns, tasks, ...dbData } = projectDataFromForm;

        // 1. Insert the project and get the new row with the real ID
        const { data: newProjectData, error } = await supabase.from('projects').insert([dbData]).select().single();
        if (error || !newProjectData) throw new Error(error.message);

        // 2. Format the project data correctly (dates to Date objects)
        const finalProject: Project = {
          ...(projectDataFromForm as Project),
          ...newProjectData,
          start_date: new Date(newProjectData.start_date),
          end_date: newProjectData.end_date ? new Date(newProjectData.end_date) : undefined,
          tasks: [],
          columns: projectDataFromForm.columns || [
            { id: 'todo', title: 'Suunnitteilla' },
            { id: 'inProgress', title: 'Työn alla' },
            { id: 'done', title: 'Valmis' },
          ],
        };

        // 3. If a template group was selected, generate and insert recurring classes
        if (template_group_name && finalProject.type === 'course') {
            const templatesInGroup = state.scheduleTemplates.filter(t => t.name === template_group_name);
            const recurringEndDate = finalProject.end_date
                ? finalProject.end_date
                : new Date(finalProject.start_date.getFullYear(), 11, 31);

            if (templatesInGroup.length > 0) {
                const newRecurringClasses: any[] = templatesInGroup.map(template => ({
                    title: finalProject.name,
                    description: `Oppitunti kurssille ${finalProject.name}`,
                    schedule_template_id: template.id,
                    start_date: finalProject.start_date,
                    end_date: recurringEndDate,
                    color: finalProject.color,
                    group_name: template.name,
                    project_id: finalProject.id,
                    files: finalProject.files || [],
                    user_id: state.session!.user.id
                }));

                const { data: newClassesData, error: recurringError } = await supabase.from('recurring_classes').insert(newRecurringClasses).select();
                
                if (recurringError) throw new Error(recurringError.message);

                const formattedNewClasses = (newClassesData || []).map((rc: any) => ({
                    ...rc,
                    start_date: new Date(rc.start_date),
                    end_date: new Date(rc.end_date),
                }));

                dispatch({ type: 'ADD_RECURRING_CLASS_SUCCESS', payload: formattedNewClasses as RecurringClass[] });
            }
        }

        // 4. Finally, dispatch the action to add the new project to the state
        dispatch({ type: 'ADD_PROJECT_SUCCESS', payload: finalProject });
    }, [state.scheduleTemplates, state.session]),

    updateProject: useCallback(async (project: Project) => {
        const { files, columns, tasks, ...dbData } = project;
        const { data, error } = await supabase.from('projects').update(dbData).match({ id: project.id }).select().single();
        if (error || !data) throw new Error(error.message);
        dispatch({ type: 'UPDATE_PROJECT_SUCCESS', payload: project });
    }, []),
    
    deleteProject: useCallback(async (projectId: string) => {
        const { error } = await supabase.from('projects').delete().match({ id: projectId });
        if (error) throw new Error(error.message);
        dispatch({ type: 'DELETE_PROJECT_SUCCESS', payload: projectId });
    }, []),

    // TASKS
    addTask: useCallback(async (task: Omit<Task, 'id'>) => {
      const { data, error } = await supabase.from('tasks').insert([task]).select().single();
      if (error || !data) throw new Error(error.message);
      const newTask = { 
        ...data, 
        due_date: data.due_date ? new Date(data.due_date) : undefined,
      };
      dispatch({ type: 'ADD_TASK_SUCCESS', payload: { projectId: data.project_id, task: newTask as Task } });
    }, []),

    updateTask: useCallback(async (task: Task) => {
      const { error } = await supabase.from('tasks').update(task).match({ id: task.id });
      if (error) throw new Error(error.message);
      dispatch({ type: 'UPDATE_TASK_SUCCESS', payload: { projectId: task.project_id, task: task } });
    }, []),
    
    deleteTask: useCallback(async (projectId: string, taskId: string) => {
      const { error } = await supabase.from('tasks').delete().match({ id: taskId });
      if (error) throw new Error(error.message);
      dispatch({ type: 'DELETE_TASK_SUCCESS', payload: { projectId, taskId } });
    }, []),
    
    updateTaskStatus: useCallback(async (projectId: string, taskId: string, newStatus: string) => {
        const { error } = await supabase.from('tasks').update({ column_id: newStatus }).match({ id: taskId });
        if (error) throw new Error(error.message);
        dispatch({ type: 'UPDATE_TASK_STATUS_SUCCESS', payload: { projectId, taskId, newStatus } });
    }, []),
    
    // EVENTS
    addEvent: useCallback(async (event: Omit<Event, 'id'>) => {
        const { data, error } = await supabase.from('events').insert([event]).select().single();
        if (error || !data) throw new Error(error.message);
        dispatch({ type: 'ADD_EVENT_SUCCESS', payload: data as Event });
    }, []),
    
    updateEvent: useCallback(async (event: Event) => {
        const { error } = await supabase.from('events').update(event).match({ id: event.id });
        if (error) throw new Error(error.message);
        dispatch({ type: 'UPDATE_EVENT_SUCCESS', payload: event });
    }, []),
    
    deleteEvent: useCallback(async (eventId: string) => {
        const { error } = await supabase.from('events').delete().match({ id: eventId });
        if (error) throw new Error(error.message);
        dispatch({ type: 'DELETE_EVENT_SUCCESS', payload: eventId });
    }, []),
    
    // SCHEDULE TEMPLATES
    addScheduleTemplate: useCallback(async (template: Omit<ScheduleTemplate, 'id'>) => {
        const { data, error } = await supabase.from('schedule_templates').insert([template]).select().single();
        if (error || !data) throw new Error(error.message);
        dispatch({ type: 'ADD_SCHEDULE_TEMPLATE_SUCCESS', payload: data as ScheduleTemplate });
    }, []),
    
    updateScheduleTemplate: useCallback(async (template: ScheduleTemplate) => {
        const { error } = await supabase.from('schedule_templates').update(template).match({ id: template.id });
        if (error) throw new Error(error.message);
        dispatch({ type: 'UPDATE_SCHEDULE_TEMPLATE_SUCCESS', payload: template });
    }, []),

    deleteScheduleTemplate: useCallback(async (templateId: string) => {
        const { error } = await supabase.from('schedule_templates').delete().match({ id: templateId });
        if (error) throw new Error(error.message);
        dispatch({ type: 'DELETE_SCHEDULE_TEMPLATE_SUCCESS', payload: templateId });
    }, []),
      
    // RECURRING CLASSES
    addRecurringClasses: useCallback(async (classes: Omit<RecurringClass, 'id'>[]) => {
        const { data, error } = await supabase.from('recurring_classes').insert(classes).select();
        if (error || !data) throw new Error(error.message);
        dispatch({ type: 'ADD_RECURRING_CLASS_SUCCESS', payload: data as RecurringClass[] });
    }, []),
  };

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
      if (!state.session) {
        dispatch({ type: 'INITIALIZE_DATA', payload: { projects: [], scheduleTemplates: [], recurringClasses: [], manualEvents: [], tasks: [] }});
        return;
      };
      const [projectsRes, templatesRes, recurringRes, eventsRes, tasksRes] = await Promise.all([
          supabase.from('projects').select('*'),
          supabase.from('schedule_templates').select('*'),
          supabase.from('recurring_classes').select('*'),
          supabase.from('events').select('*'),
          supabase.from('tasks').select('*')
      ]);
      if (projectsRes.error || templatesRes.error || recurringRes.error || eventsRes.error || tasksRes.error) {
        console.error('Error fetching data:', projectsRes.error || templatesRes.error || recurringRes.error || eventsRes.error || tasksRes.error);
        dispatch({ type: 'INITIALIZE_DATA', payload: { projects: [], scheduleTemplates: [], recurringClasses: [], manualEvents: [], tasks: [] } });
        return;
      }
      const formattedProjects = (projectsRes.data || []).map((p: any) => ({ ...p, start_date: new Date(p.start_date), end_date: p.end_date ? new Date(p.end_date) : undefined, tasks: [], columns: p.columns && p.columns.length > 0 ? p.columns : [ { id: 'todo', title: 'Suunnitteilla' }, { id: 'inProgress', title: 'Työn alla' }, { id: 'done', title: 'Valmis' } ] }));
      const formattedRecurring = (recurringRes.data || []).map((rc: any) => ({ ...rc, start_date: new Date(rc.start_date), end_date: new Date(rc.end_date) }));
      const formattedEvents = (eventsRes.data || []).map((e: any) => ({ ...e, date: new Date(e.date) }));
      const formattedTasks = (tasksRes.data || []).map((t: any) => ({ ...t, due_date: t.due_date ? new Date(t.due_date) : undefined, subtasks: t.subtasks || [], files: t.files || [] }));
      dispatch({ type: 'INITIALIZE_DATA', payload: { projects: formattedProjects, scheduleTemplates: templatesRes.data || [], recurringClasses: formattedRecurring, manualEvents: formattedEvents, tasks: formattedTasks } });
    };
    fetchInitialData();
  }, [state.session]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <AppServiceContext.Provider value={services}>
        {children}
      </AppServiceContext.Provider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) { throw new Error('useApp must be used within AppProvider'); }
  return context;
}

export function useAppServices() {
    const context = useContext(AppServiceContext);
    if (!context) { throw new Error('useAppServices must be used within AppProvider'); }
    return context;
}
