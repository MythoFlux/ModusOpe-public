// src/utils/eventUtils.ts
import { Event, Project, ScheduleTemplate } from '../types';

// TÄMÄ FUNKTIO ON UUSI JA KORVAA VANHAN LOGIIKAN
// Sitä käytetään luomaan kaikki kurssin tapahtumat kerralla etukäteen.
export function generateEventsForCourse(
  course: Project,
  templates: ScheduleTemplate[]
): Omit<Event, 'id'>[] {
  if (course.type !== 'course' || !course.end_date) {
    return [];
  }

  const events: Omit<Event, 'id'>[] = [];
  const startDate = new Date(course.start_date);
  const endDate = new Date(course.end_date);
  
  // Käydään läpi jokainen päivä kurssin alku- ja loppupäivän välillä
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = (currentDate.getDay() + 6) % 7; // Maanantai = 0, Sunnuntai = 6
    
    // Etsitään sopivat tuntipohjat tälle viikonpäivälle
    const matchingTemplates = templates.filter(t => t.day_of_week === dayOfWeek);

    for (const template of matchingTemplates) {
        const eventDate = new Date(currentDate);
        const [startHour, startMinute] = template.start_time.split(':').map(Number);
        eventDate.setHours(startHour, startMinute, 0, 0);

        events.push({
            title: course.name,
            description: template.description || course.description,
            date: eventDate,
            start_time: template.start_time,
            end_time: template.end_time,
            type: 'class',
            color: course.color,
            project_id: course.id,
            schedule_template_id: template.id,
            group_name: template.name,
            files: course.files || [],
        });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
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
