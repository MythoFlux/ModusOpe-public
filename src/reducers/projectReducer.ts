// src/reducers/projectReducer.ts
import { AppAction, AppState } from '../contexts/AppContext';
import { KanbanColumn, Project, Subtask, Task } from '../types';
import { GENERAL_TASKS_PROJECT_ID } from '../contexts/AppContext';
import { KANBAN_COLUMN_IDS } from '../constants/kanbanConstants'; // MUUTOS: Tuotu vakiot

const findProject = (state: AppState, projectId: string): Project | undefined => {
  return state.projects.find(p => p.id === projectId);
};

export function projectReducerLogic(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_PROJECT_SUCCESS': {
      return {
        ...state,
        projects: [...state.projects, action.payload],
      };
    }

    case 'UPDATE_PROJECT_SUCCESS': {
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    }

    case 'UPDATE_PROJECTS_ORDER_SUCCESS': {
      // Payload on nyt täydellinen, järjestetty lista siirreltävistä projekteista.
      const orderedReorderableProjects = action.payload;

      // Haetaan "Yleiset tehtävät" -projekti, joka ei ole siirrettävissä.
      const generalProject = state.projects.find(p => p.id === GENERAL_TASKS_PROJECT_ID);

      // Luodaan täysin uusi projektilista yhdistämällä yleinen projekti ja uusi järjestys.
      // Tämä takaa, että React huomaa muutoksen ja päivittää näkymän.
      const newProjectsState = generalProject
        ? [generalProject, ...orderedReorderableProjects]
        : orderedReorderableProjects;

      return {
        ...state,
        projects: newProjectsState,
      };
    }

    case 'DELETE_PROJECT_SUCCESS': {
      const projectId = action.payload;
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== projectId),
      };
    }

    case 'ADD_TASK_SUCCESS': {
      const { projectId, task } = action.payload;
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === projectId ? { ...p, tasks: [...p.tasks, task] } : p
        ),
      };
    }

    case 'UPDATE_TASK_SUCCESS': {
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

    case 'DELETE_TASK_SUCCESS': {
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

    case 'UPDATE_TASK_STATUS_SUCCESS': {
        const { projectId, taskId, newStatus } = action.payload;
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
        const newColumn: KanbanColumn = { id: Date.now().toString(), title }; 
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
                    // MUUTOS: Käytetään vakiota
                    ? { ...p, columns: p.columns.filter(c => c.id !== columnId), tasks: p.tasks.map(t => t.column_id === columnId ? { ...t, column_id: KANBAN_COLUMN_IDS.TODO } : t) }
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
