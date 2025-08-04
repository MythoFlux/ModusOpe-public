// src/utils/eventUtils.ts
import { Event, Project, RecurringClass, ScheduleTemplate } from '../types';

export function generateRecurringEvents(recurringClass: RecurringClass, template: ScheduleTemplate): Event[] {
  const events: Event[] = [];
  const startDate = new Date(recurringClass.start_date);
  const endDate = new Date(recurringClass.end_date);
  const targetDay = template.day_of_week;
  
  const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  const currentDay = (currentDate.getDay() + 6) % 7;
  const daysToAdd = (targetDay - currentDay + 7) % 7;
  currentDate.setDate(currentDate.getDate() + daysToAdd);

  while (currentDate <= endDate) {
    const eventDate = new Date(currentDate);
    const [startHour, startMinute] = template.start_time.split(':').map(Number);
    eventDate.setHours(startHour, startMinute, 0, 0);
    
    events.push({
      id: `recurring-${recurringClass.id}-${eventDate.getTime()}`,
      title: recurringClass.title,
      description: recurringClass.description,
      date: eventDate,
      start_time: template.start_time,
      end_time: template.end_time,
      type: 'class',
      color: recurringClass.color,
      project_id: recurringClass.project_id,
      schedule_template_id: template.id,
      group_name: recurringClass.group_name,
      files: recurringClass.files || [],
    });
    currentDate.setDate(currentDate.getDate() + 7);
  }
  return events;
}

function generateProjectDeadlineEvents(projects: Project[]): Event[] {
  return projects
    .filter(project => project.end_date && project.type !== 'course')
    .map(project => ({
      id: `project-deadline-${project.id}`,
      title: `DL: ${project.name}`,
      date: project.end_date!,
      type: 'deadline',
      color: '#EF4444',
      project_id: project.id,
    }));
}

function generateTaskDeadlineEvents(projects: Project[]): Event[] {
    const allTasks = projects.flatMap(p => p.tasks);
    return allTasks
        .filter(task => task.due_date)
        .map(task => ({
            id: `task-deadline-${task.id}`,
            title: `Tehtävä: ${task.title}`,
            date: task.due_date!,
            type: 'deadline',
            color: '#F59E0B',
            project_id: task.project_id,
        }));
}

export function updateDeadlineEvents(projects: Project[], baseEvents: Event[]): Event[] {
    const nonDeadlineEvents = baseEvents.filter(
        e => !e.id.startsWith('project-deadline-') && !e.id.startsWith('task-deadline-')
    );
    const projectDeadlines = generateProjectDeadlineEvents(projects);
    const taskDeadlines = generateTaskDeadlineEvents(projects);
    return [...nonDeadlineEvents, ...projectDeadlines, ...taskDeadlines];
}
