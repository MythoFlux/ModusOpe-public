// src/contexts/AppContext.tsx
import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { Event, Project, Task, CalendarView, ScheduleTemplate, KanbanColumn, Subtask, AddProjectPayload, FileAttachment } from '../types';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

import { projectReducerLogic } from '../reducers/projectReducer';
import { eventReducerLogic } from '../reducers/eventReducer';
import { uiReducerLogic } from '../reducers/uiReducer';
import { updateDeadlineEvents, generateEventsForCourse } from '../utils/eventUtils';
import { DEFAULT_KANBAN_COLUMNS } from '../constants/kanbanConstants';

function getInitialEvents(
  projects: Project[],
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

  return [...projectDeadlines, ...taskDeadlines, ...manualEvents];
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
  columns: DEFAULT_KANBAN_COLUMNS,
  order_index: -1,
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
  currentView: CalendarView;
  selectedDate: Date;
  showEventModal: boolean;
  showEventDetailsModal: boolean; // LISÄTTY
  showProjectModal: boolean;
  showCourseModal: boolean;
  showScheduleTemplateModal: boolean;
  showTaskModal: boolean;
  selectedEvent?: Event;
  selectedProjectId?: string;
  courseModalInfo?: { id?: string };
  selectedScheduleTemplate?: ScheduleTemplate;
  selectedTask?: Task;
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;
  selectedKanbanProjectId?: string | null;
  confirmationModal: ConfirmationModalState;
}

