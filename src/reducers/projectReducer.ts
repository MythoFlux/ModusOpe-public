// src/reducers/projectReducer.ts
import { v4 as uuidv4 } from 'uuid';
import { AppAction, AppState } from '../contexts/AppContext';
import { KanbanColumn, Project, Subtask, Task } from '../types';
import { supabase } from '../supabaseClient';
import { createProjectWithTemplates } from '../utils/projectUtils';

// Apufunktio projektin löytämiseksi tilasta
const findProject = (state: AppState, projectId: string): Project | undefined => {
  return state.projects.find(p => p.id === projectId);
};

// Pääreducer-logiikka
export function projectReducerLogic(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // === PROJEKTIT ===
    case 'ADD_PROJECT': {
      const projectWithId = {
        ...action.payload,
        id: action.payload.id || uuidv4(),
      };

      const addProjectAsync = async () => {
        const { templateGroupName, files, columns, tasks, ...dbData } = projectWithId;
        const { data, error } = await supabase
          .from('projects')
          .insert([dbData])
          .select()
          .single();

        if (error) console.error("Error adding project:", error);
        else if (data) console.log("Project added successfully:", data);
      };
      addProjectAsync();

      const { project } = createProjectWithTemplates(projectWithId, state.scheduleTemplates);
      
      return {
        ...state,
        projects: [...state.projects, project],
      };
    }

    case 'UPDATE_PROJECT': {
        const updateProjectAsync = async () => {
            // Poistetaan paikalliset kentät ennen tietokantapäivitystä
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
                        // Siirretään poistetun sarakkeen tehtävät "todo"-sarakkeeseen
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
