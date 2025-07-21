import { Event, Project, RecurringClass, ScheduleTemplate } from '../types';

// Funktio toistuvien tapahtumien luomiseen annetun mallin ja ajanjakson perusteella
export function generateRecurringEvents(recurringClass: RecurringClass, template: ScheduleTemplate): Event[] {
  const events: Event[] = [];
  const startDate = new Date(recurringClass.startDate);
  const endDate = new Date(recurringClass.endDate);
  const targetDay = template.dayOfWeek;
  
  const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  const currentDay = (currentDate.getDay() + 6) % 7; // Maanantai = 0
  const daysToAdd = (targetDay - currentDay + 7) % 7;
  currentDate.setDate(currentDate.getDate() + daysToAdd);

  while (currentDate <= endDate) {
    const eventDate = new Date(currentDate);
    const [startHour, startMinute] = template.startTime.split(':').map(Number);
    eventDate.setHours(startHour, startMinute, 0, 0);
    
    events.push({
      id: `recurring-${recurringClass.id}-${eventDate.getTime()}`,
      title: recurringClass.title,
      description: recurringClass.description,
      date: eventDate,
      startTime: template.startTime,
      endTime: template.endTime,
      type: 'class',
      color: recurringClass.color,
      projectId: recurringClass.projectId,
      scheduleTemplateId: template.id,
      groupName: recurringClass.groupName,
      files: recurringClass.files || [],
    });
    currentDate.setDate(currentDate.getDate() + 7);
  }
  return events;
}

// Funktio projektien määräpäivien luomiseen
function generateProjectDeadlineEvents(projects: Project[]): Event[] {
  return projects
    .filter(project => project.endDate && project.type !== 'course')
    .map(project => ({
      id: `project-deadline-${project.id}`,
      title: `DL: ${project.name}`,
      date: project.endDate!,
      type: 'deadline',
      color: '#EF4444',
      projectId: project.id,
    }));
}

// Funktio tehtävien määräpäivien luomiseen
function generateTaskDeadlineEvents(projects: Project[]): Event[] {
    const allTasks = projects.flatMap(p => p.tasks);
    return allTasks
        .filter(task => task.dueDate)
        .map(task => ({
            id: `task-deadline-${task.id}`,
            title: `Tehtävä: ${task.title}`,
            date: task.dueDate!,
            type: 'deadline',
            color: '#F59E0B',
            projectId: task.projectId,
        }));
}

// Yhdistetty funktio, joka päivittää kaikki määräpäivätapahtumat
export function updateDeadlineEvents(projects: Project[], baseEvents: Event[]): Event[] {
    const nonDeadlineEvents = baseEvents.filter(
        e => !e.id.startsWith('project-deadline-') && !e.id.startsWith('task-deadline-')
    );
    const projectDeadlines = generateProjectDeadlineEvents(projects);
    const taskDeadlines = generateTaskDeadlineEvents(projects);
    return [...nonDeadlineEvents, ...projectDeadlines, ...taskDeadlines];
}