export type AppAction =
  | { type: 'SET_SESSION'; payload: Session | null }
  | { type: 'INITIALIZE_DATA'; payload: { projects: Project[]; scheduleTemplates: ScheduleTemplate[]; manualEvents: Event[]; tasks: Task[] } }
  | { type: 'ADD_EVENT_SUCCESS'; payload: Event | Event[] }
  | { type: 'UPDATE_EVENT_SUCCESS'; payload: Event }
  | { type: 'UPDATE_MULTIPLE_EVENTS_SUCCESS', payload: Event[] }
  | { type: 'DELETE_EVENT_SUCCESS'; payload: string }
  | { type: 'ADD_PROJECT_SUCCESS'; payload: Project }
  | { type: 'UPDATE_PROJECT_SUCCESS'; payload: Project }
  | { type: 'UPDATE_PROJECTS_ORDER_SUCCESS'; payload: Project[] }
  | { type: 'DELETE_PROJECT_SUCCESS'; payload: string }
  | { type: 'ADD_TASK_SUCCESS'; payload: { projectId: string; task: Task } }
  | { type: 'UPDATE_TASK_SUCCESS'; payload: { projectId: string; task: Task } }
  | { type: 'DELETE_TASK_SUCCESS'; payload: { projectId: string; taskId: string } }
  | { type: 'REORDER_TASKS_SUCCESS'; payload: { projectId: string; tasks: Task[] } }
  | { type: 'ADD_SUBTASK'; payload: { projectId: string; taskId: string; subtask: Subtask } }
  | { type: 'UPDATE_SUBTASK'; payload: { projectId: string; taskId: string; subtask: Subtask } }
  | { type: 'DELETE_SUBTASK'; payload: { projectId: string; taskId: string; subtaskId: string } }
  | { type: 'ADD_SCHEDULE_TEMPLATE_SUCCESS'; payload: ScheduleTemplate }
  | { type: 'UPDATE_SCHEDULE_TEMPLATE_SUCCESS'; payload: ScheduleTemplate }
  | { type: 'DELETE_SCHEDULE_TEMPLATE_SUCCESS'; payload: string }
  | { type: 'SET_VIEW'; payload: CalendarView }
  | { type: 'SET_SELECTED_DATE'; payload: Date }
  | { type: 'TOGGLE_EVENT_MODAL'; payload?: Event }
  | { type: 'TOGGLE_EVENT_DETAILS_MODAL'; payload?: Event } // LISÄTTY
  | { type: 'OPEN_EVENT_EDIT_MODAL' } // LISÄTTY
  | { type: 'TOGGLE_PROJECT_MODAL'; payload?: string }
  | { type: 'TOGGLE_COURSE_MODAL'; payload?: { id?: string } }
  | { type: 'TOGGLE_SCHEDULE_TEMPLATE_MODAL'; payload?: ScheduleTemplate }
  | { type: 'TOGGLE_TASK_MODAL'; payload?: Task }
  | { type: 'CLOSE_MODALS' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_MOBILE_MENU' }
  | { type: 'SET_KANBAN_PROJECT'; payload: string | null }
  | { type: 'UPDATE_TASK_STATUS_SUCCESS'; payload: { projectId: string; taskId: string; newStatus: string } }
  | { type: 'ADD_COLUMN'; payload: { projectId: string; column: KanbanColumn } }
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
  currentView: 'month',
  selectedDate: new Date(),
  showEventModal: false,
  showEventDetailsModal: false, // LISÄTTY
  showProjectModal: false,
  showCourseModal: false,
  showScheduleTemplateModal: false,
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
      const { projects, scheduleTemplates, manualEvents, tasks } = action.payload;
      const projectTasks = tasks.filter(t => t.project_id && t.project_id !== GENERAL_TASKS_PROJECT_ID);
      const generalTasks = tasks.filter(t => !t.project_id || t.project_id === GENERAL_TASKS_PROJECT_ID);
      const projectsWithTasks = projects.map(p => ({ ...p, tasks: projectTasks.filter(t => t.project_id === p.id) }));
      const updatedGeneralTasksProject = { ...generalTasksProject, tasks: generalTasks };
      const initialProjectsWithGeneral = [updatedGeneralTasksProject, ...projectsWithTasks];
      newState = {
        ...state,
        projects: initialProjectsWithGeneral,
        scheduleTemplates,
        events: getInitialEvents(initialProjectsWithGeneral, manualEvents),
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
    uploadFile: useCallback(async (file: File): Promise<string> => {
      if (!state.session?.user) throw new Error("User not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${state.session.user.id}/${uuidv4()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }
      return filePath;
    }, [state.session]),

    deleteFile: useCallback(async (filePath: string) => {
      const { error } = await supabase.storage.from('attachments').remove([filePath]);
      if (error) {
        console.error("Error deleting file from storage:", error);
      }
    }, []),

    addProject: useCallback(async (projectPayload: AddProjectPayload) => {
        const { template_group_name, ...projectDataFromForm } = projectPayload;
        
        // Varmistetaan, että files on olemassa, vaikka se olisi tyhjä
        const projectDataWithFiles = { ...projectDataFromForm, files: projectDataFromForm.files || [] };
        
        const { id, files, tasks, ...dbData } = projectDataWithFiles;
        
        const dataToInsert = { ...dbData, columns: DEFAULT_KANBAN_COLUMNS, user_id: state.session?.user.id, files };

        const { data: newProjectData, error } = await supabase.from('projects').insert([dataToInsert]).select().single();
        if (error || !newProjectData) throw new Error(error.message);

        const finalProject: Project = {
          ...(projectDataWithFiles as Project),
          ...newProjectData,
          start_date: new Date(newProjectData.start_date),
          end_date: newProjectData.end_date ? new Date(newProjectData.end_date) : undefined,
          tasks: [],
          columns: newProjectData.columns,
          files: newProjectData.files || [],
        };

        dispatch({ type: 'ADD_PROJECT_SUCCESS', payload: finalProject });

        if (template_group_name && finalProject.type === 'course' && finalProject.end_date) {
            const templatesInGroup = state.scheduleTemplates.filter(t => t.name === template_group_name);
            if (templatesInGroup.length > 0) {
              const eventsToCreate = generateEventsForCourse(finalProject, templatesInGroup);
              
              if (eventsToCreate.length > 0) {
                 const eventsWithUser = eventsToCreate.map(e => ({ ...e, user_id: state.session?.user.id }));
                const { data: newEventsData, error: eventError } = await supabase.from('events').insert(eventsWithUser).select();
                
                if (eventError) throw new Error(eventError.message);
                
                const formattedNewEvents = (newEventsData || []).map((e: any) => ({
                    ...e,
                    date: new Date(e.date),
                }));
                
                dispatch({ type: 'ADD_EVENT_SUCCESS', payload: formattedNewEvents as Event[] });
              }
            }
        }
    }, [state.scheduleTemplates, state.session]),

    updateProject: useCallback(async (project: Project) => {
        const { tasks, ...dbData } = project;
        // Varmistetaan, että files-kenttä on mukana, vaikka se olisi tyhjä
        const dbDataWithFiles = { ...dbData, files: dbData.files || [] };
        
        const { data, error } = await supabase.from('projects').update(dbDataWithFiles).match({ id: project.id }).select().single();
        if (error || !data) throw new Error(error.message);
        dispatch({ type: 'UPDATE_PROJECT_SUCCESS', payload: project });
    }, []),
    
    updateProjectOrder: useCallback(async (orderedProjects: Project[]) => {
      const projectsWithNewOrder = orderedProjects.map((project, index) => ({
        ...project,
        order_index: index,
      }));

      const updatePromises = projectsWithNewOrder.map(p =>
        supabase
          .from('projects')
          .update({ order_index: p.order_index })
          .eq('id', p.id)
      );
    
      const results = await Promise.all(updatePromises);
    
      const firstError = results.find(res => res.error);
      if (firstError) {
        throw firstError.error;
      }
    
      dispatch({ type: 'UPDATE_PROJECTS_ORDER_SUCCESS', payload: projectsWithNewOrder });
    }, []),
    
    deleteProject: useCallback(async (projectId: string) => {
        const projectToDelete = state.projects.find(p => p.id === projectId);
        if(projectToDelete?.files && projectToDelete.files.length > 0) {
            const filePaths = projectToDelete.files
                .filter(f => f.type === 'upload' && f.url)
                .map(f => f.url!);
            if (filePaths.length > 0) {
                await supabase.storage.from('attachments').remove(filePaths);
            }
        }

        const { error } = await supabase.from('projects').delete().match({ id: projectId });
        if (error) throw new Error(error.message);
        dispatch({ type: 'DELETE_PROJECT_SUCCESS', payload: projectId });
    }, [state.projects]),

    addTask: useCallback(async (task: Omit<Task, 'id'>) => {
      const targetProjectId = task.project_id || GENERAL_TASKS_PROJECT_ID;
      const project = state.projects.find(p => p.id === targetProjectId);
      const tasksInColumn = project?.tasks.filter(t => t.column_id === task.column_id) || [];
      const maxOrderIndex = tasksInColumn.reduce((max, t) => Math.max(t.order_index || 0, max), 0);
      
      const taskWithUserAndOrder = { ...task, files: task.files || [], order_index: maxOrderIndex + 1, user_id: state.session?.user.id };
      
      const { data, error } = await supabase.from('tasks').insert([taskWithUserAndOrder]).select().single();
      if (error || !data) throw new Error(error.message);
      
      const newTask = { 
        ...data, 
        due_date: data.due_date ? new Date(data.due_date) : undefined,
      };
      
      dispatch({ type: 'ADD_TASK_SUCCESS', payload: { projectId: data.project_id || GENERAL_TASKS_PROJECT_ID, task: newTask as Task } });
    }, [state.session, state.projects]),

    updateTask: useCallback(async (task: Task) => {
      const taskWithFiles = { ...task, files: task.files || [] };
      const { error } = await supabase.from('tasks').update(taskWithFiles).match({ id: task.id });
      if (error) throw new Error(error.message);
      dispatch({ type: 'UPDATE_TASK_SUCCESS', payload: { projectId: task.project_id || GENERAL_TASKS_PROJECT_ID, task: task } });
    }, []),

    updateTasksOrder: useCallback(async (tasksToUpdate: Partial<Task>[]) => {
      const { error } = await supabase.from('tasks').upsert(tasksToUpdate);
      if (error) {
        console.error("Error updating tasks order:", error);
        throw error;
      }
    }, []),
    
    deleteTask: useCallback(async (projectId: string, taskId: string) => {
      const project = state.projects.find(p => p.id === projectId);
      const taskToDelete = project?.tasks.find(t => t.id === taskId);

      if(taskToDelete?.files && taskToDelete.files.length > 0) {
          const filePaths = taskToDelete.files
              .filter(f => f.type === 'upload' && f.url)
              .map(f => f.url!);
          if (filePaths.length > 0) {
              await supabase.storage.from('attachments').remove(filePaths);
          }
      }

      const { error } = await supabase.from('tasks').delete().match({ id: taskId });
      if (error) throw new Error(error.message);
      dispatch({ type: 'DELETE_TASK_SUCCESS', payload: { projectId: projectId || GENERAL_TASKS_PROJECT_ID, taskId } });
    }, [state.projects]),
    
    updateTaskStatus: useCallback(async (projectId: string, taskId: string, newStatus: string) => {
        const { error } = await supabase.from('tasks').update({ column_id: newStatus }).match({ id: taskId });
        if (error) throw new Error(error.message);
        dispatch({ type: 'UPDATE_TASK_STATUS_SUCCESS', payload: { projectId: projectId || GENERAL_TASKS_PROJECT_ID, taskId, newStatus } });
    }, []),
    
    addEvent: useCallback(async (event: Omit<Event, 'id'>) => {
        const eventWithUser = { ...event, files: event.files || [], user_id: state.session?.user.id };
        const { data, error } = await supabase.from('events').insert([eventWithUser]).select().single();
        if (error || !data) throw new Error(error.message);
        const newEvent = { ...data, date: new Date(data.date) };
        dispatch({ type: 'ADD_EVENT_SUCCESS', payload: newEvent as Event });
    }, [state.session]),
    
    updateEvent: useCallback(async (event: Event, options: { scope: 'single' | 'future' | 'all' | 'range', range: { start: string, end: string } }) => {
        const { scope, range } = options;

        if (scope === 'single' || !event.project_id || event.type !== 'class' || !event.group_name) {
            const { group_name, ...eventToUpdate } = event;
            const eventWithFiles = { ...eventToUpdate, files: event.files || [] };
            
            const { error } = await supabase.from('events').update(eventWithFiles).match({ id: event.id });
            if (error) throw new Error(error.message);
            dispatch({ type: 'UPDATE_EVENT_SUCCESS', payload: event });
            return;
        }

        const updatedFields = {
            title: event.title,
            description: event.description,
            more_info: event.more_info,
            color: event.color,
            files: event.files || [],
        };

        let query = supabase.from('events').update(updatedFields)
            .eq('project_id', event.project_id)
            .eq('group_name', event.group_name);

        switch (scope) {
            case 'future':
                query = query.gte('date', new Date(event.date).toISOString().split('T')[0]);
                break;
            case 'range':
                if (range.start) query = query.gte('date', new Date(range.start).toISOString().split('T')[0]);
                if (range.end) query = query.lte('date', new Date(range.end).toISOString().split('T')[0]);
                break;
            case 'all':
            default:
                break;
        }

        const { data: updatedData, error: updateError } = await query.select();
        if (updateError) throw new Error(updateError.message);
        
        const updatedEventList = state.events.map(e => {
            const updatedVersion = updatedData.find(u => u.id === e.id);
            if (updatedVersion) {
                return { ...e, ...updatedFields };
            }
            return e;
        });

        dispatch({ type: 'UPDATE_MULTIPLE_EVENTS_SUCCESS', payload: updatedEventList });
    }, [state.events]),
    
    deleteEvent: useCallback(async (eventId: string) => {
        const eventToDelete = state.events.find(e => e.id === eventId);
        if(eventToDelete?.files && eventToDelete.files.length > 0) {
            const filePaths = eventToDelete.files
                .filter(f => f.type === 'upload' && f.url)
                .map(f => f.url!);
            if (filePaths.length > 0) {
                await supabase.storage.from('attachments').remove(filePaths);
            }
        }

        const { error } = await supabase.from('events').delete().match({ id: eventId });
        if (error) throw new Error(error.message);
        dispatch({ type: 'DELETE_EVENT_SUCCESS', payload: eventId });
    }, [state.events]),
    
    addScheduleTemplate: useCallback(async (template: Omit<ScheduleTemplate, 'id'>) => {
        const templateWithUser = { ...template, user_id: state.session?.user.id };
        const { data, error } = await supabase.from('schedule_templates').insert([templateWithUser]).select().single();
        if (error || !data) throw new Error(error.message);
        dispatch({ type: 'ADD_SCHEDULE_TEMPLATE_SUCCESS', payload: data as ScheduleTemplate });
    }, [state.session]),
    
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
        dispatch({ type: 'INITIALIZE_DATA', payload: { projects: [], scheduleTemplates: [], manualEvents: [], tasks: [] }});
        return;
      };
      const [projectsRes, templatesRes, eventsRes, tasksRes] = await Promise.all([
          supabase.from('projects').select('*').order('order_index', { ascending: true }),
          supabase.from('schedule_templates').select('*'),
          supabase.from('events').select('*'),
          supabase.from('tasks').select('*').order('order_index', { ascending: true })
      ]);
      if (projectsRes.error || templatesRes.error || eventsRes.error || tasksRes.error) {
        console.error('Error fetching data:', projectsRes.error || templatesRes.error || eventsRes.error || tasksRes.error);
        dispatch({ type: 'INITIALIZE_DATA', payload: { projects: [], scheduleTemplates: [], manualEvents: [], tasks: [] } });
        return;
      }
      const formattedProjects = (projectsRes.data || []).map((p: any) => ({ ...p, start_date: new Date(p.start_date), end_date: p.end_date ? new Date(p.end_date) : undefined, tasks: [], columns: p.columns && p.columns.length > 0 ? p.columns : DEFAULT_KANBAN_COLUMNS, files: p.files || [] }));
      const formattedEvents = (eventsRes.data || []).map((e: any) => ({ ...e, date: new Date(e.date), files: e.files || [] }));
      const formattedTasks = (tasksRes.data || []).map((t: any) => ({ ...t, due_date: t.due_date ? new Date(t.due_date) : undefined, subtasks: t.subtasks || [], files: t.files || [] }));
      dispatch({ type: 'INITIALIZE_DATA', payload: { projects: formattedProjects, scheduleTemplates: templatesRes.data || [], manualEvents: formattedEvents, tasks: formattedTasks } });
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
