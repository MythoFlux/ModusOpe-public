// src/components/Modals/TaskDetailsModal.tsx
import React, { useState, useEffect } from 'react';
import { useApp, useAppServices } from '../../contexts/AppContext';
import { supabase } from '../../supabaseClient';
import { Task, Subtask } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import { X, Pencil, Calendar, AlertCircle, FileText, CheckSquare, Circle, Bookmark, ExternalLink, Download, File as FileIcon, Loader2 } from 'lucide-react';

const isWebViewable = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension) return false;
  const viewableExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'txt'];
  return viewableExtensions.includes(extension);
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function TaskDetailsModal() {
  const { state, dispatch } = useApp();
  const services = useAppServices();
  const { showTaskDetailsModal, selectedTask, projects } = state;
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());

  // Haetaan projekti, johon tehtävä kuuluu (värin ja nimen näyttämiseksi)
  const project = selectedTask?.project_id ? projects.find(p => p.id === selectedTask.project_id) : null;
  const files = selectedTask?.files || [];

  useEffect(() => {
    if (!showTaskDetailsModal || !files.length) {
      setSignedUrls(new Map());
      return;
    }

    const generateSignedUrls = async () => {
      const uploadedFiles = files.filter(f => f.type === 'upload' && f.url);
      if (uploadedFiles.length === 0) return;

      const paths = uploadedFiles.map(f => f.url!);
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrls(paths, 3600);

      if (error) {
        console.error("Error creating signed URLs:", error);
        return;
      }

      const urlMap = new Map<string, string>();
      if (data) {
        data.forEach(item => {
          if (item.signedUrl) {
            const originalPath = paths.find(p => item.path === p);
            if (originalPath) {
              urlMap.set(originalPath, item.signedUrl);
            }
          }
        });
      }
      setSignedUrls(urlMap);
    };

    generateSignedUrls();
  }, [showTaskDetailsModal, files]);

  if (!showTaskDetailsModal || !selectedTask) return null;

  const handleClose = () => dispatch({ type: 'CLOSE_MODALS' });
  const handleEdit = () => dispatch({ type: 'OPEN_TASK_EDIT_MODAL' });

  const toggleSubtask = async (subtaskId: string, completed: boolean) => {
    if (!selectedTask.subtasks) return;

    const updatedSubtasks = selectedTask.subtasks.map(st =>
        st.id === subtaskId ? { ...st, completed } : st
    );
    const updatedTask = { ...selectedTask, subtasks: updatedSubtasks };
    
    // Päivitetään tila heti UI:ssa (optimistinen päivitys)
    dispatch({ type: 'UPDATE_TASK_SUCCESS', payload: { projectId: selectedTask.project_id, task: updatedTask } });
    
    // Päivitetään tietokantaan
    try {
        await services.updateTask(updatedTask);
    } catch (err) {
        console.error("Failed to toggle subtask:", err);
        // Tässä voisi palauttaa tilan, jos virhe, mutta yksinkertaistuksen vuoksi jätetään väliin
    }
  };

  const getPriorityBadge = (priority: string) => {
      const styles = {
          low: 'bg-green-100 text-green-800',
          medium: 'bg-yellow-100 text-yellow-800',
          high: 'bg-red-100 text-red-800'
      };
      const labels = { low: 'Matala', medium: 'Keskitaso', high: 'Korkea' };
      const p = priority as 'low' | 'medium' | 'high';
      
      return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[p] || styles.medium}`}>
              {labels[p] || 'Keskitaso'}
          </span>
      );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 overflow-hidden">
             <div className={`p-2 rounded-lg ${selectedTask.completed ? 'bg-green-100' : 'bg-gray-100'}`}>
                {selectedTask.completed ? <CheckSquare className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-gray-500" />}
             </div>
             <div className="min-w-0">
                 <h2 className={`text-lg font-semibold truncate ${selectedTask.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {selectedTask.title}
                 </h2>
                 {project && (
                    <div className="flex items-center text-sm text-gray-500 mt-0.5">
                        <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: project.color }} />
                        <span className="truncate">{project.name}</span>
                    </div>
                 )}
             </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Metadata Row */}
          <div className="flex flex-wrap gap-4 text-sm">
            {selectedTask.due_date && (
                <div className="flex items-center text-gray-700 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                    <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                    <span>{formatDate(new Date(selectedTask.due_date))}</span>
                </div>
            )}
            <div className="flex items-center">
                {getPriorityBadge(selectedTask.priority)}
            </div>
          </div>

          {/* Kuvaus */}
          {selectedTask.description && (
            <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-gray-500" />
                    Kuvaus
                </h3>
                <div className="text-gray-700 bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap leading-relaxed border border-gray-100">
                    {selectedTask.description}
                </div>
            </div>
          )}

          {/* Alitehtävät */}
          {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
            <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <CheckSquare className="w-4 h-4 mr-2 text-gray-500" />
                    Alitehtävät ({selectedTask.subtasks.filter(s => s.completed).length}/{selectedTask.subtasks.length})
                </h3>
                <div className="space-y-2">
                    {selectedTask.subtasks.map((subtask) => (
                        <div 
                            key={subtask.id} 
                            onClick={() => toggleSubtask(subtask.id, !subtask.completed)}
                            className="flex items-start p-2 hover:bg-gray-50 rounded-md cursor-pointer transition-colors group"
                        >
                            <div className={`mt-0.5 mr-3 flex-shrink-0 transition-colors ${subtask.completed ? 'text-blue-600' : 'text-gray-300 group-hover:text-blue-400'}`}>
                                {subtask.completed ? <CheckSquare className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                            </div>
                            <span className={`text-sm ${subtask.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                {subtask.title}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
          )}
          
          {/* Liitteet */}
          {files.length > 0 && (
             <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <FileIcon className="w-4 h-4 mr-2 text-gray-500" />
                    Liitteet
                </h3>
                <div className="space-y-2">
                  {files.map((file) => {
                    const downloadUrl = file.type === 'upload' ? signedUrls.get(file.url!) : file.url;
                    const canViewInBrowser = file.name ? isWebViewable(file.name) : false;
                    
                    return (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors group">
                        <div className="flex items-center space-x-3 min-w-0">
                          {file.type === 'google-drive' ? <ExternalLink className="w-5 h-5 text-green-600 flex-shrink-0" /> : <FileIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate text-sm">{file.name}</div>
                            <div className="text-xs text-gray-500">
                              {file.type === 'google-drive' ? 'Google Drive' : file.size ? formatFileSize(file.size) : 'Tiedosto'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                          {downloadUrl ? (
                            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title={ file.type === 'google-drive' ? "Avaa Google Drivessa" : canViewInBrowser ? "Avaa tiedosto" : "Lataa tiedosto" }>
                              {file.type === 'google-drive' || (file.type === 'upload' && canViewInBrowser) ? (
                                <ExternalLink className="w-4 h-4" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </a>
                          ) : file.type === 'upload' ? (
                            <div className="p-1.5"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
             </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="text-xs text-gray-500">
             {/* Tähän voisi tulla luontipäivämäärä tms. jos se olisi datassa */}
          </div>
          <div className="flex space-x-3">
            <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
            >
                Sulje
            </button>
            <button
                type="button"
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm font-medium shadow-sm"
            >
                <Pencil className="w-4 h-4 mr-2" />
                Muokkaa tietoja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
