// src/components/Modals/CourseModal.tsx
// ... (importit ennallaan)

export default function CourseModal() {
  const { state, dispatch } = useApp();
  const { showCourseModal, courseModalInfo, projects, scheduleTemplates, session } = state;

  const selectedCourse = courseModalInfo?.id
    ? projects.find(p => p.id === courseModalInfo.id && p.type === 'course')
    : null;

  // --- NÄMÄ RIVIT ON MUUTETTU ---
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: DEFAULT_COLOR,
    start_date: '',
    end_date: '',
    templateGroupName: ''
  });
  // ------------------------------

  useEffect(() => {
    if (selectedCourse) {
      // --- NÄMÄ RIVIT ON MUUTETTU ---
      setFormData({
        name: selectedCourse.name,
        description: selectedCourse.description || '',
        color: selectedCourse.color,
        start_date: new Date(selectedCourse.start_date).toISOString().split('T')[0],
        end_date: selectedCourse.end_date ? new Date(selectedCourse.end_date).toISOString().split('T')[0] : '',
        templateGroupName: ''
      });
      // ------------------------------
    } else {
      // --- NÄMÄ RIVIT ON MUUTETTU ---
      setFormData({
        name: '',
        description: '',
        color: DEFAULT_COLOR,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        templateGroupName: ''
      });
      // ------------------------------
    }
  }, [selectedCourse, showCourseModal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
        alert("Sinun täytyy olla kirjautunut luodaksesi kurssin.");
        return;
    }

    // --- NÄMÄ RIVIT ON MUUTETTU ---
    const courseData: any = {
      id: selectedCourse?.id || undefined,
      name: formData.name,
      description: formData.description,
      type: 'course',
      color: formData.color,
      start_date: new Date(formData.start_date + 'T00:00:00'),
      end_date: formData.end_date ? new Date(formData.end_date + 'T00:00:00') : undefined,
      tasks: selectedCourse?.tasks || [],
      files: selectedCourse?.files || [],
      templateGroupName: formData.templateGroupName,
      user_id: session.user.id
    };
    // ------------------------------

    if (selectedCourse) {
      dispatch({ type: 'UPDATE_PROJECT', payload: { ...courseData, id: selectedCourse.id } });
    } else {
      dispatch({ type: 'ADD_PROJECT', payload: courseData });
    }

    dispatch({ type: 'CLOSE_MODALS' });
  };
  
  // ... (LOPUT TIEDOSTOSTA ON ENNALLAAN, PAITSI JSX-OSIOSSA)
  
  // --- MYÖS JSX-OSIOSSA TÄYTYY MUUTTAA VIITTAUKSET ---
  return (
    // ...
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  id="start-date"
                  label="Alkamispäivä"
                  icon={<Calendar className="w-4 h-4 inline mr-2" />}
                  type="date"
                  required
                  // --- MUUTETTU ---
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
                <FormInput
                  id="end-date"
                  label="Päättymispäivä"
                  type="date"
                  // --- MUUTETTU ---
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
    // ...
  );
}
