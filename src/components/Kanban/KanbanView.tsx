// src/components/Kanban/KanbanView.tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useApp, useAppServices } from '../../contexts/AppContext';
import { Project, Task, KanbanColumn } from '../../types';
import { BookOpen, ClipboardCheck, Info, AlertCircle, Calendar, Plus, MoreHorizontal, Edit, Trash2, Lock, Inbox, GripVertical, Eye, EyeOff, CheckSquare, Circle, Pencil } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_COLUMN_ID_ARRAY } from '../../constants/kanbanConstants';
import KanbanSidebarProjectList from './KanbanSidebarProjectList';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, arrayMove, useSortable, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Sortable Components ---

const SortableTaskCard = ({ task }: { task: Task }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard task={task} dragHandleListeners={listeners} />
    </div>
  );
};

const SortableKanbanColumn = ({ column, tasks, projectId, isOver }: { column: KanbanColumn, tasks: Task[], projectId: string, isOver: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);
  
  return (
    <div ref={setNodeRef} style={style} className="flex-shrink-0">
      <KanbanColumnComponent column={column} tasks={tasks} projectId={projectId} dragHandleProps={{...attributes, ...listeners}} isOver={isOver}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </KanbanColumnComponent>
    </div>
  );
};

// --- Original Components (slightly modified) ---

const TaskCard = ({ task, dragHandleListeners }: { task: Task, dragHandleListeners?: any }) => {
  const { dispatch } = useApp();
  
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_TASK_DETAILS_MODAL', payload: task });
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_TASK_MODAL', payload: task });
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer group relative hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-800 text-sm flex-1 mr-6">{task.title}</h4>
        
        <button 
            onClick={handleEditClick}
            className="absolute top-2 right-8 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Muokkaa"
        >
            <Pencil className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center space-x-2">
            {getPriorityIcon(task.priority)}
            <div {...dragHandleListeners} className="cursor-grab active:cursor-grabbing p-1">
                <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
        </div>
      </div>
      
      {task.show_description && task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-3">{task.description}</p>
      )}

      {task.show_subtasks && task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-2 space-y-2">
              {task.subtasks.map(subtask => (
                  <div 
                      key={subtask.id} 
                      className="flex items-center space-x-2 text-xs"
                  >
                      {subtask.completed 
                        ? <CheckSquare className="w-3 h-3 text-green-500 flex-shrink-0" /> 
                        : <Circle className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      }
                      <span className={`flex-1 ${subtask.completed ? 'line-through text-gray-500' : ''}`}>
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

const KanbanColumnComponent = ({ column, tasks, projectId, children, dragHandleProps, isOver }: { column: KanbanColumn, tasks: Task[], projectId: string, children: React.ReactNode, dragHandleProps: any, isOver: boolean }) => {
  const { state, dispatch } = useApp();
  const services = useAppServices();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);
  
  const isDefaultColumn = DEFAULT_COLUMN_ID_ARRAY.includes(column.id);

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
      const updatedTasks = project.tasks.map(t => t.column_id === column.id ? { ...t, column_id: 'todo' } : t);
      await services.updateProject({ ...project, columns: updatedColumns, tasks: updatedTasks });
    }
  };
  
  const handleAddTask = () => {
    dispatch({ type: 'TOGGLE_TASK_MODAL', payload: { project_id: projectId, column_id: column.id } as Task });
  };
  
  return (
    <div className={`p-3 flex flex-col w-72 flex-shrink-0 rounded-xl h-full transition-colors ${isOver ? 'bg-blue-100' : 'bg-gray-100/60'}`}>
      <div 
        className="flex justify-between items-center mb-2 px-1 noselect"
      >
        <div className='flex items-center' {...dragHandleProps}>
            {!isDefaultColumn && <GripVertical className="w-5 h-5 text-gray-400 mr-1 cursor-grab active:cursor-grabbing" />}
            {isEditing ? (
              <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} onBlur={handleUpdate} onKeyDown={(e) => e.key === 'Enter' && handleUpdate()} className="font-semibold text-gray-800 bg-white border border-blue-400 rounded px-1 -ml-1 w-full" />
            ) : (
              <h3 className="font-semibold text-gray-800">{column.title}</h3>
            )}
        </div>

        <div className="relative" ref={menuRef}>
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
        <button onClick={handleAddTask} className="w-full flex items-center justify-center p-2 text-sm text-gray-600 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-300">
          <Plus className="w-4 h-4 mr-2" /> Lisää tehtävä
        </button>
      </div>
      <div className="flex-1 overflow-y-auto -mr-2 pr-2 min-h-[300px] space-y-3">
        {children}
        <div className={`flex items-center justify-center text-xs text-gray-400 p-4 border-2 border-dashed rounded-lg transition-colors ${tasks.length > 0 ? 'border-transparent' : 'border-gray-300 h-full'}`}>
          {tasks.length === 0 && 'Ei tehtäviä'}
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
            if (!project) return;
            const newColumn: KanbanColumn = { id: uuidv4(), title: title.trim() };
            const updatedProject = { ...project, columns: [...project.columns, newColumn] };
            await services.updateProject(updatedProject);
            setTitle('');
            setIsEditing(false);
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
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Säiliön nimi..." className="w-full p-2 border border-gray-300 rounded-md" />
            <div className="mt-2 space-x-2">
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Lisää</button>
                <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1 text-sm rounded hover:bg-gray-200">Peruuta</button>
            </div>
        </form>
    );
};

