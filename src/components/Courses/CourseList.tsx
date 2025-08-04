// src/components/Courses/CourseList.tsx
import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { BookOpen, Calendar, CheckSquare, Plus } from 'lucide-react';
import { formatDate } from '../../utils/dateUtils';

export default function CourseList() {
  const { state, dispatch } = useApp();
  
  const courses = useMemo(() => 
    state.projects.filter(p => p.type === 'course'),
    [state.projects]
  );

  const handleCourseClick = (courseId: string) => {
    dispatch({ type: 'TOGGLE_COURSE_MODAL', payload: { id: courseId } });
  };

  const getTaskStats = (courseId: string) => {
    const course = courses.find(p => p.id === courseId);
    if (!course) return { completed: 0, total: 0 };
    
    const completed = course.tasks.filter(task => task.completed).length;
    const total = course.tasks.length;
    return { completed, total };
  };

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kurssit</h1>
          <p className="text-gray-600 mt-2">Hallinnoi kurssejasi ja oppimiskokonaisuuksiasi</p>
        </div>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_COURSE_MODAL' })}
          className="btn-glossy flex items-center"
        >
            <Plus className="w-4 h-4 mr-2" />
            Uusi kurssi
        </button>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {courses.map((course) => {
          const taskStats = getTaskStats(course.id);
          const completionRate = taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0;

          return (
            <div
              key={course.id}
              onClick={() => handleCourseClick(course.id)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: course.color }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{course.name}</h3>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      Kurssi
                    </span>
                  </div>
                </div>
                <BookOpen className="w-5 h-5 text-gray-400" />
              </div>

              {course.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {course.description}
                </p>
              )}

              <div className="space-y-3">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Edistyminen</span>
                    <span>{Math.round(completionRate)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${completionRate}%`,
                        backgroundColor: course.color
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <CheckSquare className="w-4 h-4" />
                    <span>{taskStats.completed}/{taskStats.total} tehtävää</span>
                  </div>
                  {course.end_date && ( // KORJATTU
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Päättyy {formatDate(course.end_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {courses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ei kursseja vielä</h3>
          <p className="text-gray-600 mb-4">Luo ensimmäinen kurssisi aloittaaksesi</p>
        </div>
      )}
    </div>
  );
}
