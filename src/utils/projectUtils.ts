import { nanoid } from 'nanoid';
import { Project, RecurringClass, ScheduleTemplate, KanbanColumn } from '../types';

// Tyyppi projektin luomisen payloadille, joka voi sisältää tuntiryhmän nimen
export type AddProjectPayload = Omit<Project, 'columns' | 'id'> & { id?: string; templateGroupName?: string };

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
    id: projectData.id || nanoid(),
    tasks: projectData.tasks || [],
    columns: defaultColumns,
  };

  let newRecurringClasses: RecurringClass[] = [];

  if (templateGroupName && newProject.type === 'course' && newProject.startDate) {
    const templatesInGroup = allTemplates.filter(t => t.name === templateGroupName);
    
    const recurringEndDate = newProject.endDate 
        ? newProject.endDate 
        : new Date(newProject.startDate.getFullYear(), 11, 31);

    templatesInGroup.forEach(template => {
        const recurringClass: RecurringClass = {
            id: `${newProject.id}-${template.id}`,
            title: newProject.name,
            description: `Oppitunti kurssille ${newProject.name}`,
            scheduleTemplateId: template.id,
            startDate: newProject.startDate,
            endDate: recurringEndDate,
            color: newProject.color,
            groupName: template.name,
            projectId: newProject.id
        };
        newRecurringClasses.push(recurringClass);
    });
  }
  
  return { project: newProject, newRecurringClasses };
}
