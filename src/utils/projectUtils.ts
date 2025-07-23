// src/utils/projectUtils.ts
import { v4 as uuidv4 } from 'uuid'; // MUUTOS: Otettu käyttöön uuid nanoid:n sijaan
import { Project, RecurringClass, ScheduleTemplate, KanbanColumn, AddProjectPayload } from '../types';

// Tyyppi on siirretty types/index.ts-tiedostoon, mutta pidetään se tässä selkeyden vuoksi
// export type AddProjectPayload = Omit<Project, 'columns' | 'id'> & { id?: string; templateGroupName?: string };

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
    id: projectData.id || uuidv4(), // MUUTOS: nanoid() -> uuidv4()
    tasks: projectData.tasks || [],
    columns: defaultColumns,
  };

  let newRecurringClasses: RecurringClass[] = [];

  // Varmistetaan, että kurssille on valittu tuntiryhmä ja alkamispäivä
  if (templateGroupName && newProject.type === 'course' && newProject.start_date) {
    const templatesInGroup = allTemplates.filter(t => t.name === templateGroupName);

    // Jos kurssille ei ole päättymispäivää, asetetaan se oletuksena kuluvan vuoden loppuun
    const recurringEndDate = newProject.end_date
        ? newProject.end_date
        : new Date(newProject.start_date.getFullYear(), 11, 31);

    templatesInGroup.forEach(template => {
        const recurringClass: RecurringClass = {
            id: uuidv4(), // MUUTOS: Luodaan yksilöllinen ID uuid:lla
            title: newProject.name,
            description: `Oppitunti kurssille ${newProject.name}`,
            scheduleTemplateId: template.id,
            startDate: newProject.start_date, // KORJAUS: Käytetään oikeaa nimeä 'start_date'
            endDate: recurringEndDate,
            color: newProject.color,
            groupName: template.name,
            projectId: newProject.id,
            files: newProject.files || []
        };
        newRecurringClasses.push(recurringClass);
    });
  }

  return { project: newProject, newRecurringClasses };
}

// Lisätään AddProjectPayload-tyypin export, jotta se on saatavilla muissa tiedostoissa
export type { AddProjectPayload };