// --- Main View Component ---

export default function KanbanView() {
  const { state, dispatch } = useApp();
  const services = useAppServices();
  const { projects, selectedKanbanProjectId } = state;
  const [showDefaultColumns, setShowDefaultColumns] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  
  const courses = useMemo(() => projects.filter(p => p.type === 'course'), [projects]);
  const otherProjects = useMemo(() => projects.filter(p => p.type !== 'course' && p.id !== GENERAL_TASKS_PROJECT_ID), [projects]);
  const generalProject = useMemo(() => projects.find(p => p.id === GENERAL_TASKS_PROJECT_ID), [projects]);

  // UUSI: Lista kaikista järjesteltävistä projekteista
  const reorderableProjects = useMemo(() => 
    projects.filter(p => p.id !== GENERAL_TASKS_PROJECT_ID), 
    [projects]
  );
  
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
  
  const getTasksForColumn = (columnId: string) => {
    if (!selectedProject) return [];
    return selectedProject.tasks
      .filter(t => (t.column_id || 'todo') === columnId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
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
  
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };
  
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
        setOverColumnId(null);
        return;
    }
    const overId = String(over.id);
    const isOverColumn = selectedProject?.columns.some(c => c.id === overId);
    if (isOverColumn) {
        setOverColumnId(overId);
    } else {
        const containerId = over.data.current?.sortable?.containerId;
        if (containerId) {
            setOverColumnId(String(containerId));
        }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setOverColumnId(null);

    const { active, over } = event;
    if (!over || !selectedProject) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    // KORJATTU JA LAAJENNETTU LOGIIKKA
    const activeIsProject = reorderableProjects.some(p => p.id === activeId);
    const overIsProject = reorderableProjects.some(p => p.id === overId);

    if (activeIsProject && overIsProject) {
        const oldIndex = reorderableProjects.findIndex(p => p.id === activeId);
        const newIndex = reorderableProjects.findIndex(p => p.id === overId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(reorderableProjects, oldIndex, newIndex);
            dispatch({ type: 'UPDATE_PROJECTS_ORDER_SUCCESS', payload: newOrder });
            await services.updateProjectOrder(newOrder);
        }
        return;
    }

    const activeIsColumn = selectedProject.columns.some(c => c.id === activeId);
    if (activeIsColumn) {
        const oldIndex = selectedProject.columns.findIndex(c => c.id === activeId);
        const newIndex = selectedProject.columns.findIndex(c => c.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedColumns = arrayMove(selectedProject.columns, oldIndex, newIndex);
            await services.updateProject({ ...selectedProject, columns: reorderedColumns });
        }
        return;
    }

    const activeTask = selectedProject.tasks.find(t => t.id === activeId);
    if (activeTask) {
        let newTasks = [...selectedProject.tasks];
        const oldIndex = newTasks.findIndex(t => t.id === activeId);
        let newIndex = newTasks.findIndex(t => t.id === overId);

        const sourceColumnId = active.data.current?.sortable.containerId;
        const overIsAColumn = selectedProject.columns.some(c => c.id === overId);
        const destinationColumnId = overIsAColumn ? overId : over.data.current?.sortable.containerId;
        
        if (!sourceColumnId || !destinationColumnId) return;
        
        if (sourceColumnId !== destinationColumnId) {
            const isCompleted = destinationColumnId === 'done';
            newTasks[oldIndex] = { ...newTasks[oldIndex], column_id: destinationColumnId, completed: isCompleted };
        }
        
        if (newIndex !== -1) {
            newTasks = arrayMove(newTasks, oldIndex, newIndex);
        } else {
            const tasksInDestColumn = newTasks.filter(t => t.column_id === destinationColumnId && t.id !== activeId);
            const lastTaskInColumn = tasksInDestColumn[tasksInDestColumn.length - 1];
            const newIndexAfterLast = lastTaskInColumn ? newTasks.findIndex(t => t.id === lastTaskInColumn.id) + 1 : oldIndex;
            newTasks = arrayMove(newTasks, oldIndex, newIndexAfterLast);
        }
        
        const tasksWithUpdatedOrder = newTasks.map((task, index) => ({ ...task, order_index: index }));

        dispatch({ type: 'REORDER_TASKS_SUCCESS', payload: { projectId: selectedProject.id, tasks: tasksWithUpdatedOrder }});
        
        try {
            const tasksToUpdateInDB = tasksWithUpdatedOrder.map(
              ({ id, title, description, completed, column_id, priority, due_date, project_id, subtasks, files, show_description, show_subtasks, order_index }) => ({
                id, title, description, completed, column_id, priority, due_date, project_id, subtasks, files, show_description, show_subtasks, order_index
              })
            );
            await services.updateTasksOrder(tasksToUpdateInDB);
        } catch (error) {
            console.error("Failed to save new task order:", error);
        }
    }
  };

  const isDraggingTask = activeId && selectedProject?.tasks.some(t => t.id === activeId);

  return (
    <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { setActiveId(null); setOverColumnId(null); }}
    >
      <div className="flex flex-col md:flex-row h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <aside className="hidden md:block w-1/6 min-w-[220px] bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-800 px-2">Työtilat</h2>
              {generalProject && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase px-4 mt-6 mb-2 flex items-center"><Inbox className="w-4 h-4" /> <span className="ml-2">Yleiset</span></h3>
                  <ul className="space-y-1 px-2">
                    <li>
                      <button onClick={() => handleSelectProject(generalProject.id)} className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors flex items-center ${ selectedKanbanProjectId === generalProject.id ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-gray-700 hover:bg-gray-100' }`} >
                        <span className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: generalProject.color }}></span>
                        {generalProject.name}
                      </button>
                    </li>
                  </ul>
                </div>
              )}
              {/* LISÄTTY SortableContext-KÄÄRE */}
              <SortableContext items={reorderableProjects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <KanbanSidebarProjectList
                    title="Kurssit"
                    items={courses}
                    icon={<BookOpen className="w-4 h-4" />}
                    selectedKanbanProjectId={selectedKanbanProjectId}
                    handleSelectProject={handleSelectProject}
                />
                <KanbanSidebarProjectList
                    title="Projektit"
                    items={otherProjects}
                    icon={<ClipboardCheck className="w-4 h-4" />}
                    selectedKanbanProjectId={selectedKanbanProjectId}
                    handleSelectProject={handleSelectProject}
                />
              </SortableContext>
          </aside>

          <main className="flex-1 p-4 md:p-6 flex flex-col min-w-0">
              <div className="md:hidden mb-4">
                <label htmlFor="kanban-project-select" className="block text-sm font-medium text-gray-700 mb-1">Valitse työtila</label>
                <select id="kanban-project-select" value={selectedKanbanProjectId || ''} onChange={(e) => handleSelectProject(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                  {generalProject && <optgroup label="Yleiset"><option value={generalProject.id}>{generalProject.name}</option></optgroup>}
                  {courses.length > 0 && <optgroup label="Kurssit">{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                  {otherProjects.length > 0 && <optgroup label="Projektit">{otherProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>}
                </select>
              </div>

              {selectedProject ? (
                <>
                  <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6 flex-shrink-0">
                    <h1 className="text-2xl font-bold text-gray-900 truncate pr-4">{selectedProject.name}</h1>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => setShowDefaultColumns(s => !s)} className="flex-shrink-0 flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md" title={showDefaultColumns ? 'Piilota oletussäiliöt' : 'Näytä oletussäiliöt'}>
                        {showDefaultColumns ? <Eye className="w-4 h-4 mr-0 md:mr-2" /> : <EyeOff className="w-4 h-4 mr-0 md:mr-2" />}
                        <span className="hidden md:inline">{showDefaultColumns ? 'Piilota' : 'Näytä'} oletukset</span>
                      </button>
                      {selectedProject.id !== GENERAL_TASKS_PROJECT_ID && (
                        <button onClick={handleInfoButtonClick} className="flex-shrink-0 flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md">
                          <Info className="w-4 h-4 mr-0 md:mr-2" /> <span className="hidden md:inline">Muokkaa</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 flex gap-6 overflow-x-auto">
                    <SortableContext items={selectedProject.columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                      {selectedProject.columns
                        .filter(column => showDefaultColumns || !DEFAULT_COLUMN_ID_ARRAY.includes(column.id))
                        .map((column) => (
                          <SortableKanbanColumn
                            key={column.id}
                            column={column}
                            tasks={getTasksForColumn(column.id)}
                            projectId={selectedProject.id}
                            isOver={isDraggingTask && overColumnId === column.id}
                          />
                      ))}
                    </SortableContext>
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
    </DndContext>
  );
}
