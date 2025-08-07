// src/components/Kanban/KanbanView.tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useApp, useAppServices } from '../../contexts/AppContext';
import { Project, Task, KanbanColumn } from '../../types';
import { BookOpen, ClipboardCheck, Info, AlertCircle, Calendar, Plus, MoreHorizontal, Edit, Trash2, Lock, Inbox, GripVertical, Eye, EyeOff, CheckSquare, Circle } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';
import { v4 as uuidv4 } from 'uuid';

// Komponentit TaskCard, KanbanColumnComponent ja AddColumn pysyvät ennallaan.
// LISÄÄN NE TÄHÄN SELKEYDEN VUOKSI.
const DND_TYPES = {
  TASK: 'task',
  COLUMN: 'column'
};

const TaskCard = ({ task, onDragStart }: { task: Task, onDragStart: (e: React.DragEvent) => void }) => {
  const { dispatch } = useApp();
  
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div
      onClick={() => dispatch({ type: 'TOGGLE_TASK_MODAL', payload: task })}
      draggable
      onDragStart={onDragStart}
      onDragEnd={(e) => e.currentTarget.classList.remove('opacity-50', 'shadow-2xl')}
      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer active:cursor-grabbing"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-800 text-sm">{task.title}</h4>
        {getPriorityIcon(task.priority)}
      </div>
      
      {task.show_description && task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-3">{task.description}</p>
      )}

      {task.show_subtasks && task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-2 space-y-1">
              {task.subtasks.map(subtask => (
                  <div key={subtask.id} className="flex items-center space-x-2 text-xs">
                      {subtask.completed 
                        ? <CheckSquare className="w-3 h-3 text-green-500 flex-shrink-0" /> 
                        : <Circle className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      }
                      <span className={subtask.completed ? 'line-through text-gray-500' : ''}>
                          {subtask.title}
                      </span>
                  </div>
              ))}
          </div>
      )}

      {task.due_date && (
        <div className="flex items-center text-xs text-gray-500 mt-3">
          <Calendar className="w-3 h-3 mr-1.5" />
          <span>{formatDate(new Date(task.due_date))}</span>
        </div>
      )}
    </div>
  );
};

