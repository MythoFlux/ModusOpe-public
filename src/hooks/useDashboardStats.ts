// src/hooks/useDashboardStats.ts
import { useMemo } from 'react';
import { Event, Project, Task } from '../types';
import { isToday, addDays } from '../utils/dateUtils';
import { GENERAL_TASKS_PROJECT_ID } from '../contexts/AppContext';

// Laajennettu Task-tyyppi, joka sisältää projektin nimen ja värin
export interface DashboardTask extends Task {
  projectName: string;
  projectColor: string;
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

/**
 * Custom-hook, joka laskee ja suodattaa kojelaudalla näytettävät tiedot.
 * @param events - Lista kaikista tapahtumista.
 * @param projects - Lista kaikista projekteista.
 * @returns - Objekti, joka sisältää lasketut tilastotiedot.
 */
export function useDashboardStats({ events, projects }: UseDashboardStatsProps): DashboardStats {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0); // Asetetaan päivän alkuun vertailua varten
    return d;
  }, []);
  
  const nextWeek = useMemo(() => addDays(today, 7), [today]);

  const todayEvents = useMemo(() => events.filter(event => isToday(new Date(event.date))), [events]);

  const allTasks = useMemo(() => projects.flatMap(project => 
    project.tasks.map(task => ({
      ...task,
      projectName: project.name,
      projectColor: project.color
    }))
  ), [projects]);
  
  const upcomingTasks = useMemo(() => allTasks
    .filter(task => !task.completed && task.dueDate && new Date(task.dueDate) >= today)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5), [allTasks, today]);

  const urgentTasks = useMemo(() => allTasks
    .filter(task => !task.completed && task.dueDate && new Date(task.dueDate) >= today && new Date(task.dueDate) <= nextWeek)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5), [allTasks, today, nextWeek]);

  const overdueTasks = useMemo(() => allTasks
    .filter(task => !task.completed && task.dueDate && new Date(task.dueDate) < today)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
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
