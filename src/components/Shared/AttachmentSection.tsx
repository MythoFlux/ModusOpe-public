// src/components/Shared/AttachmentSection.tsx
import React, { useState } from 'react';
import { File, Upload, ExternalLink, Download, Trash2, FolderOpen } from 'lucide-react';
import GoogleDriveBrowser from '../GoogleDrive/GoogleDriveBrowser';
import { FileAttachment } from '../../types';

interface AttachmentSectionProps {
  files: FileAttachment[];
  onFilesChange: (files: FileAttachment[]) => void;
  fileInputId: string;
}

export default function AttachmentSection({ files, onFilesChange, fileInputId }: AttachmentSectionProps) {
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');
  const [showGoogleDriveBrowser, setShowGoogleDriveBrowser] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    const newFiles = uploadedFiles.map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: 'upload' as const,
      size: file.size,
      upload_date: new Date()
    }));
    onFilesChange([...files, ...newFiles]);
  };

  const handleGoogleDriveAdd = () => {
    if (!googleDriveUrl.trim()) return;
    
    let fileName = 'Google Drive -tiedosto';
    try {
      const url = new URL(googleDriveUrl);
      const pathParts = url.pathname.split('/');
      const fileId = pathParts[pathParts.indexOf('d') + 1] || pathParts[pathParts.length - 1];
      fileName = `Google Drive -tiedosto (${fileId.substring(0, 8)}...)`;
    } catch (e) {
      // Käytä oletusnimeä, jos URL-jäsennys epäonnistuu
    }

    const newFile: FileAttachment = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: fileName,
      type: 'google-drive' as const,
      url: googleDriveUrl,
      upload_date: new Date()
    };
    
    onFilesChange([...files, newFile]);
    setGoogleDriveUrl('');
  };

  const handleGoogleDriveFilesSelected = (selectedFiles: any[]) => {
    const newFiles = selectedFiles.map(file => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: 'google-drive' as const,
      url: file.webViewLink || file.webContentLink,
      size: file.size ? parseInt(file.size) : undefined,
      upload_date: new Date()
    }));
    
    onFilesChange([...files, ...newFiles]);
    setShowGoogleDriveBrowser(false);
  };

  const handleFileDelete = (fileId: string) => {
    onFilesChange(files.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Tiedostojen latausosio */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Liitetiedostot</h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Vedä tiedostoja tähän tai klikkaa valitaksesi
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id={fileInputId}
            />
            <label
              htmlFor={fileInputId}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Valitse tiedostoja
            </label>
          </div>
        </div>

        {/* Google Drive -osio */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Google Drive</h3>
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowGoogleDriveBrowser(true)}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FolderOpen className="w-5 h-5 mr-2" />
              Selaa Google Drive -tiedostoja
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Kirjaudu Google-tilillesi ja selaa tiedostojasi suoraan
            </p>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tai liitä linkki manuaalisesti:</h4>
            <div className="flex space-x-2">
              <input
                type="url"
                value={googleDriveUrl}
                onChange={(e) => setGoogleDriveUrl(e.target.value)}
                placeholder="Liitä Google Drive -tiedoston linkki..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleGoogleDriveAdd}
                disabled={!googleDriveUrl.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Varmista, että linkki on julkinen tai jaettu asianmukaisesti
            </p>
          </div>
        </div>

        {/* Tiedostolista */}
        {files.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Liitetyt tiedostot</h3>
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    {file.type === 'google-drive' ? <ExternalLink className="w-5 h-5 text-green-600" /> : <File className="w-5 h-5 text-blue-600" />}
                    <div>
                      <div className="font-medium text-gray-900">{file.name}</div>
                      <div className="text-sm text-gray-500">
                        {file.type === 'google-drive' ? 'Google Drive' : file.size ? formatFileSize(file.size) : 'Tiedosto'} • {file.upload_date.toLocaleDateString('fi-FI')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.type === 'google-drive' && file.url && (
                      <button type="button" onClick={() => window.open(file.url, '_blank')} className="p-2 text-gray-500 hover:text-blue-600 transition-colors" title="Avaa Google Drivessa">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                    {file.type === 'upload' && (
                      <button type="button" className="p-2 text-gray-500 hover:text-green-600 transition-colors" title="Lataa tiedosto">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button type="button" onClick={() => handleFileDelete(file.id)} className="p-2 text-gray-500 hover:text-red-600 transition-colors" title="Poista tiedosto">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <File className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Ei liitettyjä tiedostoja</p>
          </div>
        )}
      </div>

      {showGoogleDriveBrowser && (
        <GoogleDriveBrowser
          onFilesSelected={handleGoogleDriveFilesSelected}
          onClose={() => setShowGoogleDriveBrowser(false)}
        />
      )}
    </>
  );
}
