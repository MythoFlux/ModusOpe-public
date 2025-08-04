// src/components/Modals/RecurringClassModal.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Type, FileText, Clock, File, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useApp, useAppServices } from '../../contexts/AppContext';
import { RecurringClass, FileAttachment } from '../../types';
import AttachmentSection from '../Shared/AttachmentSection';
import FormInput from '../Forms/FormInput';
import FormTextarea from '../Forms/FormTextarea';
import FormSelect from '../Forms/FormSelect';

export default function RecurringClassModal() {
  const { state, dispatch } = useApp();
  const services = useAppServices();
  const { showRecurringClassModal, selectedRecurringClass, scheduleTemplates, courseModalInfo, session } = state;
  const [isLoading, setIsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'details' | 'files'>('details');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    template_group_name: '',
    start_date: '',
    end_date: ''
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

  const templateGroupNames = React.useMemo(() => Object.keys(templateGroups), [templateGroups]);

  useEffect(() => {
    if (selectedRecurringClass) {
      const template = scheduleTemplates.find(t => t.id === selectedRecurringClass.schedule_template_id);
      setFormData({
        title: selectedRecurringClass.title,
        description: selectedRecurringClass.description || '',
        template_group_name: template?.name || '',
        start_date: selectedRecurringClass.start_date.toISOString().split('T')[0],
        end_date: selectedRecurringClass.end_date.toISOString().split('T')[0]
      });
      setFiles(selectedRecurringClass.files || []);
    } else {
      const today = new Date();
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      
      setFormData({
        title: '',
        description: '',
        template_group_name: templateGroupNames[0] || '',
        start_date: today.toISOString().split('T')[0],
        end_date: endOfYear.toISOString().split('T')[0]
      });
      setFiles([]);
    }
    setActiveTab('details');
  }, [selectedRecurringClass, scheduleTemplates, templateGroupNames]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    
    const selectedTemplates = templateGroups[formData.template_group_name];
    if (!selectedTemplates || selectedTemplates.length === 0) return;
    setIsLoading(true);

    const classesToCreate: RecurringClass[] = selectedTemplates.map(template => ({
      id: uuidv4(), // Supabase korvaa tämän, mutta tarvitaan clientilla
      user_id: session.user.id,
      title: formData.title,
      description: formData.description,
      schedule_template_id: template.id,
      start_date: new Date(formData.start_date),
      end_date: new Date(formData.end_date),
      color: template.color,
      group_name: formData.template_group_name,
      project_id: courseModalInfo?.id,
      files: files
    }));

    try {
        if (selectedRecurringClass) {
            // Päivityslogiikka vaatisi monimutkaisemman service-funktion,
            // joten keskitytään nyt vain lisäämiseen.
            // await services.updateRecurringClasses(...);
            alert("Toistuvien tuntien muokkausta ei ole vielä toteutettu.");
        } else {
            await services.addRecurringClasses(classesToCreate);
        }
        dispatch({ type: 'CLOSE_MODALS' });
    } catch (error: any) {
        alert(`Tallennus epäonnistui: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const getTemplateGroupInfo = (groupName: string) => {
    const templates = templateGroups[groupName];
    if (!templates || templates.length === 0) return '';
    
    const weekDays = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'];
    const timeSlots = templates.map(template => 
      `${weekDays[template.day_of_week]} ${template.start_time}-${template.end_time}`
    );
    
    return timeSlots.join(', ');
  };

  if (!showRecurringClassModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header ja tabit pysyvät samoina */}
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
              {/* Formikentät pysyvät samoina */}
              <FormInput id="class-title" label="Oppitunnin nimi" icon={<Type className="w-4 h-4 inline mr-2" />} type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="esim. Matematiikka 9A - Algebra" />
              <FormTextarea id="class-description" label="Kuvaus" icon={<FileText className="w-4 h-4 inline mr-2" />} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} placeholder="Oppitunnin kuvaus" />
              <div>
                <FormSelect id="class-template-group" label="Tuntiryhmä" icon={<Clock className="w-4 h-4 inline mr-2" />} required value={formData.template_group_name} onChange={(e) => setFormData({ ...formData, template_group_name: e.target.value })}>
                  <option value="">Valitse tuntiryhmä</option>
                  {templateGroupNames.map(groupName => ( <option key={groupName} value={groupName}> {groupName} ({templateGroups[groupName].length} aikaa) </option> ))}
                </FormSelect>
                {formData.template_group_name && ( <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800"> <strong>Ajankohdat:</strong> {getTemplateGroupInfo(formData.template_group_name)} </div> )}
                {templateGroupNames.length === 0 && ( <p className="text-sm text-red-600 mt-1"> Luo ensin tuntiryhmä kiertotuntikaavio-näkymässä </p> )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormInput id="class-start-date" label="Alkupäivä" icon={<Calendar className="w-4 h-4 inline mr-2" />} type="date" required value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                <FormInput id="class-end-date" label="Loppupäivä" type="date" required value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800"> <strong>Huomio:</strong> Tämä luo toistuvat oppitunnit valitun ajanjakson aikana kaikkiin valitun tuntiryhmän aikoihin. {formData.template_group_name && templateGroups[formData.template_group_name] && ( <span className="block mt-1"> Luodaan {templateGroups[formData.template_group_name].length} oppituntia viikossa. </span> )} </p>
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
                  disabled={isLoading || templateGroupNames.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
