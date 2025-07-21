// src/components/Modals/ProjectModal.tsx
import React, { useState, useEffect } from 'react';
import { X, BookOpen, FileText, Calendar, Plus, Trash2, File } from 'lucide-react';
import { nanoid } from 'nanoid'; // <-- LISÄTTY IMPORTTI
import { useApp } from '../../contexts/AppContext';
import { Project, Task, FileAttachment } from '../../types';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';
import { useConfirmation } from '../../hooks/useConfirmation';
import AttachmentSection from '../Shared/AttachmentSection';

export default function ProjectModal() {
  const { state, dispatch } = useApp();
  const { showProjectModal, selectedProjectId, projects } = state;
  const { getConfirmation } = useConfirmation();

  const selectedProject = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId)
    : null;

  const courses = projects.filter(p => p.type === 'course');

  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'personal' as Project['type'],
    color: '#3B82F6',
    startDate: '',
    endDate: '',
    parentCourseId: ''
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    dueDate: ''
  });

  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      setFormData({
        name: selectedProject.name,
        description: selectedProject.description || '',
        type: selectedProject.type,
        color: selectedProject.color,
        startDate: selectedProject.startDate.toISOString().split('T')[0],
        endDate: selectedProject.endDate?.toISOString().split('T')[0] || '',
        parentCourseId: selectedProject.parentCourseId || ''
      });
      setTasks(selectedProject.tasks || []);
      setFiles(selectedProject.files || []);
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'personal',
        color: '#3B82F6',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        parentCourseId: ''
      });
      setTasks([]); 
      setFiles([]);
    }
    setShowAddTask(false);
    setActiveTab('details');
  }, [selectedProject, showProjectModal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // KORJATTU KOHTA: Käytetään nanoid-funktiota UUID:n sijaan
    const projectId = selectedProject?.id || nanoid();
    
    const projectData: Project = {
      id: projectId,
      name: formData.name,
      description: formData.description,
      type: formData.type,
      color: formData.color,
      startDate: new Date(formData.startDate),
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      tasks: tasks.map(t => ({...t, projectId })),
      files: files,
      parentCourseId: formData.parentCourseId || undefined,
      columns: selectedProject?.columns || []
    };

    if (selectedProject) {
      dispatch({ type: 'UPDATE_PROJECT', payload: projectData });
    } else {
      dispatch({ type: 'ADD_PROJECT', payload: projectData });
    }
    dispatch({ type: 'CLOSE_MODALS' });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const taskData: Task = {
      id: nanoid(), // <-- KORJATTU MYÖS TÄÄLLÄ
      title: newTask.title,
      description: newTask.description,
      completed: false,
      columnId: 'todo',
      priority: newTask.priority,
      dueDate: newTask.dueDate ? new Date(newTask.dueDate) : undefined,
      projectId: selectedProject?.id || 'temp-id'
    };
    setTasks([...tasks, taskData]);
    setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
    setShowAddTask(false);
  };

  const handleDeleteTask = (taskId: string) => {
     setTasks(tasks.filter(t => t.id !== taskId));
  };

  const toggleTask = (taskToToggle: Task) => {
     setTasks(tasks.map(t => t.id === taskToToggle.id ? {...t, completed: !t.completed} : t));
  };

  const handleDelete = async () => {
    if (selectedProject) {
      const confirmed = await getConfirmation({
        title: 'Vahvista poisto',
        message: `Haluatko varmasti poistaa projektin "${selectedProject.name}"? Tätä toimintoa ei voi perua.`
      });
      if (confirmed) {
        dispatch({ type: 'DELETE_PROJECT', payload: selectedProject.id });
        dispatch({ type: 'CLOSE_MODALS' });
      }
    }
  };
  
  if (!showProjectModal) return null;

  const colorOptions = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedProject ? 'Muokkaa projektia' : 'Luo projekti'}
          </h2>
          <button
            onClick={() => dispatch({ type: 'CLOSE_MODALS' })}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Projekti & Tehtävät
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'files'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <File className="w-4 h-4 inline mr-2" />
            Tiedostot ({files.length})
          </button>
        </div>
        
          <div className="flex-1 overflow-y-auto">
              {activeTab === 'details' ? (
                  <div>
                      <form onSubmit={handleSubmit} className="p-6 space-y-4">
                           <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    Projektin nimi
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Projektin nimi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    Liitä kurssiin (valinnainen)
                  </label>
                  <select
                    value={formData.parentCourseId}
                    onChange={(e) => setFormData({ ...formData, parentCourseId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Ei liitetty kurssiin</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Muistiinpanot
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={10}
                    placeholder="Kirjoita kuvaus tai lisää muistiinpanoja"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tyyppi
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as Project['type'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="course">Kurssi</option>
                      <option value="research">Tutkimus</option>
                      <option value="administrative">Hallinnollinen</option>
                      <option value="personal">Henkilökohtainen</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Väri
                    </label>
                    <div className="flex space-x-2">
                      {colorOptions.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            formData.color === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Alkupäivä
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loppupäivä (valinnainen)
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                          <div className="flex justify-between pt-4">
                              {selectedProject && selectedProject.id !== GENERAL_TASKS_PROJECT_ID && (
                                  <button
                                      type="button"
                                      onClick={handleDelete}
                                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                      Poista projekti
                                  </button>
                              )}
                              <div className="flex space-x-3 ml-auto">
                                  <button
                                      type="button"
                                      onClick={() => dispatch({ type: 'CLOSE_MODALS' })}
                                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  >
                                      Peruuta
                                  </button>
                                  <button
                                      type="submit"
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                      {selectedProject ? 'Päivitä' : 'Luo'}
                                  </button>
                              </div>
                          </div>
                      </form>
                      <div className="border-t border-gray-200 p-6">
                          <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-medium text-gray-900">Tehtävät</h3>
                              <button
                                  onClick={() => setShowAddTask(!showAddTask)}
                                  className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                              >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Lisää tehtävä
                              </button>
                          </div>
                          {showAddTask && (
                              <form onSubmit={handleAddTask} className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                                   <input
                        type="text"
                        required
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Tehtävän otsikko"
                      />
                      <textarea
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder="Tehtävän kuvaus"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={newTask.priority}
                          onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="low">Matala prioriteetti</option>
                          <option value="medium">Keskitaso</option>
                          <option value="high">Korkea prioriteetti</option>
                        </select>
                        <input
                          type="date"
                          value={newTask.dueDate}
                          onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Lisää tehtävä
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddTask(false)}
                          className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm transition-colors"
                        >
                          Peruuta
                        </button>
                      </div>
                              </form>
                          )}
                          <div className="space-y-2">
                              {tasks.map(task => (
                                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                      <div className="flex items-center space-x-3">
                                          <input
                                              type="checkbox"
                                              checked={task.completed}
                                              onChange={() => toggleTask(task)}
                                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                          />
                                          <div>
                                                 <div className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-sm text-gray-600">{task.description}</div>
                            )}
                            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                              <span className={`px-2 py-1 rounded-full ${
                                task.priority === 'high' ? 'bg-red-100 text-red-800' :
                                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {task.priority === 'high' ? 'Korkea' : 
                                 task.priority === 'medium' ? 'Keskitaso' : 'Matala'}
                              </span>
                              {task.dueDate && (
                                <span>Määräaika: {new Date(task.dueDate).toLocaleDateString('fi-FI')}</span>
                              )}
                            </div>
                                          </div>
                                      </div>
                                      <button
                                          onClick={() => handleDeleteTask(task.id)}
                                          className="text-red-500 hover:text-red-700 transition-colors"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </div>
                              ))}
                              {tasks.length === 0 && (
                                  <p className="text-gray-500 text-center py-4">Ei tehtäviä vielä</p>
                              )}
                          </div>
                      </div>
                  </div>
              ) : (
                  <AttachmentSection 
                    files={files}
                    onFilesChange={setFiles}
                    fileInputId="file-upload-project"
                  />
              )}
          </div>
      </div>
      </div>
  );
}
