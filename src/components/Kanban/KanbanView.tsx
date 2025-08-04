// src/components/Kanban/KanbanView.tsx
import React, { useEffect, useState } from 'react';
import { useApp, useAppServices } from '../../contexts/AppContext'; // KORJATTU
import { Project, Task, KanbanColumn } from '../../types';
import { BookOpen, ClipboardCheck, Info, AlertCircle, Calendar, ChevronDown, Plus, MoreHorizontal, Edit, Trash2, Lock, Inbox, GripVertical } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';

// ... TaskCard- ja KanbanColumnComponent-komponentit pysyvät samoina ...
// ... AddColumn-komponentti pysyy samana ...

const DND_TYPES = {
  TASK: 'task',
  COLUMN: 'column'
};

const TaskCard = ({ task, onClick }: { task: Task, onClick: () => void }) => {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('type', DND_TYPES.TASK);
        e.dataTransfer.setData('taskId', task.id);
        e.dataTransfer.setData('projectId', task.project_id);
        e.currentTarget.classList.add('opacity-50');
      }}
      onDragEnd={(e) => e.currentTarget.classList.remove('opacity-50')}
      className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer active:cursor-grabbing"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-800 text-sm">{task.title}</h4>
        {getPriorityIcon(task.priority)}
      </div>
      {task.description && <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>}
      {task.due_date && (
        <div className="flex items-center text-xs text-gray-500">
          <Calendar className="w-3 h-3 mr-1.5" />
          <span>{formatDate(new Date(task.due_date))}</span>
        </div>
      )}
    </div>
  );
};

const KanbanColumnComponent = ({ column, tasks, projectId, isTaskDraggedOver, onDragStart, onDropColumn, isColumnDragged }: { column: KanbanColumn, tasks: Task[], projectId: string, isTaskDraggedOver: boolean, onDragStart: (e: React.DragEvent) => void, onDropColumn: (e: React.DragEvent) => void, isColumnDragged: boolean }) => {
  const { dispatch } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isDefaultColumn = ['todo', 'inProgress', 'done'].includes(column.id);

  const handleUpdate = () => {
    if (title.trim()) {
      dispatch({ type: 'UPDATE_COLUMN', payload: { projectId, column: { ...column, title } } });
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (confirm(`Haluatko varmasti poistaa säiliön "${column.title}"? Tämä poistaa myös kaikki sen sisältämät tehtävät.`)) {
      dispatch({ type: 'DELETE_COLUMN', payload: { projectId, columnId: column.id } });
    }
  };
  
  const handleAddTask = () => {
    const newTaskTemplate: Partial<Task> = {
      project_id: projectId,
      column_id: column.id,
    };
    dispatch({ type: 'TOGGLE_TASK_MODAL', payload: newTaskTemplate as Task });
  };
  
  return (
    <div 
        className={`p-3 flex flex-col w-72 flex-shrink-0 rounded-xl transition-colors duration-200 ${isTaskDraggedOver ? 'bg-blue-50' : 'bg-gray-100/60'} ${isColumnDragged ? 'opacity-50' : ''}`}
        onDrop={onDropColumn}
    >
      <div 
        className="flex justify-between items-center mb-2 px-1 cursor-grab active:cursor-grabbing noselect"
        draggable={!isDefaultColumn}
        onDragStart={onDragStart}
      >
        <div className='flex items-center'>
            {!isDefaultColumn && <GripVertical className="w-5 h-5 text-gray-400 mr-1" />}
            {isEditing ? (
              <input
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
          <TaskCard key={task.id} task={task} onClick={() => dispatch({ type: 'TOGGLE_TASK_MODAL', payload: task })} />
        ))}
        <div className={`flex items-center justify-center text-xs text-gray-400 p-4 border-2 border-dashed rounded-lg transition-colors ${tasks.length > 0 ? 'border-gray-300' : 'border-gray-300 h-full'} ${isTaskDraggedOver ? 'border-blue-400 bg-blue-100/50' : ''}`}>
          Pudota tehtäviä tähän
        </div>
      </div>
    </div>
  );
};

