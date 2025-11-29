// src/components/Tasks/TaskList.tsx
import React, { useMemo } from 'react';
import { useApp, useAppServices } from '../../contexts/AppContext'; 
import { CheckSquare, Circle, Calendar, AlertCircle, Plus, Pencil } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { Task } from '../../types';
import { KANBAN_COLUMN_IDS } from '../../constants/kanbanConstants';

export default function TaskList() {
  const { state, dispatch } = useApp();
  const services = useAppServices();
  const { projects } = state;

  const allTasks = useMemo(() => projects.flatMap(project => 
    project.tasks.map(task => ({
      ...task,
      client_project_id: project.id, 
      project_name: project.name,
      project_color: project.color
    }))
  ), [projects]);

  const completedTasks = useMemo(() => allTasks.filter(task => task.completed), [allTasks]);
  const pendingTasks = useMemo(() => allTasks.filter(task => !task.completed), [allTasks]);

  // KORJATTU: Avaa nyt Details-modaalin (katselu)
  const handleTaskClick = (taskWithProjectInfo: Task & { client_project_id: string, project_name: string, project_color: string }) => {
    const { client_project_id, project_name, project_color, ...originalTask } = taskWithProjectInfo;
    dispatch({ type: 'TOGGLE_TASK_DETAILS_MODAL', payload: originalTask as Task });
  };

  // Suora muokkaus kynä-ikonista
  const handleEditClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    // Poistetaan ylimääräiset kentät jos niitä on tarttunut mukaan
    const { client_project_id, project_name, project_color, ...cleanTask } = task as any;
    dispatch({ type: 'TOGGLE_TASK_MODAL', payload: cleanTask });
  };

  const toggleTask = (e: React.MouseEvent, clientProjectId: string, taskId: string, completed: boolean) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === clientProjectId);
    const task = project?.tasks.find(t => t.id === taskId);
    
    if (task) {
      const newColumnId = completed ? KANBAN_COLUMN_IDS.DONE : KANBAN_COLUMN_IDS.TODO;
      services.updateTask({ ...task, completed, column_id: newColumnId }).catch((err: any) => {
        console.error("Failed to toggle task:", err);
      });
    }
  };
  
  const toggleSubtask = (e: React.MouseEvent, clientProjectId: string, taskId: string, subtaskId: string, completed: boolean) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === clientProjectId);
    const task = project?.tasks.find(t => t.id === taskId);

    if (task && task.subtasks) {
      const updatedSubtasks = task.subtasks.map(st =>
        st.id === subtaskId ? { ...st, completed } : st
      );
      const updatedTask = { ...task, subtasks: updatedSubtasks };
      
      services.updateTask(updatedTask).catch((err: any) => {
          console.error("Failed to toggle subtask:", err);
      });
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tehtävät</h1>
          <p className="text-gray-600 mt-2"> {pendingTasks.length} odottaa • {completedTasks.length} valmiina </p>
        </div>
        <button onClick={() => dispatch({ type: 'TOGGLE_TASK_MODAL' })} className="btn-glossy flex items-center" >
          <Plus className="w-4 h-4 mr-2" /> Uusi tehtävä
        </button>
      </div>
      <div className="space-y-8 mt-8">
        {pendingTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900"> Odottaa ({pendingTasks.length}) </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {pendingTasks.map((task) => (
                <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => handleTaskClick(task)}>
                  <div className="flex items-start space-x-4">
                    <button onClick={(e) => toggleTask(e, task.client_project_id, task.id, true)} className="mt-1 text-gray-400 hover:text-blue-600 transition-colors z-10 relative">
                      <Circle className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          {getPriorityIcon(task.priority)}
                        </div>
                        <button 
                            onClick={(e) => handleEditClick(e, task)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                            title="Muokkaa tehtävää"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                      {task.description && (<p className="text-sm text-gray-600 mb-2">{task.description}</p>)}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                          {task.subtasks.map(subtask => (
                            <div key={subtask.id} className="flex items-center space-x-2">
                              <input type="checkbox" checked={subtask.completed} onChange={(e) => toggleSubtask(e, task.client_project_id, task.id, subtask.id, !subtask.completed)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 z-10 relative" />
                              <span className={`text-sm ${subtask.completed ? 'line-through text-gray-500' : ''}`}> {subtask.title} </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                        <div className="flex items-center space-x-1"> <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project_color }} /> <span>{task.project_name}</span> </div>
                        {task.due_date && ( <div className="flex items-center space-x-1"> <Calendar className="w-4 h-4" /> <span>Määräaika {formatDate(new Date(task.due_date))}</span> </div> )}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${ task.priority === 'high' ? 'bg-red-100 text-red-800' : task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800' }`}> {task.priority} </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {completedTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900"> Valmiit ({completedTasks.length}) </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {completedTasks.map((task) => (
                <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors opacity-60 cursor-pointer" onClick={() => handleTaskClick(task)}>
                  <div className="flex items-start space-x-4">
                    <button onClick={(e) => toggleTask(e, task.client_project_id, task.id, false)} className="mt-1 text-green-600 hover:text-gray-400 transition-colors z-10 relative">
                      <CheckSquare className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2"> <h3 className="font-medium text-gray-900 line-through">{task.title}</h3> </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1"> <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project_color }} /> <span>{task.project_name}</span> </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {allTasks.length === 0 && (
          <div className="text-center py-12">
            <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ei tehtäviä vielä</h3>
            <p className="text-gray-600">Tehtävät ilmestyvät tänne, kun lisäät niitä projekteihisi</p>
          </div>
        )}
      </div>
    </div>
  );
}
