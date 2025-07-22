// src/components/Modals/ProjectModal.tsx

import React, { useState, useEffect } from 'react';
import { X, BookOpen, FileText, Calendar, Plus, Trash2, File } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useApp } from '../../contexts/AppContext';
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
  const { showProjectModal, selectedProjectId, projects, session } = state;
  const { getConfirmation } = useConfirmation();

  const selectedProject = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId)
    : null;

  const courses = projects.filter(p => p.type === 'course');

  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details');
  // --- NÄMÄ RIVIT ON MUUTETTU ---
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'personal' as Project['type'],
    color: '#3B82F6',
    start_date: '',
    end_date: '',
    parent_course_id: ''
  });
  // ------------------------------

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
      // --- NÄMÄ RIVIT ON MUUTETTU ---
      setFormData({
        name: selectedProject.name,
        description: selectedProject.description || '',
        type: selectedProject.type,
        color: selectedProject.color,
        start_date: selectedProject.start_date.toISOString().split('T')[0],
        end_date: selectedProject.end_date?.toISOString().split('T')[0] || '',
        parent_course_id: selectedProject.parent_course_id || ''
      });
      // ------------------------------
      setTasks(selectedProject.tasks || []);
      setFiles(selectedProject.files || []);
    } else {
      // --- NÄMÄ RIVIT ON MUUTETTU ---
      setFormData({
        name: '',
        description: '',
        type: 'personal',
        color: '#3B82F6',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        parent_course_id: ''
      });
      // ------------------------------
      setTasks([]); 
      setFiles([]);
    }
    setShowAddTask(false);
    setActiveTab('details');
  }, [selectedProject, showProjectModal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user && !selectedProject) {
      alert("Sinun täytyy olla kirjautunut luodaksesi projektin.");
      return;
    }
    
    const projectId = selectedProject?.id || uuidv4();
    
    // --- NÄMÄ RIVIT ON MUUTETTU ---
    const projectData: any = {
      id: projectId,
      name: formData.name,
      description: formData.description,
      type: formData.type,
      color: formData.color,
      start_date: new Date(formData.start_date),
      end_date: formData.end_date ? new Date(formData.end_date) : undefined,
      parent_course_id: formData.parent_course_id || undefined,
      tasks: tasks.map(t => ({...t, projectId })),
      files: files,
      columns: selectedProject?.columns || []
    };
    // ------------------------------

    if (!selectedProject) {
        projectData.user_id = session.user.id;
    }

    if (selectedProject) {
      dispatch({ type: 'UPDATE_PROJECT', payload: projectData });
    } else {
      dispatch({ type: 'ADD_PROJECT', payload: projectData });
    }
    dispatch({ type: 'CLOSE_MODALS' });
  };
  
  // ... (LOPUT TIEDOSTOSTA ON ENNALLAAN, PAITSI JSX-OSIOSSA)

  // --- MYÖS JSX-OSIOSSA TÄYTYY MUUTTAA VIITTAUKSET ---
  return (
    // ...
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
                // --- MUUTETTU ---
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
              // ...
              <div className="grid grid-cols-2 gap-4">
              <FormInput
                id="start-date"
                label="Alkupäivä"
                icon={<Calendar className="w-4 h-4 inline mr-2" />}
                type="date"
                required
                // --- MUUTETTU ---
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              <FormInput
                id="end-date"
                label="Loppupäivä (valinnainen)"
                type="date"
                // --- MUUTETTU ---
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            // ... (loput tiedostosta ennallaan)
    // ...
  );
}
