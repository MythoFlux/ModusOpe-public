// src/components/Projects/ProjectList.tsx
import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { BookOpen, Calendar, CheckSquare, ClipboardCheck, Plus } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';

export default function ProjectList() {
  const { state, dispatch } = useApp();
  
  const projects = useMemo(() => 
    state.projects.filter(p => p.type !== 'course' && p.id !== GENERAL_TASKS_PROJECT_ID),
    [state.projects]
  );

  const handleProjectClick = (projectId: string) => {
    dispatch({ type: 'TOGGLE_PROJECT_MODAL', payload: projectId });
  };

  const getTaskStats = (projectId: string) => {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return { completed: 0, total: 0 };
    
    const completed = project.tasks.filter(task => task.completed).length;
    const total = project.tasks.length;
    return { completed, total };
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projektit</h1>
          <p className="text-gray-600 mt-2">Hallinnoi projekteja ja tehtäväkokonaisuuksia</p>
        </div>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_PROJECT_MODAL' })}
          className="btn-glossy flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Uusi projekti
        </button>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {projects.map((project) => {
          const taskStats = getTaskStats(project.id);
          const completionRate = taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0;

          return (
            <div
              key={project.id}
              onClick={() => handleProjectClick(project.id)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      {project.type}
                    </span>
                  </div>
                </div>
                <ClipboardCheck className="w-5 h-5 text-gray-400" />
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="space-y-3">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{Math.round(completionRate)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${completionRate}%`,
                        backgroundColor: project.color
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <CheckSquare className="w-4 h-4" />
                    <span>{taskStats.completed}/{taskStats.total} tasks</span>
                  </div>
                  {project.end_date && ( // KORJATTU
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Due {formatDate(project.end_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ei projekteja tällä hetkellä</h3>
          <p className="text-gray-600 mb-4">Luo uusi projekti aloittaaksesi</p>
        </div>
      )}
    </div>
  );
}