const KanbanColumnComponent = ({ column, tasks, projectId, onDropTask, onDropColumn, onDragStartColumn, isColumnDragged }: { column: KanbanColumn, tasks: Task[], projectId: string, onDropTask: (targetColumnId: string, sourceTaskId: string, sourceColumnId: string, sourceProjectId: string) => void, onDropColumn: (e: React.DragEvent) => void, onDragStartColumn: (e: React.DragEvent) => void, isColumnDragged: boolean }) => {
  const { state, dispatch } = useApp();
  const services = useAppServices();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTaskDraggedOver, setIsTaskDraggedOver] = useState(false);

  const isDefaultColumn = ['todo', 'inProgress', 'done'].includes(column.id);

  const handleUpdate = async () => {
    if (title.trim()) {
      const project = state.projects.find(p => p.id === projectId);
      if (!project) return;
      
      const updatedColumns = project.columns.map(c => c.id === column.id ? { ...c, title: title.trim() } : c);
      await services.updateProject({ ...project, columns: updatedColumns });
      
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Haluatko varmasti poistaa säiliön "${column.title}"? Tämä siirtää kaikki sen sisältämät tehtävät 'Suunnitteilla'-säiliöön.`)) {
      const project = state.projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedColumns = project.columns.filter(c => c.id !== column.id);
      const tasksToMove = project.tasks.filter(t => t.column_id === column.id);
      
      const updatedTasks = project.tasks.map(t => t.column_id === column.id ? { ...t, column_id: 'todo' } : t);

      await services.updateProject({ ...project, columns: updatedColumns, tasks: updatedTasks });
      
      for (const task of tasksToMove) {
        await services.updateTask({ ...task, column_id: 'todo' });
      }
    }
  };
  
  const handleAddTask = () => {
    const newTaskTemplate: Partial<Task> = {
      project_id: projectId,
      column_id: column.id,
    };
    dispatch({ type: 'TOGGLE_TASK_MODAL', payload: newTaskTemplate as Task });
  };
  
  const handleTaskDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('type', DND_TYPES.TASK);
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('sourceColumnId', column.id);
    e.dataTransfer.setData('sourceProjectId', projectId);
    (e.currentTarget as HTMLElement).classList.add('opacity-50', 'shadow-2xl');
  };

  return (
    <div 
        className={`p-3 flex flex-col w-72 flex-shrink-0 rounded-xl transition-colors duration-200 ${isTaskDraggedOver ? 'bg-blue-50' : 'bg-gray-100/60'} ${isColumnDragged ? 'opacity-50' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsTaskDraggedOver(true); }}
        onDragLeave={() => setIsTaskDraggedOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsTaskDraggedOver(false);
          const type = e.dataTransfer.getData('type');
          if (type === DND_TYPES.TASK) {
            const taskId = e.dataTransfer.getData('taskId');
            const sourceColumnId = e.dataTransfer.getData('sourceColumnId');
            const sourceProjectId = e.dataTransfer.getData('sourceProjectId');
            onDropTask(column.id, taskId, sourceColumnId, sourceProjectId);
          } else {
            onDropColumn(e);
          }
        }}
    >
      <div 
        className="flex justify-between items-center mb-2 px-1 cursor-grab active:cursor-grabbing noselect"
        draggable={!isDefaultColumn}
        onDragStart={onDragStartColumn}
      >
        <div className='flex items-center'>
            {!isDefaultColumn && <GripVertical className="w-5 h-5 text-gray-400 mr-1" />}
            {isEditing ? (
              <input
                id={`column-title-editor-${column.id}`}
                name={`column-title-editor-${column.id}`}
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleUpdate}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                className="font-semibold text-gray-800 bg-white border border-blue-400 rounded px-1 -ml-1 w-full"
              />
            ) : (
              <h3 className="font-semibold text-gray-800">{column.title}</h3>
            )}
        </div>

        <div className="relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <ul className="py-1">
                <li><button onClick={() => { setIsEditing(true); setIsMenuOpen(false); }} disabled={isDefaultColumn} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"> {isDefaultColumn ? <Lock className="w-3 h-3 mr-2" /> : <Edit className="w-3 h-3 mr-2" />} Muokkaa </button> </li>
                <li><button onClick={handleDelete} disabled={isDefaultColumn} className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"> {isDefaultColumn ? <Lock className="w-3 h-3 mr-2" /> : <Trash2 className="w-3 h-3 mr-2" />} Poista </button> </li>
              </ul>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-3">
        <button
          onClick={handleAddTask}
          className="w-full flex items-center justify-center p-2 text-sm text-gray-600 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-300"
        >
          <Plus className="w-4 h-4 mr-2" />
          Lisää tehtävä
        </button>
      </div>

      <div className="flex-1 overflow-y-auto -mr-2 pr-2 min-h-[300px] space-y-3">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onDragStart={(e) => handleTaskDragStart(e, task)} />
        ))}
        <div className={`flex items-center justify-center text-xs text-gray-400 p-4 border-2 border-dashed rounded-lg transition-colors ${tasks.length > 0 ? 'border-transparent' : 'border-gray-300 h-full'} ${isTaskDraggedOver ? 'border-blue-400 bg-blue-100/50' : ''}`}>
          {tasks.length === 0 && 'Pudota tehtäviä tähän'}
        </div>
      </div>
    </div>
  );
};

const AddColumn = ({ projectId }: { projectId: string }) => {
    const { state } = useApp();
    const services = useAppServices();
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            const project = state.projects.find(p => p.id === projectId);
            if (!project) {
                alert("Projektia ei löytynyt!");
                return;
            }
            const newColumn: KanbanColumn = { id: uuidv4(), title: title.trim() };
            const updatedProject = { ...project, columns: [...project.columns, newColumn] };

            try {
                await services.updateProject(updatedProject);
                setTitle('');
                setIsEditing(false);
            } catch(err) {
                console.error(err);
                alert("Säiliön luonti epäonnistui.")
            }
        }
    };

    if (!isEditing) {
        return (
            <div className="w-72 flex-shrink-0 p-3">
              <button onClick={() => setIsEditing(true)} className="w-full h-full flex items-center justify-center p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100 hover:border-gray-400 transition-colors">
                  <Plus className="w-4 h-4 mr-2" /> Lisää uusi säiliö
              </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="w-72 flex-shrink-0 p-3 bg-gray-100 rounded-lg">
            <input
              id="new-column-title"
              name="new-column-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Säiliön nimi..."
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            <div className="mt-2 space-x-2">
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Lisää</button>
                <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1 text-sm rounded hover:bg-gray-200">Peruuta</button>
            </div>
        </form>
    );
};


