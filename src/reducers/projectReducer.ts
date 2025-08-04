// src/reducers/projectReducer.ts
import { v4 as uuidv4 } from 'uuid';
import { AppAction, AppState } from '../contexts/AppContext';
import { KanbanColumn, Project, Subtask, Task } from '../types';
import { supabase } from '../supabaseClient';
import { createProjectWithTemplates } from '../utils/projectUtils';
import { generateRecurringEvents } from '../utils/eventUtils';

const findProject = (state: AppState, projectId: string): Project | undefined => {
  return state.projects.find(p => p.id === projectId);
};

export function projectReducerLogic(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_PROJECT': {
      const { templateGroupName, ...projectDataFromForm } = action.payload;

      const addProjectAndClassesAsync = async () => {
        // Poistetaan client-puolen väliaikaiset tiedot ennen tallennusta
        const { id, files, columns, tasks, ...dbData } = projectDataFromForm;
        
        // 1. Tallenna projekti ja pyydä se takaisin Supabasesta, jotta saamme oikean, tietokannan luoman ID:n.
        const { data: newProjectData, error: projectError } = await supabase
          .from('projects')
          .insert([dbData])
          .select()
          .single();

        if (projectError || !newProjectData) {
          console.error("Error adding project:", projectError);
          return;
        }
        
        // 2. Jos käytetään tuntipohjia, luo toistuvat tunnit käyttämällä juuri saatua Oikeaa project ID:tä.
        if (templateGroupName) {
          const projectWithRealId = { ...projectDataFromForm, id: newProjectData.id };
          const { newRecurringClasses } = createProjectWithTemplates(projectWithRealId, state.scheduleTemplates);
          
          if (newRecurringClasses.length > 0) {
            const classesWithUserIdAndRealProjectId = newRecurringClasses.map(rc => ({
              ...rc,
              project_id: newProjectData.id, // Varmistetaan oikea ID
              user_id: state.session?.user.id
            }));
            
            const { error: recurringError } = await supabase.from('recurring_classes').insert(classesWithUserIdAndRealProjectId);
            if (recurringError) {
              console.error("Error adding recurring classes:", recurringError);
            }
          }
        }
        
        // HUOM: Ideaalitilanteessa tämä async-funktio palauttaisi `newProjectData`-olion,
        // ja reduceriin lähetettäisiin uusi action (esim. 'ADD_PROJECT_SUCCESS'),
        // joka päivittäisi sovelluksen tilan tällä tietokannasta saadulla datalla.
        // Nykyisessä "fire-and-forget" -mallissa emme voi tehdä sitä suoraan,
        // mutta olemme nyt korjanneet tietokannan eheyden.
        // Sovelluksen tila synkronoituu täysin vasta sivun uudelleenlatauksen jälkeen.
      };
      
      addProjectAndClassesAsync();

      // HUOM: Tämä on optimistinen päivitys. Se käyttää client-puolella luotua
      // väliaikaista ID:tä, jotta käyttöliittymä tuntuu nopealta. Tämä ID EI OLE
      // sama kuin tietokantaan tallennettu ID. Tämä on nykyisen arkkitehtuurin rajoite.
      const { project, newRecurringClasses } = createProjectWithTemplates(
        { ...projectDataFromForm, templateGroupName, id: uuidv4() },
        state.scheduleTemplates
      );

      const newEvents = newRecurringClasses.flatMap(rc => {
        const template = state.scheduleTemplates.find(t => t.id === rc.schedule_template_id);
        return template ? generateRecurringEvents(rc, template) : [];
      });
      
      return {
        ...state,
        projects: [...state.projects, project],
        recurringClasses: [...state.recurringClasses, ...newRecurringClasses],
        events: [...state.events, ...newEvents],
      };
    }

    case 'UPDATE_PROJECT': {
        const updateProjectAsync = async () => {
            const { files, columns, tasks, ...dbData } = action.payload;
            const { error } = await supabase
                .from('projects')
                .update(dbData)
                .match({ id: action.payload.id });
            if (error) console.error("Error updating project:", error);
        };
        updateProjectAsync();

        return {
            ...state,
            projects: state.projects.map(p =>
                p.id === action.payload.id ? action.payload : p
            ),
        };
    }

    case 'DELETE_PROJECT': {
      const projectId = action.payload;
      const deleteProjectAsync = async () => {
        const { error } = await supabase.from('projects').delete().match({ id: projectId });
        if (error) console.error("Error deleting project:", error);
      }
      deleteProjectAsync();
      
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== projectId),
      };
    }

    case 'ADD_TASK': {
      const { projectId, task } = action.payload;
      const addTaskAsync = async () => {
        // Kuten projektin luonnissa, emme lähetä client-puolen ID:tä tietokantaan.
        const { id, ...taskData } = task;
        const { error } = await supabase.from('tasks').insert([taskData]);
        if (error) console.error("Error adding task:", error);
      }
      addTaskAsync();
      
      // Optimistinen päivitys client-puolen ID:llä
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId ? { ...p, tasks: [...p.tasks, task] } : p
        ),
      };
    }

    case 'UPDATE_TASK': {
      const { projectId, task } = action.payload;
      const updateTaskAsync = async () => {
        const { error } = await supabase.from('tasks').update(task).match({ id: task.id });
        if (error) console.error("Error updating task:", error);
      };
      updateTaskAsync();

      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, tasks: p.tasks.map(t => (t.id === task.id ? task : t)) }
            : p
        ),
      };
    }

    case 'DELETE_TASK': {
      const { projectId, taskId } = action.payload;
      const deleteTaskAsync = async () => {
          const { error } = await supabase.from('tasks').delete().match({ id: taskId });
          if(error) console.error("Error deleting task:", error);
      }
      deleteTaskAsync();

      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId
            ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) }
            : p
        ),
      };
    }

    case 'UPDATE_TASK_STATUS': {
        const { projectId, taskId, newStatus } = action.payload;
        const updateStatusAsync = async () => {
            const { error } = await supabase.from('tasks').update({ column_id: newStatus }).match({ id: taskId });
            if (error) console.error("Error updating task status:", error);
        }
        updateStatusAsync();

        return {
            ...state,
            projects: state.projects.map(p => {
                if (p.id !== projectId) return p;
                return {
                    ...p,
                    tasks: p.tasks.map(t =>
                        t.id === taskId ? { ...t, column_id: newStatus } : t
                    ),
                };
            }),
        };
    }

    case 'ADD_SUBTASK': {
        const { projectId, taskId, subtask } = action.payload;
        return {
            ...state,
            projects: state.projects.map(p =>
                p.id === projectId
                    ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), subtask] } : t) }
                    : p
            ),
        };
    }

    case 'UPDATE_SUBTASK': {
        const { projectId, taskId, subtask } = action.payload;
        return {
            ...state,
            projects: state.projects.map(p =>
                p.id === projectId
                    ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, subtasks: (t.subtasks || []).map(st => st.id === subtask.id ? subtask : st) } : t) }
                    : p
            ),
        };
    }

    case 'DELETE_SUBTASK': {
        const { projectId, taskId, subtaskId } = action.payload;
        return {
            ...state,
            projects: state.projects.map(p =>
                p.id === projectId
                    ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, subtasks: (t.subtasks || []).filter(st => st.id !== subtaskId) } : t) }
                    : p
            ),
        };
    }

    case 'ADD_COLUMN': {
        const { projectId, title } = action.payload;
        const newColumn: KanbanColumn = { id: uuidv4(), title };
        return {
            ...state,
            projects: state.projects.map(p =>
                p.id === projectId ? { ...p, columns: [...p.columns, newColumn] } : p
            ),
        };
    }

    case 'UPDATE_COLUMN': {
        const { projectId, column } = action.payload;
        return {
            ...state,
            projects: state.projects.map(p =>
                p.id === projectId
                    ? { ...p, columns: p.columns.map(c => (c.id === column.id ? column : c)) }
                    : p
            ),
        };
    }

    case 'DELETE_COLUMN': {
        const { projectId, columnId } = action.payload;
        return {
            ...state,
            projects: state.projects.map(p =>
                p.id === projectId
                    ? { ...p, columns: p.columns.filter(c => c.id !== columnId), tasks: p.tasks.map(t => t.column_id === columnId ? { ...t, column_id: 'todo' } : t) }
                    : p
            ),
        };
    }
    
    case 'REORDER_COLUMNS': {
        const { projectId, startIndex, endIndex } = action.payload;
        const project = findProject(state, projectId);
        if (!project) return state;

        const reorderedColumns = Array.from(project.columns);
        const [removed] = reorderedColumns.splice(startIndex, 1);
        reorderedColumns.splice(endIndex, 0, removed);

        return {
            ...state,
            projects: state.projects.map(p =>
                p.id === projectId ? { ...p, columns: reorderedColumns } : p
            ),
        };
    }

    default:
      return state;
  }
}
