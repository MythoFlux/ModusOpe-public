// src/components/Modals/EventDetailsModal.tsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../supabaseClient';
import { Event, FileAttachment } from '../../types';
import { formatDate, formatTimeString } from '../../utils/dateUtils';
import { X, Pencil, Calendar, Clock, Info, FileText, Bookmark, Loader2, ExternalLink, Download, File as FileIcon } from 'lucide-react';

// Apufunktiot AttachmentSection-komponentista
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

// Yritetään muuttaa tekstissä olevat URL:t klikattaviksi linkeiksi
const renderWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
        if (part.match(urlRegex)) {
            return <a href={part} key={index} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{part}</a>;
        }
        return part;
    });
};

export default function EventDetailsModal() {
  const { state, dispatch } = useApp();
  const { showEventDetailsModal, selectedEvent, projects } = state;
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());

  const files = selectedEvent?.files || [];
  const project = selectedEvent?.project_id ? projects.find(p => p.id === selectedEvent.project_id) : null;

  useEffect(() => {
    if (!showEventDetailsModal || !files.length) {
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
  }, [showEventDetailsModal, files]);
  
  if (!showEventDetailsModal || !selectedEvent) return null;

  const handleClose = () => dispatch({ type: 'CLOSE_MODALS' });
  const handleEdit = () => dispatch({ type: 'OPEN_EVENT_EDIT_MODAL' });

  const isDeadline = selectedEvent.type === 'deadline';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
             <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedEvent.color }} />
             <h2 className="text-lg font-semibold text-gray-900 truncate">
                {selectedEvent.title}
             </h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Aika ja paikka */}
          <div className="flex items-center space-x-6 text-gray-700">
            <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{formatDate(selectedEvent.date)}</span>
            </div>
            {selectedEvent.start_time && (
                 <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>
                        {formatTimeString(selectedEvent.start_time)}
                        {selectedEvent.end_time && ` - ${formatTimeString(selectedEvent.end_time)}`}
                    </span>
                 </div>
            )}
          </div>
          
          {/* Projekti */}
          {project && (
            <div className="flex items-center space-x-2 text-gray-700">
                <Bookmark className="w-4 h-4 text-gray-500" />
                <span>Liittyy projektiin: <span className="font-medium" style={{ color: project.color }}>{project.name}</span></span>
            </div>
          )}

          {/* Lisätiedot (linkit) */}
          {selectedEvent.more_info && (
            <div>
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-800 mb-2">
                    <Info className="w-4 h-4 text-gray-500" />
                    <span>Lisätiedot ja linkit</span>
                </div>
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md prose prose-sm">
                    <p className="whitespace-pre-wrap break-words">{renderWithLinks(selectedEvent.more_info)}</p>
                </div>
            </div>
          )}

          {/* Kuvaus */}
          {selectedEvent.description && (
            <div>
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-800 mb-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span>Kuvaus / Muistiinpanot</span>
                </div>
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md prose prose-sm">
                    <p className="whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
            </div>
          )}
          
          {/* Liitteet */}
          {files.length > 0 && (
             <div>
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-800 mb-2">
                    <FileIcon className="w-4 h-4 text-gray-500" />
                    <span>Liitteet</span>
                </div>
                <div className="space-y-2">
                  {files.map((file) => {
                    const downloadUrl = file.type === 'upload' ? signedUrls.get(file.url!) : file.url;
                    const canViewInBrowser = file.name ? isWebViewable(file.name) : false;
                    
                    return (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-3 min-w-0">
                          {file.type === 'google-drive' ? <ExternalLink className="w-5 h-5 text-green-600 flex-shrink-0" /> : <FileIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{file.name}</div>
                            <div className="text-sm text-gray-500">
                              {file.type === 'google-drive' ? 'Google Drive' : file.size ? formatFileSize(file.size) : 'Tiedosto'} • {new Date(file.upload_date).toLocaleDateString('fi-FI')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {downloadUrl ? (
                            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                              title={ file.type === 'google-drive' ? "Avaa Google Drivessa" : canViewInBrowser ? "Avaa tiedosto" : "Lataa tiedosto" }>
                              {file.type === 'google-drive' || (file.type === 'upload' && canViewInBrowser) ? (
                                <ExternalLink className="w-4 h-4" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </a>
                          ) : file.type === 'upload' ? (
                            <div className="p-2"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
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
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Sulje
          </button>
          {!isDeadline && (
            <button
                type="button"
                onClick={handleEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
                <Pencil className="w-4 h-4 mr-2" />
                Muokkaa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
