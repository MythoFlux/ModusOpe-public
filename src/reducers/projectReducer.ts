// src/reducers/projectReducer.ts
import { nanoid } from 'nanoid';
import { AppAction, AppState, GENERAL_TASKS_PROJECT_ID } from '../contexts/AppContext';
import { KanbanColumn } from '../types';
import { createProjectWithTemplates } from '../utils/projectUtils';
import { generateRecurringEvents } from '../utils/eventUtils';
import { supabase } from '../supabaseClient';

// HUOM: Tämä on nyt asynkroninen, koska teemme tietokantakutsuja
export function projectReducerLogic(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_PROJECT': {
      // KORJAUS: Varmistetaan, että projektilla on aina ID.
      // Jos action.payload ei sisällä ID:tä (kuten uutta kurssia luodessa),
      // luodaan se tässä nanoid-kirjastolla.
      const projectWithId = {
        ...action.payload,
        id: action.payload.id || nanoid(),
      };

      const addProjectAsync = async () => {
        // VIIMEINEN KORJAUS: Poistetaan kaikki paikalliset kentät: templateGroupName, files, columns ja tasks.
        const { templateGroupName, files, columns, tasks, ...dbData } = projectWithId;

        const { data, error } = await supabase
          .from('projects')
          .insert([dbData])
          .select()
          .single();

        if (error) {
          console.error("Error adding project:", error);
        } else if (data) {
          console.log("Project added successfully:", data);
        }
      };

      addProjectAsync();

      const { project, newRecurringClasses } = createProjectWithTemplates(projectWithId, state.scheduleTemplates);
      const newProjects = [...state.projects, project];
      const updatedRecurringClasses = [...state.recurringClasses, ...newRecurringClasses];
      let updatedEvents = [...state.events];
      newRecurringClasses.forEach(rc => {
        const template = state.scheduleTemplates.find(t => t.id === rc.scheduleTemplateId);
        if (template) updatedEvents.push(...generateRecurringEvents(rc, template));
      });

      return {
        ...state,
        projects: newProjects,
        recurringClasses: updatedRecurringClasses,
        events: updatedEvents
      };
    }

    case 'DELETE_PROJECT': {
      const projectId = action.payload;

      const deleteProjectAsync = async () => {
        const { error } = await supabase
            .from('projects')
            .delete()
            .match({ id: projectId });

        if (error) {
            console.error("Error deleting project:", error);
        } else {
            console.log("Project deleted successfully");
        }
      }

      deleteProjectAsync();
      
      const newProjects = state.projects.filter(project => project.id !== projectId);
      const remainingEvents = state.events.filter(event => event.projectId !== projectId);
      return { ...state, projects: newProjects, events: remainingEvents };
    }

    default:
      return state;
  }
}
