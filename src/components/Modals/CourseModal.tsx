// src/components/Modals/CourseModal.tsx
import React, { useState, useEffect } from 'react';
import { X, BookOpen, FileText, Calendar, Clock, Loader2 } from 'lucide-react';
import { useApp, useAppServices } from '../../contexts/AppContext';
import { useConfirmation } from '../../hooks/useConfirmation';
import { DEFAULT_COLOR } from '../../constants/colors';
import { Project } from '../../types';
import FormInput from '../Forms/FormInput';
import FormTextarea from '../Forms/FormTextarea';
import FormSelect from '../Forms/FormSelect';
import ColorSelector from '../Forms/ColorSelector';

export default function CourseModal() {
  const { state, dispatch } = useApp();
  const services = useAppServices();
  const { showCourseModal, courseModalInfo, projects, scheduleTemplates, session } = state;
  const { getConfirmation } = useConfirmation();
  const [isLoading, setIsLoading] = useState(false);

  const selectedCourse = courseModalInfo?.id
    ? projects.find(p => p.id === courseModalInfo.id && p.type === 'course')
    : null;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: DEFAULT_COLOR,
    start_date: '',
    end_date: '',
    template_group_name: ''
  });

  useEffect(() => {
    if (selectedCourse) {
      setFormData({
        name: selectedCourse.name,
        description: selectedCourse.description || '',
        color: selectedCourse.color,
        start_date: new Date(selectedCourse.start_date).toISOString().split('T')[0],
        end_date: selectedCourse.end_date ? new Date(selectedCourse.end_date).toISOString().split('T')[0] : '',
        template_group_name: ''
      });
    } else {
      const today = new Date();
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      setFormData({
        name: '',
        description: '',
        color: DEFAULT_COLOR,
        start_date: today.toISOString().split('T')[0],
        end_date: endOfYear.toISOString().split('T')[0], // Asetetaan oletusloppupäivä
        template_group_name: ''
      });
    }
  }, [selectedCourse, showCourseModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
        alert("Sinun täytyy olla kirjautunut luodaksesi kurssin.");
        return;
    }
    // Varmistetaan, että päättymispäivä on valittu, jos tuntipohja on valittu
    if (formData.template_group_name && !formData.end_date) {
        alert("Valitse kurssille päättymispäivä, jotta oppitunnit voidaan luoda oikein.");
        return;
    }
    setIsLoading(true);

    const courseData: any = {
      id: selectedCourse?.id,
      name: formData.name,
      description: formData.description,
      type: 'course',
      color: formData.color,
      start_date: new Date(formData.start_date + 'T00:00:00'),
      end_date: formData.end_date ? new Date(formData.end_date + 'T00:00:00') : undefined,
      tasks: selectedCourse?.tasks || [],
      files: selectedCourse?.files || [],
      template_group_name: formData.template_group_name,
      user_id: session.user.id
    };

    try {
        if (selectedCourse) {
            await services.updateProject(courseData as Project);
        } else {
            await services.addProject(courseData);
        }
        dispatch({ type: 'CLOSE_MODALS' });
    } catch (error: any) {
        alert(`Tallennus epäonnistui: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedCourse) {
      const confirmed = await getConfirmation({
        title: 'Vahvista poisto',
        message: `Haluatko varmasti poistaa kurssin "${selectedCourse.name}"? Tämä poistaa myös kaikki kurssiin liittyvät oppitunnit ja tapahtumat. Toimintoa ei voi perua.`
      });
      if (confirmed) {
        setIsLoading(true);
        try {
            await services.deleteProject(selectedCourse.id);
            dispatch({ type: 'CLOSE_MODALS' });
        } catch (error: any) {
            alert(`Poisto epäonnistui: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
      }
    }
  };

  if (!showCourseModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
                {selectedCourse ? 'Muokkaa kurssia' : 'Luo uusi kurssi'}
            </h2>
            <button
                onClick={() => dispatch({ type: 'CLOSE_MODALS' })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
            >
                <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                 <FormInput
                    id="course-name"
                    label="Kurssin nimi"
                    icon={<BookOpen className="w-4 h-4 inline mr-2" />}
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Esim. FY7"
                 />

                {!selectedCourse && (
                  <div>
                      <FormSelect
                          id="template-group"
                          label="Valitse tuntiryhmä (luo oppitunnit automaattisesti)"
                          icon={<Clock className="w-4 h-4 inline mr-2" />}
                          value={formData.template_group_name}
                          onChange={(e) => {
                              const groupName = e.target.value;
                              setFormData({
                                  ...formData,
                                  template_group_name: groupName,
                                  name: formData.name || groupName
                              });
                          }}
                      >
                          <option value="">Ei valintaa (luo tyhjä kurssi)</option>
                          {[...new Set(scheduleTemplates.map(t => t.name))].map(groupName => (
                              <option key={groupName} value={groupName}>
                                  {groupName}
                              </option>
                          ))}
                      </FormSelect>
                      <p className="text-xs text-gray-500 mt-1">Valitsemalla tuntiryhmän luot kurssille oppitunnit automaattisesti kiertotuntikaavion pohjalta.</p>
                  </div>
                )}

                <FormTextarea
                    id="course-description"
                    label="Muistiinpanot"
                    icon={<FileText className="w-4 h-4 inline mr-2" />}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={10}
                    placeholder="Kirjoita kuvaus tai lisää muistiinpanoja"
                />

                <ColorSelector
                  label="Väri"
                  selectedColor={formData.color}
                  onChange={(color) => setFormData({ ...formData, color })}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    id="start_date"
                    label="Alkamispäivä"
                    icon={<Calendar className="w-4 h-4 inline mr-2" />}
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                  <FormInput
                    id="end_date"
                    label="Päättymispäivä"
                    type="date"
                    required // Tehdään vaadituksi, jos tuntipohja valitaan
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>

                <div className="flex justify-between pt-4 border-t border-gray-200 mt-4">
                    {selectedCourse && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isLoading}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Poista kurssi
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
                            {selectedCourse ? 'Päivitä kurssi' : 'Luo kurssi'}
                        </button>
                    </div>
                </div>
              </form>
          </div>
      </div>
    </div>
  );
}