export default function KanbanView() {
  const { state, dispatch } = useApp();
  const services = useAppServices();
  const { projects, selectedKanbanProjectId } = state;
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [showDefaultColumns, setShowDefaultColumns] = useState(true);

  // Käytetään useMemo-hookia, jotta listat eivät luoda uudelleen jokaisella renderöinnillä
  const courses = useMemo(() => projects.filter(p => p.type === 'course'), [projects]);
  const otherProjects = useMemo(() => projects.filter(p => p.type !== 'course' && p.id !== GENERAL_TASKS_PROJECT_ID), [projects]);
  const generalProject = useMemo(() => projects.find(p => p.id === GENERAL_TASKS_PROJECT_ID), [projects]);

  const dragItem = useRef<string | null>(null);
  const dragOverItem = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedKanbanProjectId && projects.length > 0) {
      const defaultProject = generalProject ? generalProject.id : projects[0].id;
      dispatch({ type: 'SET_KANBAN_PROJECT', payload: defaultProject });
    }
  }, [projects, selectedKanbanProjectId, dispatch, generalProject]);

  const selectedProject = projects.find(p => p.id === selectedKanbanProjectId);

  const handleSelectProject = (projectId: string) => {
    dispatch({ type: 'SET_KANBAN_PROJECT', payload: projectId });
  };
  
  // --- KORJATTU KOHTA ALKAA ---
  const handleProjectDragStart = (e: React.DragEvent<HTMLLIElement>, projectId: string) => {
    dragItem.current = projectId;
    e.currentTarget.classList.add('bg-gray-200');
  };

  const handleProjectDragEnter = (e: React.DragEvent<HTMLLIElement>, projectId: string) => {
    dragOverItem.current = projectId;
  };

  const handleProjectDrop = async () => {
    if (!dragItem.current || !dragOverItem.current || dragItem.current === dragOverItem.current) return;

    // Yhdistetään kurssit ja muut projektit yhteen muokattavaan listaan
    const reorderableProjects = [...courses, ...otherProjects];
    const dragItemIndex = reorderableProjects.findIndex(p => p.id === dragItem.current);
    const dragOverItemIndex = reorderableProjects.findIndex(p => p.id === dragOverItem.current);

    const [draggedItemContent] = reorderableProjects.splice(dragItemIndex, 1);
    reorderableProjects.splice(dragOverItemIndex, 0, draggedItemContent);
    
    // Kutsutaan palvelua tallentamaan uusi järjestys
    await services.updateProjectOrder(reorderableProjects);

    dragItem.current = null;
    dragOverItem.current = null;
  };
  
  const handleProjectDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
    e.currentTarget.classList.remove('bg-gray-200');
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const renderProjectList = (title: string, items: Project[], icon: React.ReactNode) => (
    <div onDragOver={(e) => e.preventDefault()}>
      <h3 className="text-sm font-semibold text-gray-500 uppercase px-4 mt-6 mb-2 flex items-center"> {icon} <span className="ml-2">{title}</span> </h3>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={item.id}
              draggable
              onDragStart={(e) => handleProjectDragStart(e, item.id)}
              onDragEnter={(e) => handleProjectDragEnter(e, item.id)}
              onDragEnd={handleProjectDragEnd}
              onDrop={handleProjectDrop}
              className="cursor-grab active:cursor-grabbing"
          >
            <button onClick={() => handleSelectProject(item.id)} className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors flex items-center ${ selectedKanbanProjectId === item.id ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-gray-700 hover:bg-gray-100' }`} >
              <span className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: item.color }}></span>
              {item.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
  // --- KORJATTU KOHTA PÄÄTTYY ---
  
  // Vanhat Kanban-sarakkeiden ja tehtävien käsittelijät pysyvät ennallaan...
  // (Kopioitu alle selkeyden vuoksi)
  const getTasksForColumn = (columnId: string) => {
    if (!selectedProject) return [];
    const tasksInColumn = selectedProject.tasks.filter(t => (t.column_id || 'todo') === columnId);
    return tasksInColumn;
  };
  
  const handleColumnDragStart = (e: React.DragEvent, index: number) => {
      e.dataTransfer.setData('type', DND_TYPES.COLUMN);
      e.dataTransfer.setData('sourceColumnIndex', String(index));
      setDraggedColumnIndex(index);
  }

  const handleColumnDrop = async (e: React.DragEvent, targetIndex: number) => {
    if (!selectedProject || draggedColumnIndex === null) return;
    
    const reorderedColumns = Array.from(selectedProject.columns);
    const [removed] = reorderedColumns.splice(draggedColumnIndex, 1);
    reorderedColumns.splice(targetIndex, 0, removed);
    
    await services.updateProject({ ...selectedProject, columns: reorderedColumns });
    
    setDraggedColumnIndex(null);
  };

  const handleTaskDrop = async (targetColumnId: string, sourceTaskId: string, sourceColumnId: string, sourceProjectId: string) => {
    if (!selectedProject || sourceProjectId !== selectedProject.id) return;
    
    const task = selectedProject.tasks.find(t => t.id === sourceTaskId);
    if (!task) return;

    if (sourceColumnId === targetColumnId) {
      // Ei toiminnallisuutta sarakkeen sisäiselle raahaukselle vielä
    } else {
      const isCompleted = targetColumnId === 'done';
      if (task.completed !== isCompleted || task.column_id !== targetColumnId) {
        const updatedTask = { ...task, column_id: targetColumnId, completed: isCompleted };
        try {
          await services.updateTask(updatedTask);
        } catch(err: any) {
            console.error("Failed to update task:", err);
        }
      }
    }
  };

  const handleInfoButtonClick = () => {
    if (selectedProject && selectedProject.id !== GENERAL_TASKS_PROJECT_ID) {
      if (selectedProject.type === 'course') {
        dispatch({ type: 'TOGGLE_COURSE_MODAL', payload: { id: selectedProject.id } });
      } else {
        dispatch({ type: 'TOGGLE_PROJECT_MODAL', payload: selectedProject.id });
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <aside className="hidden md:block w-1/6 min-w-[180px] bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800">Työtilat</h2>
            {generalProject && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase px-4 mt-6 mb-2 flex items-center"><Inbox className="w-4 h-4" /> <span className="ml-2">Yleiset</span></h3>
                <ul className="space-y-1">
                  <li>
                    <button onClick={() => handleSelectProject(generalProject.id)} className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors flex items-center ${ selectedKanbanProjectId === generalProject.id ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-gray-700 hover:bg-gray-100' }`} >
                      <span className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: generalProject.color }}></span>
                      {generalProject.name}
                    </button>
                  </li>
                </ul>
              </div>
            )}
            {renderProjectList('Kurssit', courses, <BookOpen className="w-4 h-4" />)}
            {renderProjectList('Projektit', otherProjects, <ClipboardCheck className="w-4 h-4" />)}
        </aside>

        <main className="flex-1 p-4 md:p-6 flex flex-col min-w-0">
            <div className="md:hidden mb-4">
              <label htmlFor="kanban-project-select" className="block text-sm font-medium text-gray-700 mb-1">
                Valitse työtila
              </label>
              <select
                id="kanban-project-select"
                value={selectedKanbanProjectId || ''}
                onChange={(e) => handleSelectProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                {generalProject && (
                  <optgroup label="Yleiset">
                    <option value={generalProject.id}>{generalProject.name}</option>
                  </optgroup>
                )}
                {courses.length > 0 && (
                  <optgroup label="Kurssit">
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </optgroup>
                )}
                {otherProjects.length > 0 && (
                  <optgroup label="Projektit">
                    {otherProjects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {selectedProject ? (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6 flex-shrink-0">
                  <h1 className="text-2xl font-bold text-gray-900 truncate pr-4">{selectedProject.name}</h1>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setShowDefaultColumns(s => !s)} 
                      className="flex-shrink-0 flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md"
                      title={showDefaultColumns ? 'Piilota oletussäiliöt' : 'Näytä oletussäiliöt'}
                    >
                      {showDefaultColumns ? <EyeOff className="w-4 h-4 mr-0 md:mr-2" /> : <Eye className="w-4 h-4 mr-0 md:mr-2" />}
                      <span className="hidden md:inline">{showDefaultColumns ? 'Piilota oletussäiliöt' : 'Näytä oletussäiliöt'}</span>
                    </button>
                    {selectedProject.id !== GENERAL_TASKS_PROJECT_ID && (
                      <button onClick={handleInfoButtonClick} className="flex-shrink-0 flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md">
                        <Info className="w-4 h-4 mr-0 md:mr-2" /> <span className="hidden md:inline">Muokkaa</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex gap-6 overflow-x-auto" onDragEnd={() => setDraggedColumnIndex(null)}>
                  {selectedProject.columns
                    ?.filter(column => showDefaultColumns || !['todo', 'inProgress', 'done'].includes(column.id))
                    .map((column, index) => (
                      <div key={column.id}>
                        <KanbanColumnComponent 
                          column={column} 
                          tasks={getTasksForColumn(column.id)} 
                          projectId={selectedProject.id}
                          onDropTask={handleTaskDrop}
                          onDropColumn={(e) => handleColumnDrop(e, index)}
                          onDragStartColumn={(e) => handleColumnDragStart(e, index)}
                          isColumnDragged={draggedColumnIndex === index}
                        />
                      </div>
                  ))}
                  <AddColumn projectId={selectedProject.id} />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Valitse työtila yllä olevasta valikosta.</p>
              </div>
            )}
        </main>
    </div>
  );
}
