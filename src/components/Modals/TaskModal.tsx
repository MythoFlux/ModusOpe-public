// src/components/Modals/TaskModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Type, FileText, Calendar, AlertCircle, Bookmark, Plus, Trash2, File } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../../contexts/AppContext';
import { useConfirmation } from '../../hooks/useConfirmation'; // <-- LISÄTTY
import { Task, Subtask, FileAttachment } from '../../types';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';
import AttachmentSection from '../Shared/AttachmentSection';
import FormInput from '../Forms/FormInput';
import FormTextarea from '../Forms/FormTextarea';
import FormSelect from '../Forms/FormSelect';

export default function TaskModal() {
  const { state, dispatch } = useApp();
  const { showTaskModal, selectedTask, projects, session } = state;
  const { getConfirmation } = useConfirmation(); // <-- LISÄTTY

  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    due_date: '',
    project_id: '',
    subtasks: [] as Subtask[],
  });
  
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [files, setFiles] = useState<FileAttachment[]>([]);

  useEffect(() => {
    if (selectedTask && selectedTask.id) {
      setFormData({
        title: selectedTask.title,
        description: selectedTask.description || '',
        priority: selectedTask.priority,
        due_date: selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : '',
        project_id: selectedTask.projectId,
        subtasks: selectedTask.subtasks || [],
      });
      setFiles(selectedTask.files || []);
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        project_id: selectedTask?.projectId || '',
        subtasks: [],
      });
      setFiles([]);
    }
    setActiveTab('details');
  }, [selectedTask, showTaskModal]);

  const handleSubtaskChange = (subtaskId: string, completed: boolean) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(st =>
        st.id === subtaskId ? { ...st, completed } : st
      ),
    }));
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim() === '') return;
    const newSubtask: Subtask = {
      id: uuidv4(),
      title: newSubtaskTitle,
      completed: false,
    };
    setFormData(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, newSubtask],
    }));
    setNewSubtaskTitle('');
  };
  
  const handleDeleteSubtask = (subtaskId: string) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter(st => st.id !== subtaskId),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user && !(selectedTask && selectedTask.id)) {
        alert("Sinun täytyy olla kirjautunut luodaksesi tehtävän.");
        return;
    }

    const taskData: any = {
      id: selectedTask?.id || uuidv4(),
      title: formData.title,
      description: formData.description,
      completed: (selectedTask && selectedTask.id && selectedTask.completed) || false,
      columnId: selectedTask?.columnId || 'todo',
      priority: formData.priority,
      dueDate: formData.due_date ? new Date(formData.due_date) : undefined,
      projectId: formData.project_id,
      subtasks: formData.subtasks,
      files: files
    };

    if (!(selectedTask && selectedTask.id)) {
        taskData.user_id = session.user.id;
    }

    if (selectedTask && selectedTask.id) {
      dispatch({ type: 'UPDATE_TASK', payload: { projectId: taskData.projectId || selectedTask.projectId, task: taskData } });
    } else {
      const targetProjectId = taskData.projectId || GENERAL_TASKS_PROJECT_ID;
      dispatch({ type: 'ADD_TASK', payload: { projectId: targetProjectId, task: { ...taskData, projectId: targetProjectId } } });
    }

    dispatch({ type: 'CLOSE_MODALS' });
  };
  
  // --- KOKO FUNKTIO MUOKATTU ASYNKRONISEKSI JA KÄYTTÄMÄÄN VAHVISTUSTA ---
  const handleDelete = async () => {
    if (selectedTask) {
      const confirmed = await getConfirmation({
        title: 'Vahvista poisto',
        message: `Haluatko varmasti poistaa tehtävän "${selectedTask.title}"? Toimintoa ei voi perua.`
      });
      if (confirmed) {
        dispatch({ type: 'DELETE_TASK', payload: { projectId: selectedTask.projectId, taskId: selectedTask.id } });
        dispatch({ type: 'CLOSE_MODALS' });
      }
    }
  };

  if (!showTaskModal) return null;

  const isEditing = selectedTask && selectedTask.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Muokkaa tehtävää' : 'Luo uusi tehtävä'}
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
            <Type className="w-4 h-4 inline mr-2" />
            Tiedot & Alitehtävät
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
            <form id="task-form-details" onSubmit={handleSubmit} className="p-6 space-y-4">
              <FormSelect
                id="task-project"
                label="Projekti (valinnainen)"
                icon={<Bookmark className="w-4 h-4 inline mr-2" />}
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              >
                <option value="">Ei projektia (Yleiset tehtävät)</option>
                {projects
                  .filter(project => project.id !== GENERAL_TASKS_PROJECT_ID)
                  .map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                ))}
              </FormSelect>
            
              <FormInput
                id="task-title"
                label="Otsikko"
                icon={<Type className="w-4 h-4 inline mr-2" />}
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Tehtävän otsikko"
              />

              <FormTextarea
                id="task-description"
                label="Kuvaus"
                icon={<FileText className="w-4 h-4 inline mr-2" />}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Tehtävän kuvaus"
              />

              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  id="task-priority"
                  label="Prioriteetti"
                  icon={<AlertCircle className="w-4 h-4 inline mr-2" />}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                >
                  <option value="low">Matala</option>
                  <option value="medium">Keskitaso</option>
                  <option value="high">Korkea</option>
                </FormSelect>
                <FormInput
                  id="task-duedate"
                  label="Määräpäivä"
                  icon={<Calendar className="w-4 h-4 inline mr-2" />}
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Alitehtävät</h4>
                <div className="space-y-2">
                  {formData.subtasks.map(subtask => (
                    <div key={subtask.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={e => handleSubtaskChange(subtask.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className={`flex-1 ${subtask.completed ? 'line-through text-gray-500' : ''}`}>
                        {subtask.title}
                      </span>
                      <button type="button" onClick={() => handleDeleteSubtask(subtask.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="text"
                    id="new-subtask-title"
                    name="new-subtask-title"
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    placeholder="Uusi alitehtävä"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <AttachmentSection 
              files={files}
              onFilesChange={setFiles}
              fileInputId="file-upload-task"
            />
          )}
        </div>

        <div className="flex justify-between p-6 border-t border-gray-200 flex-shrink-0">
            {isEditing && (
                <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    Poista tehtävä
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
                    form="task-form-details"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {isEditing ? 'Päivitä tehtävä' : 'Luo tehtävä'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
