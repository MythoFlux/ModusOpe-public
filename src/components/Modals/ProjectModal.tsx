// src/components/Modals/ProjectModal.tsx
import React, { useState, useEffect } from 'react';
import { X, BookOpen, FileText, Calendar, Plus, Trash2, File, Loader2 } from 'lucide-react';
import { useApp, useAppServices } from '../../contexts/AppContext';
import { Project, Task, FileAttachment } from '../../types';
import { GENERAL_TASKS_PROJECT_ID } from '../../contexts/AppContext';
import { useConfirmation } from '../../hooks/useConfirmation';
import AttachmentSection from '../Shared/AttachmentSection';
import FormInput from '../Forms/FormInput';
import FormTextarea from '../Forms/FormTextarea';
import FormSelect from '../Forms/FormSelect';
import ColorSelector from '../Forms/ColorSelector';

export default function ProjectModal() {
  const { state, dispatch } = useApp();
  const services = useAppServices(); // UUSI
  const { showProjectModal, selectedProjectId, projects } = state;
  const { getConfirmation } = useConfirmation();
  
  const [isLoading, setIsLoading] = useState(false); // UUSI

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
    start_date: '',
    end_date: '',
    parent_course_id: ''
  });

  // Tehtävien hallinta pysyy modaalin paikallisessa tilassa kunnes projekti tallennetaan
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    due_date: ''
  });

  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      setFormData({
        name: selectedProject.name,
        description: selectedProject.description || '',
        type: selectedProject.type,
        color: selectedProject.color,
        start_date: selectedProject.start_date.toISOString().split('T')[0],
        end_date: selectedProject.end_date?.toISOString().split('T')[0] || '',
        parent_course_id: selectedProject.parent_course_id || ''
      });
      setTasks(selectedProject.tasks || []);
      setFiles(selectedProject.files || []);
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'personal',
        color: '#3B82F6',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        parent_course_id: ''
      });
      setTasks([]); 
      setFiles([]);
    }
    setShowAddTask(false);
    setActiveTab('details');
  }, [selectedProject, showProjectModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // HUOM: Tehtäviä ei tallenneta erikseen tässä, oletus on, että
    // ne tallennetaan TaskModalin kautta. Jos haluat tallentaa tehtävät
    // tässä, pitäisi luoda erillinen `updateTasksForProject`-servicefunktio.
    const projectData: any = {
      id: selectedProject?.id,
      name: formData.name,
      description: formData.description,
      type: formData.type,
      color: formData.color,
      start_date: new Date(formData.start_date),
      end_date: formData.end_date ? new Date(formData.end_date) : undefined,
      parent_course_id: formData.parent_course_id || undefined,
      tasks: selectedProject?.tasks || tasks, // Lähetetään vanhat tai päivitetyt tehtävät
      files: files,
      columns: selectedProject?.columns || []
    };
    
    try {
        if (selectedProject) {
          await services.updateProject(projectData);
        } else {
          await services.addProject(projectData);
        }
        dispatch({ type: 'CLOSE_MODALS' });
    } catch (error: any) {
        alert(`Tallennus epäonnistui: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const taskData: Task = {
      id: `temp-${Date.now()}`, // Väliaikainen ID
      title: newTask.title,
      description: newTask.description,
      completed: false,
      column_id: 'todo',
      priority: newTask.priority,
      due_date: newTask.due_date ? new Date(newTask.due_date) : undefined,
      project_id: selectedProject?.id || 'temp-id'
    };
    setTasks([...tasks, taskData]);
    setNewTask({ title: '', description: '', priority: 'medium', due_date: '' });
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
        setIsLoading(true);
        try {
            await services.deleteProject(selectedProject.id);
            dispatch({ type: 'CLOSE_MODALS' });
        } catch (error: any) {
            alert(`Poisto epäonnistui: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
      }
    }
  };
  
  if (!showProjectModal) return null;

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
                           <FormInput
                              id="project-name"
                              label="Projektin nimi"
                              icon={<BookOpen className="w-4 h-4 inline mr-2" />}
                              type="text"
                              required
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="Projektin nimi"
                           />

                <FormSelect
                    id="project-course"
                    label="Liitä kurssiin (valinnainen)"
                    icon={<BookOpen className="w-4 h-4 inline mr-2" />}
                    value={formData.parent_course_id}
                    onChange={(e) => setFormData({ ...formData, parent_course_id: e.target.value })}
                  >
                    <option value="">Ei liitetty kurssiin</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </FormSelect>

                <FormTextarea
                    id="project-description"
                    label="Muistiinpanot"
                    icon={<FileText className="w-4 h-4 inline mr-2" />}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={10}
                    placeholder="Kirjoita kuvaus tai lisää muistiinpanoja"
                />
                <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  id="project-type"
                  label="Tyyppi"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Project['type'] })}
                >
                  <option value="administrative">Hallinnollinen</option>
                  <option value="personal">Henkilökohtainen</option>
                </FormSelect>

                <ColorSelector
                  label="Väri"
                  selectedColor={formData.color}
                  onChange={(color) => setFormData({ ...formData, color })}
                />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    id="start_date"
                    label="Alkupäivä"
                    icon={<Calendar className="w-4 h-4 inline mr-2" />}
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                  <FormInput
                    id="end_date"
                    label="Loppupäivä (valinnainen)"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
                          <div className="flex justify-between pt-4">
                              {selectedProject && selectedProject.id !== GENERAL_TASKS_PROJECT_ID && (
                                  <button
                                      type="button"
                                      onClick={handleDelete}
                                      disabled={isLoading}
                                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
                                      disabled={isLoading}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                                  >
                                      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                      {selectedProject ? 'Päivitä' : 'Luo'}
                                  </button>
                              </div>
                          </div>
                      </form>
                      {/* Tehtäväosio pysyy ennallaan, koska se muokkaa vain paikallista tilaa */}
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
