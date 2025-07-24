// src/reducers/projectReducer.ts
import { v4 as uuidv4 } from 'uuid';
import { AppAction, AppState } from '../contexts/AppContext';
import { KanbanColumn, Project, Subtask, Task } from '../types';
import { supabase } from '../supabaseClient';
import { createProjectWithTemplates } from '../utils/projectUtils';
import { generateRecurringEvents } from '../utils/eventUtils';

// Apufunktio projektin löytämiseksi tilasta
const findProject = (state: AppState, projectId: string): Project | undefined => {
  return state.projects.find(p => p.id === projectId);
};

// Pääreducer-logiikka
export function projectReducerLogic(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // === PROJEKTIT ===
    case 'ADD_PROJECT': {
      const projectDataFromForm = action.payload;

      // KORJAUS: Muutetaan logiikkaa niin, että tietokantakutsut tehdään oikeassa järjestyksessä.
      const addProjectAndClassesAsync = async () => {
        // 1. Erotetaan projektin data tietokantaa varten.
        const { templateGroupName, files, columns, tasks, ...dbData } = projectDataFromForm;
        
        // 2. Luodaan projekti ja odotetaan, että se on valmis. Pyydetään paluuarvona luotu projekti.
        const { data: newProjectData, error: projectError } = await supabase
          .from('projects')
          .insert([dbData])
          .select()
          .single();

        if (projectError) {
          console.error("Error adding project:", projectError);
          return; // Lopetetaan suoritus, jos projektin luonti epäonnistui.
        }
        
        console.log("Project added successfully:", newProjectData);

        // 3. Jos tuntiryhmä oli valittu, luodaan toistuvat tunnit käyttäen juuri luodun projektin ID:tä.
        if (templateGroupName && newProjectData) {
          const projectWithId = { ...projectDataFromForm, id: newProjectData.id };
          const { newRecurringClasses } = createProjectWithTemplates(projectWithId, state.scheduleTemplates);
          
          if (newRecurringClasses.length > 0) {
            const classesWithUserId = newRecurringClasses.map(rc => ({
              ...rc,
              projectId: newProjectData.id, // Varmistetaan, että käytössä on oikea ID
              user_id: state.session?.user.id
            }));
            
            // 4. Lisätään toistuvat tunnit tietokantaan ja odotetaan, että se on valmis.
            const { error: recurringError } = await supabase.from('recurring_classes').insert(classesWithUserId);
            if (recurringError) {
              console.error("Error adding recurring classes:", recurringError);
            }
          }
        }
      };
      
      addProjectAndClassesAsync();

      // Päivitetään paikallinen tila optimistisesti heti.
      const { project, newRecurringClasses } = createProjectWithTemplates(
        { ...projectDataFromForm, id: uuidv4() }, // Käytetään väliaikaista ID:tä paikallisesti
        state.scheduleTemplates
      );

      const newEvents = newRecurringClasses.flatMap(rc => {
        const template = state.scheduleTemplates.find(t => t.id === rc.scheduleTemplateId);
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
        const { error } = await supabase
            .from('projects')
            .delete()
            .match({ id: projectId });
        if (error) console.error("Error deleting project:", error);
      }
      deleteProjectAsync();
      
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== projectId),
      };
    }

    // === TEHTÄVÄT ===
    case 'ADD_TASK': {
      const { projectId, task } = action.payload;
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId ? { ...p, tasks: [...p.tasks, task] } : p
        ),
      };
    }

    case 'UPDATE_TASK': {
      const { projectId, task } = action.payload;
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
        return {
            ...state,
            projects: state.projects.map(p => {
                if (p.id !== projectId) return p;
                return {
                    ...p,
                    tasks: p.tasks.map(t =>
                        t.id === taskId ? { ...t, columnId: newStatus } : t
                    ),
                };
            }),
        };
    }

    // === ALITEHTÄVÄT ===
    case 'ADD_SUBTASK': {
        const { projectId, taskId, subtask } = action.payload;
        return {
            ...state,
            projects: state.projects.map(p =>
                p.id === projectId
                    ? {
                        ...p,
                        tasks: p.tasks.map(t =>
                            t.id === taskId
                                ? { ...t, subtasks: [...(t.subtasks || []), subtask] }
                                : t
                        ),
                      }
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
                    ? {
                        ...p,
                        tasks: p.tasks.map(t =>
                            t.id === taskId
                                ? {
                                    ...t,
                                    subtasks: (t.subtasks || []).map(st =>
                                        st.id === subtask.id ? subtask : st
                                    ),
                                  }
                                : t
                        ),
                      }
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
                    ? {
                        ...p,
                        tasks: p.tasks.map(t =>
                            t.id === taskId
                                ? {
                                    ...t,
                                    subtasks: (t.subtasks || []).filter(
                                        st => st.id !== subtaskId
                                    ),
                                  }
                                : t
                        ),
                      }
                    : p
            ),
        };
    }

    // === KANBAN-SARAKKEET ===
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
                    ? {
                        ...p,
                        columns: p.columns.map(c => (c.id === column.id ? column : c)),
                      }
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
                    ? {
                        ...p,
                        columns: p.columns.filter(c => c.id !== columnId),
                        tasks: p.tasks.map(t =>
                            t.columnId === columnId ? { ...t, columnId: 'todo' } : t
                        ),
                      }
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
