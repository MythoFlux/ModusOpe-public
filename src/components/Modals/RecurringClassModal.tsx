// src/components/Modals/RecurringClassModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Type, FileText, Clock, File } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { RecurringClass, FileAttachment } from '../../types';
import AttachmentSection from '../Shared/AttachmentSection';
import FormInput from '../Forms/FormInput';
import FormTextarea from '../Forms/FormTextarea';
import FormSelect from '../Forms/FormSelect';

export default function RecurringClassModal() {
  const { state, dispatch } = useApp();
  const { showRecurringClassModal, selectedRecurringClass, scheduleTemplates, courseModalInfo } = state;

  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    templateGroupName: '',
    startDate: '',
    endDate: ''
  });

  const [files, setFiles] = useState<FileAttachment[]>([]);

  const templateGroups = React.useMemo(() => {
    const groups: { [key: string]: typeof scheduleTemplates } = {};
    scheduleTemplates.forEach(template => {
      if (!groups[template.name]) {
        groups[template.name] = [];
      }
      groups[template.name].push(template);
    });
    return groups;
  }, [scheduleTemplates]);

  const templateGroupNames = React.useMemo(() => {
    return Object.keys(templateGroups);
  }, [templateGroups]);

  useEffect(() => {
    if (selectedRecurringClass) {
      const template = scheduleTemplates.find(t => t.id === selectedRecurringClass.scheduleTemplateId);
      setFormData({
        title: selectedRecurringClass.title,
        description: selectedRecurringClass.description || '',
        templateGroupName: template?.name || '',
        startDate: selectedRecurringClass.startDate.toISOString().split('T')[0],
        endDate: selectedRecurringClass.endDate.toISOString().split('T')[0]
      });
      setFiles(selectedRecurringClass.files || []);
    } else {
      const today = new Date();
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      
      setFormData({
        title: '',
        description: '',
        templateGroupName: templateGroupNames[0] || '',
        startDate: today.toISOString().split('T')[0],
        endDate: endOfYear.toISOString().split('T')[0]
      });
      setFiles([]);
    }
    setActiveTab('details');
  }, [selectedRecurringClass, scheduleTemplates, templateGroupNames]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedTemplates = templateGroups[formData.templateGroupName];
    if (!selectedTemplates || selectedTemplates.length === 0) return;

    selectedTemplates.forEach((template, index) => {
      const classData: RecurringClass = {
        id: selectedRecurringClass?.id || `${Date.now()}-${index}`,
        title: formData.title,
        description: formData.description,
        scheduleTemplateId: template.id,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        color: template.color,
        groupName: formData.templateGroupName,
        projectId: courseModalInfo?.id,
        files: files
      };

      if (selectedRecurringClass && index === 0) {
        dispatch({ type: 'UPDATE_RECURRING_CLASS', payload: classData });
      } else if (!selectedRecurringClass) {
        dispatch({ type: 'ADD_RECURRING_CLASS', payload: classData });
      }
    });

    dispatch({ type: 'CLOSE_MODALS' });
  };

  const getTemplateGroupInfo = (groupName: string) => {
    const templates = templateGroups[groupName];
    if (!templates || templates.length === 0) return '';
    
    const weekDays = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'];
    const timeSlots = templates.map(template => 
      `${weekDays[template.dayOfWeek]} ${template.startTime}-${template.endTime}`
    );
    
    return timeSlots.join(', ');
  };

  if (!showRecurringClassModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedRecurringClass ? 'Muokkaa oppituntia' : 'Lisää oppitunti'}
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
            Perustiedot
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <FormInput
                id="class-title"
                label="Oppitunnin nimi"
                icon={<Type className="w-4 h-4 inline mr-2" />}
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="esim. Matematiikka 9A - Algebra"
              />

              <FormTextarea
                id="class-description"
                label="Kuvaus"
                icon={<FileText className="w-4 h-4 inline mr-2" />}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Oppitunnin kuvaus"
              />

              <div>
                <FormSelect
                  id="class-template-group"
                  label="Tuntiryhmä"
                  icon={<Clock className="w-4 h-4 inline mr-2" />}
                  required
                  value={formData.templateGroupName}
                  onChange={(e) => setFormData({ ...formData, templateGroupName: e.target.value })}
                >
                  <option value="">Valitse tuntiryhmä</option>
                  {templateGroupNames.map(groupName => (
                    <option key={groupName} value={groupName}>
                      {groupName} ({templateGroups[groupName].length} aikaa)
                    </option>
                  ))}
                </FormSelect>
                {formData.templateGroupName && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                    <strong>Ajankohdat:</strong> {getTemplateGroupInfo(formData.templateGroupName)}
                  </div>
                )}
                {templateGroupNames.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    Luo ensin tuntiryhmä kiertotuntikaavio-näkymässä
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  id="class-start-date"
                  label="Alkupäivä"
                  icon={<Calendar className="w-4 h-4 inline mr-2" />}
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
                <FormInput
                  id="class-end-date"
                  label="Loppupäivä"
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Huomio:</strong> Tämä luo toistuvat oppitunnit valitun ajanjakson aikana 
                  kaikkiin valitun tuntiryhmän aikoihin.
                  {formData.templateGroupName && templateGroups[formData.templateGroupName] && (
                    <span className="block mt-1">
                      Luodaan {templateGroups[formData.templateGroupName].length} oppituntia viikossa.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'CLOSE_MODALS' })}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Peruuta
                </button>
                <button
                  type="submit"
                  disabled={templateGroupNames.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedRecurringClass ? 'Päivitä' : 'Luo oppitunnit'}
                </button>
              </div>
            </form>
          ) : (
            <AttachmentSection
              files={files}
              onFilesChange={setFiles}
              fileInputId="file-upload-recurring"
            />
          )}
        </div>
      </div>
    </div>
  );
}
