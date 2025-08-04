// src/utils/projectUtils.ts
import { v4 as uuidv4 } from 'uuid';
import { Project, RecurringClass, ScheduleTemplate, KanbanColumn } from '../types';
import { AddProjectPayload } from '../types'; // Tuodaan tyyppi types-kansiosta

export function createProjectWithTemplates(
  payload: AddProjectPayload,
  allTemplates: ScheduleTemplate[]
): { project: Project; newRecurringClasses: RecurringClass[] } {
  const { templateGroupName, ...projectData } = payload;

  const defaultColumns: KanbanColumn[] = [
    { id: 'todo', title: 'Suunnitteilla' },
    { id: 'inProgress', title: 'Työn alla' },
    { id: 'done', title: 'Valmis' },
  ];

  const newProject: Project = {
    ...projectData,
    id: projectData.id || uuidv4(),
    tasks: projectData.tasks || [],
    columns: defaultColumns,
  };

  let newRecurringClasses: RecurringClass[] = [];

  if (templateGroupName && newProject.type === 'course' && newProject.start_date) {
    const templatesInGroup = allTemplates.filter(t => t.name === templateGroupName);

    const recurringEndDate = newProject.end_date
        ? newProject.end_date
        : new Date(newProject.start_date.getFullYear(), 11, 31);

    templatesInGroup.forEach(template => {
        const recurringClass: RecurringClass = {
            id: uuidv4(),
            title: newProject.name,
            description: `Oppitunti kurssille ${newProject.name}`,
            schedule_template_id: template.id, // KORJATTU
            start_date: newProject.start_date, // KORJATTU
            end_date: recurringEndDate, // KORJATTU
            color: newProject.color,
            group_name: template.name, // KORJATTU
            project_id: newProject.id, // KORJATTU
            files: newProject.files || []
        };
        newRecurringClasses.push(recurringClass);
    });
  }

  return { project: newProject, newRecurringClasses };
}
