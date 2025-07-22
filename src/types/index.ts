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
  uploadDate: Date;
}

export interface Event {
  id:string;
  title: string;
  description?: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  type: 'class' | 'meeting' | 'deadline' | 'personal' | 'assignment';
  color: string;
  projectId?: string;
  scheduleTemplateId?: string; 
  groupName?: string;
  files?: FileAttachment[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  // --- TÄMÄ RIVI ON MUUTETTU ---
  type: 'course' | 'administrative' | 'personal' | 'none';
  startDate: Date;
  endDate?: Date;
  tasks: Task[];
  columns: KanbanColumn[];
  files?: FileAttachment[];
  parentCourseId?: string;
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
  columnId: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
  projectId: string;
  subtasks?: Subtask[];
  files?: FileAttachment[];
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  color: string;
  dayOfWeek: number; // 0 = Monday, 1 = Tuesday, etc.
  startTime: string;
  endTime: string;
  description?: string;
}

export interface RecurringClass {
  id: string;
  title: string;
  description?: string;
  scheduleTemplateId: string;
  startDate: Date;
  endDate: Date;
  color: string;
  groupName?: string; 
  projectId?: string;
  files?: FileAttachment[];
}

export type CalendarView = 'month' | 'week' | 'day' | 'schedule';
