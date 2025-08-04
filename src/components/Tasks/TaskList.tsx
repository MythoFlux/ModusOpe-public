// src/components/Tasks/TaskList.tsx
import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { CheckSquare, Circle, Calendar, AlertCircle, Plus } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { Task } from '../../types';

export default function TaskList() {
  const { state, dispatch } = useApp();
  const { projects } = state;

  const allTasks = useMemo(() => projects.flatMap(project => 
    project.tasks.map(task => ({
      ...task,
      projectName: project.name,
      projectColor: project.color
    }))
  ), [projects]);

  const completedTasks = useMemo(() => allTasks.filter(task => task.completed), [allTasks]);
  const pendingTasks = useMemo(() => allTasks.filter(task => !task.completed), [allTasks]);

  const handleTaskClick = (task: Task) => {
    const originalProject = projects.find(p => p.id === task.project_id); // KORJATTU
    const originalTask = originalProject?.tasks.find(t => t.id === task.id);
    if (originalTask) {
      dispatch({ type: 'TOGGLE_TASK_MODAL', payload: originalTask });
    }
  };

  const toggleTask = (e: React.MouseEvent, projectId: string, taskId: string, completed: boolean) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    const task = project?.tasks.find(t => t.id === taskId);
    
    if (task) {
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          projectId,
          task: { ...task, completed }
        }
      });
    }
  };
  
  const toggleSubtask = (e: React.MouseEvent, projectId: string, taskId: string, subtaskId: string, completed: boolean) => {
    e.stopPropagation();
    const project = projects.find(p => p.id === projectId);
    const task = project?.tasks.find(t => t.id === taskId);

    if (task && task.subtasks) {
      const updatedSubtasks = task.subtasks.map(st =>
        st.id === subtaskId ? { ...st, completed } : st
      );
      const updatedTask = { ...task, subtasks: updatedSubtasks };

      dispatch({
        type: 'UPDATE_TASK',
        payload: { projectId, task: updatedTask },
      });
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tehtävät</h1>
        <p className="text-gray-600 mt-2">
          {pendingTasks.length} odottaa • {completedTasks.length} valmiina
        </p>
      </div>
      <button
          onClick={() => dispatch({ type: 'TOGGLE_TASK_MODAL' })}
          className="btn-glossy flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Uusi tehtävä
        </button>
      </div>

      {/* Task Sections */}
      <div className="space-y-8 mt-8">
        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Odottaa ({pendingTasks.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {pendingTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleTaskClick(task as Task)}
                >
                  <div className="flex items-start space-x-4">
                    <button
                      onClick={(e) => toggleTask(e, task.project_id, task.id, true)} // KORJATTU
                      className="mt-1 text-gray-400 hover:text-blue-600 transition-colors z-10 relative"
                    >
                      <Circle className="w-5 h-5" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900">{task.title}</h3>
                        {getPriorityIcon(task.priority)}
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}

                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-2 space-y-2 pl-4 border-l-2 border-gray-200">
                          {task.subtasks.map(subtask => (
                            <div key={subtask.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={subtask.completed}
                                onClick={(e) => toggleSubtask(e, task.project_id, task.id, subtask.id, !subtask.completed)} // KORJATTU
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 z-10 relative"
                              />
                              <span className={`text-sm ${subtask.completed ? 'line-through text-gray-500' : ''}`}>
                                {subtask.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                        <div className="flex items-center space-x-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: task.projectColor }}
                          />
                          <span>{task.projectName}</span>
                        </div>
                        
                        {task.due_date && ( // KORJATTU
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Määräaika {formatDate(new Date(task.due_date))}</span>
                          </div>
                        )}
                        
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Valmiit ({completedTasks.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {completedTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="p-6 hover:bg-gray-50 transition-colors opacity-60 cursor-pointer"
                  onClick={() => handleTaskClick(task as Task)}
                >
                  <div className="flex items-start space-x-4">
                    <button
                      onClick={(e) => toggleTask(e, task.project_id, task.id, false)} // KORJATTU
                      className="mt-1 text-green-600 hover:text-gray-400 transition-colors z-10 relative"
                    >
                      <CheckSquare className="w-5 h-5" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-gray-900 line-through">{task.title}</h3>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: task.projectColor }}
                          />
                          <span>{task.projectName}</span>
                        </div>
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
