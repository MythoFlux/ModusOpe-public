// src/types/index.ts

export interface KanbanColumn {
  id: string;
  title: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: 'upload' | 'google-drive';
  url?: string;
  size?: number;
  upload_date: Date;
}

export interface Event {
  id:string;
  title: string;
  description?: string;
  date: Date;
  start_time?: string;
  end_time?: string;
  type: 'class' | 'meeting' | 'deadline' | 'personal' | 'assignment';
  color: string;
  project_id?: string | null; // Sallitaan null
  schedule_template_id?: string;
  group_name?: string;
  files?: FileAttachment[];
  more_info?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  type: 'course' | 'administrative' | 'personal' | 'none';
  start_date: Date;
  end_date?: Date;
  parent_course_id?: string;
  tasks: Task[];
  columns: KanbanColumn[];
  files?: FileAttachment[];
  more_info?: string;
  order_index?: number; 
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  column_id: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: Date;
  project_id: string;
  subtasks?: Subtask[];
  files?: FileAttachment[];
  show_description?: boolean;
  show_subtasks?: boolean;
  order_index?: number; // LISÄTTY TÄMÄ
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  color: string;
  day_of_week: number; // 0 = Monday, 1 = Tuesday, etc.
  start_time: string;
  end_time: string;
  description?: string;
}

export type CalendarView = 'month' | 'week' | 'day' | 'schedule';

export interface AddProjectPayload extends Omit<Project, 'id' | 'tasks' | 'columns'> {
  id?: string;
  tasks?: Task[];
  columns?: KanbanColumn[];
  template_group_name?: string;
}
