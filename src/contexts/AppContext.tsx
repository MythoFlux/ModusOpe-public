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
  showEventDetailsModal: boolean; 
  showProjectModal: boolean;
  showCourseModal: boolean;
  showScheduleTemplateModal: boolean;
  showTaskModal: boolean;
  showTaskDetailsModal: boolean; // UUSI
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
  | { type: 'TOGGLE_EVENT_DETAILS_MODAL'; payload?: Event } 
  | { type: 'OPEN_EVENT_EDIT_MODAL' } 
  | { type: 'TOGGLE_PROJECT_MODAL'; payload?: string }
  | { type: 'TOGGLE_COURSE_MODAL'; payload?: { id?: string } }
  | { type: 'TOGGLE_SCHEDULE_TEMPLATE_MODAL'; payload?: ScheduleTemplate }
  | { type: 'TOGGLE_TASK_MODAL'; payload?: Task }
  | { type: 'TOGGLE_TASK_DETAILS_MODAL'; payload?: Task } // UUSI
  | { type: 'OPEN_TASK_EDIT_MODAL' } // UUSI
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
  showEventDetailsModal: false, 
  showProjectModal: false,
  showCourseModal: false,
  showScheduleTemplateModal: false,
  showTaskModal: false,
  showTaskDetailsModal: false, // UUSI
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
        
        const projectDataWithFiles = { ...projectDataFromForm, files: projectDataFromForm.files || [] };
        const { id, files, tasks, ...dbData } = projectDataWithFiles;
        const dataToInsert = { ...dbData, columns: DEFAULT_KANBAN_COLUMNS, user_id: state.session?.user.id, files };

        const { data: newProjectData, error } = await supabase.from('projects').insert([dataToInsert]).select().single();
        if (error || !newProjectData) throw new Error(error.message);

        const finalProject: Project = {
          ...(projectDataWithFiles as Project),
          ...newProjectData,
          start_date: new Date(newProjectData.start_date),
