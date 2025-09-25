// src/components/Modals/TaskModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Type, FileText, Calendar, AlertCircle, Bookmark, Plus, Trash2, File, Loader2, GripVertical, Pencil } from 'lucide-react';
import { useApp, useAppServices } from '../../contexts/AppContext';
import { useConfirmation } from '../../hooks/useConfirmation';
import { Task, Subtask, FileAttachment } from '../../types';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';
import AttachmentSection from '../Shared/AttachmentSection';
import FormInput from '../Forms/FormInput';
import FormTextarea from '../Forms/FormTextarea';
import FormSelect from '../Forms/FormSelect';

export default function TaskModal() {
  const { state, dispatch } = useApp();
  const services = useAppServices();
  const { showTaskModal, selectedTask, projects, session } = state;
  const { getConfirmation } = useConfirmation();
  const [isLoading, setIsLoading] = useState(false);
  const draggedSubtask = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    due_date: '',
    project_id: '',
    subtasks: [] as Subtask[],
    column_id: 'todo',
    show_description: false,
    show_subtasks: false,
  });
  
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');
  const editingTextareaRef = useRef<HTMLTextAreaElement>(null);
  const newSubtaskTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Effect to adjust editing textarea height
  useEffect(() => {
    if (editingTextareaRef.current) {
      editingTextareaRef.current.style.height = 'auto';
      editingTextareaRef.current.style.height = `${editingTextareaRef.current.scrollHeight}px`;
    }
  }, [editingSubtaskText]);

  // Effect to adjust new subtask textarea height
  useEffect(() => {
    if (newSubtaskTextareaRef.current) {
      newSubtaskTextareaRef.current.style.height = 'auto';
      newSubtaskTextareaRef.current.style.height = `${newSubtaskTextareaRef.current.scrollHeight}px`;
    }
  }, [newSubtaskTitle]);


  useEffect(() => {
    if (selectedTask && selectedTask.id) {
      setFormData({
        title: selectedTask.title,
        description: selectedTask.description || '',
        priority: selectedTask.priority,
        due_date: selectedTask.due_date ? new Date(selectedTask.due_date).toISOString().split('T')[0] : '',
        project_id: selectedTask.project_id,
        subtasks: selectedTask.subtasks || [],
        column_id: selectedTask.column_id || 'todo',
        show_description: selectedTask.show_description || false,
        show_subtasks: selectedTask.show_subtasks || false,
      });
      setFiles(selectedTask.files || []);
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        project_id: selectedTask?.project_id || '',
        subtasks: [],
        column_id: selectedTask?.column_id || 'todo',
        show_description: false,
        show_subtasks: false,
      });
      setFiles([]);
    }
    setActiveTab('details');
  }, [selectedTask, showTaskModal]);

  const handleSubtaskChange = (subtaskId: string, completed: boolean) => {
    setFormData(prev => ({ ...prev, subtasks: prev.subtasks.map(st => st.id === subtaskId ? { ...st, completed } : st) }));
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim() === '') return;
    const newSubtask: Subtask = { id: `temp-${Date.now()}`, title: newSubtaskTitle, completed: false };
    setFormData(prev => ({ ...prev, subtasks: [...prev.subtasks, newSubtask] }));
    setNewSubtaskTitle('');
  };
  
  const handleDeleteSubtask = (subtaskId: string) => {
    setFormData(prev => ({ ...prev, subtasks: prev.subtasks.filter(st => st.id !== subtaskId) }));
  };

  const handleEditSubtask = (subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskText(subtask.title);
  };

  const handleSaveSubtaskEdit = () => {
    if (!editingSubtaskId) return;
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(st =>
        st.id === editingSubtaskId ? { ...st, title: editingSubtaskText } : st
      )
    }));
    setEditingSubtaskId(null);
    setEditingSubtaskText('');
  };

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, subtaskId: string) => {
    draggedSubtask.current = subtaskId;
    e.dataTransfer.effectAllowed = 'move';
    (e.currentTarget as HTMLLIElement).classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLIElement>, targetSubtaskId: string) => {
    e.preventDefault();
    if (draggedSubtask.current === null || draggedSubtask.current === targetSubtaskId) return;

    const currentSubtasks = [...formData.subtasks];
    const draggedIndex = currentSubtasks.findIndex(st => st.id === draggedSubtask.current);
    const targetIndex = currentSubtasks.findIndex(st => st.id === targetSubtaskId);
    
    const [draggedItem] = currentSubtasks.splice(draggedIndex, 1);
    currentSubtasks.splice(targetIndex, 0, draggedItem);
    
    setFormData(prev => ({ ...prev, subtasks: currentSubtasks }));
    draggedSubtask.current = null;
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLLIElement>) => {
    (e.currentTarget as HTMLLIElement).classList.remove('opacity-50');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user && !(selectedTask && selectedTask.id)) {
        alert("Sinun täytyy olla kirjautunut luodaksesi tehtävän.");
        return;
    }
    setIsLoading(true);
    
    const targetProjectId = formData.project_id || GENERAL_TASKS_PROJECT_ID;

    const commonTaskData = {
      title: formData.title,
      description: formData.description,
      column_id: formData.column_id,
      priority: formData.priority,
      due_date: formData.due_date ? new Date(formData.due_date) : undefined,
      project_id: targetProjectId,
      subtasks: formData.subtasks,
      files: files,
      show_description: formData.show_description,
      show_subtasks: formData.show_subtasks,
    };

    try {
        if (selectedTask && selectedTask.id) {
            const taskToUpdate: Task = {
                ...commonTaskData,
                id: selectedTask.id,
                completed: selectedTask.completed,
            };
            await services.updateTask(taskToUpdate);
        } else {
            const taskToAdd: Omit<Task, 'id'> = {
                ...commonTaskData,
                completed: false,
            };
            await services.addTask(taskToAdd);
        }
        dispatch({ type: 'CLOSE_MODALS' });
    } catch (error: any) {
        alert(`Tallennus epäonnistui: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (selectedTask) {
      const confirmed = await getConfirmation({
        title: 'Vahvista poisto',
        message: `Haluatko varmasti poistaa tehtävän "${selectedTask.title}"? Toimintoa ei voi perua.`
      });
      if (confirmed) {
        setIsLoading(true);
        try {
            await services.deleteTask(selectedTask.project_id, selectedTask.id);
            dispatch({ type: 'CLOSE_MODALS' });
        } catch (error: any) {
            alert(`Poisto epäonnistui: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
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
        
        <form id="task-details-form" onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'details' ? (
                <div className="p-6 space-y-4">
                  <FormSelect
                    id="task-project"
                    label="Projekti"
                    icon={<Bookmark className="w-4 h-4 inline mr-2" />}
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  >
                    {[...projects]
                      .sort((a, b) => a.name.localeCompare(b.name))
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
                    <ul className="space-y-2">
                      {formData.subtasks.map(subtask => (
                        <li key={subtask.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, subtask.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, subtask.id)}
                            onDragEnd={handleDragEnd}
                            className="flex items-start space-x-2 p-1 rounded-md hover:bg-gray-100 group"
                        >
                          <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing mt-1" />
                          <input
                            type="checkbox"
                            checked={subtask.completed}
                            onChange={e => handleSubtaskChange(subtask.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-1.5"
                          />
                          {editingSubtaskId === subtask.id ? (
                            <textarea
                              ref={editingTextareaRef}
                              value={editingSubtaskText}
                              onChange={(e) => setEditingSubtaskText(e.target.value)}
                              onBlur={handleSaveSubtaskEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveSubtaskEdit();
                                }
                              }}
                              autoFocus
                              className="flex-1 px-2 py-1 border border-blue-400 rounded-md resize-none overflow-hidden"
                              rows={1}
                            />
                          ) : (
                            <span className={`flex-1 pt-1 ${subtask.completed ? 'line-through text-gray-500' : ''}`}>
                              {subtask.title}
                            </span>
                          )}
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                            <button type="button" onClick={() => handleEditSubtask(subtask)}>
                                <Pencil className="w-4 h-4 text-gray-500 hover:text-blue-600" />
                            </button>
                            <button type="button" onClick={() => handleDeleteSubtask(subtask.id)}>
                                <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-start space-x-2 mt-2">
                      <textarea
                        ref={newSubtaskTextareaRef}
                        id="new-subtask-title"
                        name="new-subtask-title"
                        value={newSubtaskTitle}
                        onChange={e => setNewSubtaskTitle(e.target.value)}
                        placeholder="Uusi alitehtävä"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none overflow-hidden"
                        onKeyDown={(e) => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddSubtask();
                           }
                        }}
                        rows={1}
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
                  
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700">Kanban-näkymän asetukset</h4>
                      <label className="flex items-center space-x-2">
                          <input
                              type="checkbox"
                              checked={formData.show_description}
                              onChange={e => setFormData(prev => ({ ...prev, show_description: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm">Näytä kuvaus Kanban-kortilla</span>
                      </label>
                      <label className="flex items-center space-x-2">
                          <input
                              type="checkbox"
                              checked={formData.show_subtasks}
                              onChange={e => setFormData(prev => ({ ...prev, show_subtasks: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm">Näytä alitehtävät Kanban-kortilla</span>
                      </label>
                  </div>
                </div>
              ) : (
                <AttachmentSection 
                  files={files}
                  onFilesChange={setFiles}
                  fileInputId="file-upload-task"
                />
              )}
            </div>
        </form>
        <div className="flex justify-between p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
            {isEditing && (
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
                    form="task-details-form"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isEditing ? 'Päivitä tehtävä' : 'Luo tehtävä'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
