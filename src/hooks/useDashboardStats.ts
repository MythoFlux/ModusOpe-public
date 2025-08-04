// src/hooks/useDashboardStats.ts
import { useMemo } from 'react';
import { Event, Project, Task } from '../types';
import { isToday, addDays } from '../utils/dateUtils';
import { GENERAL_TASKS_PROJECT_ID } from '../contexts/AppContext';

export interface DashboardTask extends Task {
  project_name: string;
  project_color: string;
}

interface DashboardStats {
  todayEvents: Event[];
  activeProjects: Project[];
  upcomingTasks: DashboardTask[];
  urgentTasks: DashboardTask[];
  overdueTasks: DashboardTask[];
}

interface UseDashboardStatsProps {
  events: Event[];
  projects: Project[];
}

export function useDashboardStats({ events, projects }: UseDashboardStatsProps): DashboardStats {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  
  const nextWeek = useMemo(() => addDays(today, 7), [today]);

  const todayEvents = useMemo(() => events.filter(event => isToday(new Date(event.date))), [events]);

  const allTasks = useMemo(() => projects.flatMap(project => 
    project.tasks.map(task => ({
      ...task,
      project_name: project.name,
      project_color: project.color
    }))
  ), [projects]);
  
  const upcomingTasks = useMemo(() => allTasks
    .filter(task => !task.completed && task.due_date && new Date(task.due_date) >= today) // KORJATTU
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()) // KORJATTU
    .slice(0, 5), [allTasks, today]);

  const urgentTasks = useMemo(() => allTasks
    .filter(task => !task.completed && task.due_date && new Date(task.due_date) >= today && new Date(task.due_date) <= nextWeek) // KORJATTU
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()) // KORJATTU
    .slice(0, 5), [allTasks, today, nextWeek]);

  const overdueTasks = useMemo(() => allTasks
    .filter(task => !task.completed && task.due_date && new Date(task.due_date) < today) // KORJATTU
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()) // KORJATTU
    .slice(0, 5), [allTasks, today]);
  
  const activeProjects = useMemo(() => projects.filter(p => p.id !== GENERAL_TASKS_PROJECT_ID), [projects]);

  return {
    todayEvents,
    activeProjects,
    upcomingTasks,
    urgentTasks,
    overdueTasks,
  };
}