const AddColumn = ({ projectId }: { projectId: string }) => {
    const { dispatch } = useApp();
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            dispatch({ type: 'ADD_COLUMN', payload: { projectId, title } });
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


export default function KanbanView() {
  const { state, dispatch } = useApp();
  const services = useAppServices(); // KORJATTU
  const { projects, selectedKanbanProjectId } = state;
  const [draggedItem, setDraggedItem] = useState<{type: string, id: string} | null>(null);
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);

  const generalProject = projects.find(p => p.id === GENERAL_TASKS_PROJECT_ID);
  const courses = projects.filter(p => p.type === 'course');
  const otherProjects = projects.filter(p => p.type !== 'course' && p.id !== GENERAL_TASKS_PROJECT_ID);

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
  
  // ... renderProjectList pysyy samana ...
  const renderProjectList = (title: string, items: Project[], icon: React.ReactNode) => (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase px-4 mt-6 mb-2 flex items-center"> {icon} <span className="ml-2">{title}</span> </h3>
      <ul className="space-y-1">
        {items.map(item => (
          <li key={item.id}>
            <button onClick={() => handleSelectProject(item.id)} className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors flex items-center ${ selectedKanbanProjectId === item.id ? 'bg-blue-100 text-blue-800 font-semibold' : 'text-gray-700 hover:bg-gray-100' }`} >
              <span className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: item.color }}></span>
              {item.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const getTasksForColumn = (columnId: string) => {
    if (!selectedProject) return [];
    if (columnId === 'todo') {
      return selectedProject.tasks.filter(t => t.column_id === 'todo' || !t.column_id);
    }
    return selectedProject.tasks.filter(t => t.column_id === columnId);
  };
  
  const handleDragStart = (e: React.DragEvent, type: string, id: string, index?: number) => {
      e.dataTransfer.setData('type', type);
      e.dataTransfer.setData('id', id);
      if(type === DND_TYPES.COLUMN && index !== undefined) {
          setDraggedColumnIndex(index);
      }
      setDraggedItem({type, id});
  }

  const handleDrop = (e: React.DragEvent, targetColumnId: string, targetColumnIndex: number) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');

    if (type === DND_TYPES.TASK) {
      const taskId = e.dataTransfer.getData('taskId');
      const projectId = e.dataTransfer.getData('projectId');
      if (taskId && projectId) {
        // KORJATTU: Käytetään service-funktiota
        services.updateTaskStatus(projectId, taskId, targetColumnId).catch((err: any) => {
            console.error("Failed to update task status:", err);
            // Tässä voisi näyttää virheilmoituksen käyttäjälle
        });
      }
    } else if (type === DND_TYPES.COLUMN && selectedProject && draggedColumnIndex !== null) {
        dispatch({
            type: 'REORDER_COLUMNS',
            payload: { projectId: selectedProject.id, startIndex: draggedColumnIndex, endIndex: targetColumnIndex }
        })
    }
    setDraggedItem(null);
    setDraggedColumnIndex(null);
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
        {/* Sivupalkki ja pääsisältö pysyvät ennallaan */}
        <aside className="hidden md:block w-1/6 min-w-[180px] bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800">Työtilat</h2>
            {generalProject && renderProjectList('Yleiset', [generalProject], <Inbox className="w-4 h-4" />)}
            {renderProjectList('Kurssit', courses, <BookOpen className="w-4 h-4" />)}
            {renderProjectList('Projektit', otherProjects, <ClipboardCheck className="w-4 h-4" />)}
        </aside>
        <main className="flex-1 p-4 md:p-6 flex flex-col min-w-0">
            {selectedProject ? (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6 flex-shrink-0">
                  <h1 className="hidden md:block text-2xl font-bold text-gray-900">{selectedProject.name}</h1>
                  {selectedProject.id !== GENERAL_TASKS_PROJECT_ID && (
                    <button onClick={handleInfoButtonClick} className="flex items-center text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md">
                      <Info className="w-4 h-4 mr-2" /> <span className="hidden md:inline">Muokkaa tietoja</span>
                    </button>
                  )}
                </div>
                <div className="flex-1 flex gap-6 overflow-x-auto">
                  {selectedProject.columns?.map((column, index) => (
                    <div key={column.id} onDragOver={(e) => { e.preventDefault(); if(draggedItem?.type === DND_TYPES.TASK) setDraggedItem({type: DND_TYPES.TASK, id: column.id})}} onDragLeave={() => setDraggedItem(null)} onDragEnd={() => {setDraggedItem(null); setDraggedColumnIndex(null)}}>
                      <KanbanColumnComponent column={column} tasks={getTasksForColumn(column.id)} projectId={selectedProject.id} isTaskDraggedOver={draggedItem?.type === DND_TYPES.TASK && draggedItem.id === column.id} isColumnDragged={draggedColumnIndex === index} onDragStart={(e) => handleDragStart(e, DND_TYPES.COLUMN, column.id, index)} onDropColumn={(e) => handleDrop(e, column.id, index)} />
                    </div>
                  ))}
                  <AddColumn projectId={selectedProject.id} />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Valitse työtila vasemmalta.</p>
              </div>
            )}
        </main>
    </div>
  );
}
