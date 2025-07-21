import React, { useState, useEffect } from 'react';
import { X, Search, File, Folder, Download, ExternalLink, RefreshCw, LogIn, LogOut, AlertCircle, Loader2, Settings } from 'lucide-react';
import { useGoogleDrive } from '../../hooks/useGoogleDrive';

interface GoogleDriveBrowserProps {
  onFilesSelected?: (files: any[]) => void;
  onClose: () => void;
}

const GoogleDriveBrowser: React.FC<GoogleDriveBrowserProps> = ({ onFilesSelected, onClose }) => {
  const {
    isSignedIn,
    isLoading,
    error,
    files,
    signIn,
    signOut,
    loadFiles,
    searchFiles,
    createShareableLink
  } = useGoogleDrive();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);

  // Load files when signed in
  useEffect(() => {
    if (isSignedIn) {
      loadFiles(currentFolder || undefined);
    }
  }, [isSignedIn, currentFolder, loadFiles]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchFiles(searchQuery);
    } else {
      loadFiles(currentFolder || undefined);
    }
  };

  const handleFileSelect = (file: any) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      // Navigate into folder
      setCurrentFolder(file.id);
      setSearchQuery('');
      return;
    }

    const isSelected = selectedFiles.some(f => f.id === file.id);
    if (isSelected) {
      setSelectedFiles(selectedFiles.filter(f => f.id !== file.id));
    } else {
      setSelectedFiles([...selectedFiles, file]);
    }
  };

  const handleConfirmSelection = async () => {
    if (selectedFiles.length === 0) return;

    try {
      // Create shareable links for selected files
      const filesWithLinks = await Promise.all(
        selectedFiles.map(async (file) => {
          try {
            const shareableLink = await createShareableLink(file.id);
            return {
              ...file,
              webViewLink: shareableLink,
              webContentLink: shareableLink
            };
          } catch (err) {
            console.warn(`Failed to create shareable link for ${file.name}:`, err);
            return file;
          }
        })
      );

      onFilesSelected?.(filesWithLinks);
      onClose();
    } catch (err) {
      console.error('Error processing selected files:', err);
    }
  };

  const formatFileSize = (bytes: string | undefined) => {
    if (!bytes) return '';
    const size = parseInt(bytes);
    if (size === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(size) / Math.log(k));
    return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-5 h-5 text-blue-500" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const goBack = () => {
    setCurrentFolder(null);
    setSearchQuery('');
  };

  const isInDemoMode = error && error.includes('API-tunnukset');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Google Drive Browser</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Notice */}
        {isInDemoMode && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-start space-x-3">
              <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900">Demo-tila käytössä</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Oikean Google Drive -integraation käyttöön tarvitset Google Cloud -tunnukset. 
                  Katso <strong>README.md</strong> -tiedostosta ohjeet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Authentication Section */}
        {!isSignedIn ? (
          <div className="p-6 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogIn className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isInDemoMode ? 'Demo-tila' : 'Kirjaudu Google Drive -tilillesi'}
              </h3>
              <p className="text-gray-600 mb-6">
                {isInDemoMode 
                  ? 'Näet esimerkkitiedostoja ilman oikeaa kirjautumista'
                  : 'Kirjaudu sisään nähdäksesi ja valitaksesi tiedostoja Google Drivestasi'
                }
              </p>
            </div>

            {error && !isInDemoMode && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            <button
              onClick={signIn}
              disabled={isLoading}
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5 mr-2" />
              )}
              {isInDemoMode ? 'Jatka demo-tilassa' : 'Kirjaudu Google-tilille'}
            </button>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="p-6 border-b border-gray-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {currentFolder && (
                    <button
                      onClick={goBack}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      ← Takaisin
                    </button>
                  )}
                  <button
                    onClick={() => loadFiles(currentFolder || undefined)}
                    disabled={isLoading}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  {isInDemoMode && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      Demo
                    </span>
                  )}
                  <button
                    onClick={signOut}
                    className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {isInDemoMode ? 'Poistu' : 'Kirjaudu ulos'}
                  </button>
                </div>
              </div>

              {/* Search */}
              <form onSubmit={handleSearch} className="flex space-x-2">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Hae tiedostoja..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Hae
                </button>
              </form>

              {selectedFiles.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-800">
                    {selectedFiles.length} tiedosto{selectedFiles.length !== 1 ? 'a' : ''} valittu
                  </span>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Tyhjennä valinta
                  </button>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && !isInDemoMode && (
              <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Ladataan tiedostoja...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <File className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Ei tiedostoja löytynyt</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {files.map((file) => {
                    const isSelected = selectedFiles.some(f => f.id === file.id);
                    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                    
                    return (
                      <div
                        key={file.id}
                        onClick={() => handleFileSelect(file)}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 border-blue-200'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {getFileIcon(file.mimeType)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {file.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {!isFolder && file.size && formatFileSize(file.size)}
                              {!isFolder && file.size && ' • '}
                              {new Date(file.modifiedTime).toLocaleDateString('fi-FI')}
                            </div>
                          </div>
                        </div>
                        
                        {!isFolder && file.webViewLink && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(file.webViewLink, '_blank');
                            }}
                            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Avaa Google Drivessa"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        
                        {isFolder && (
                          <div className="text-gray-400">
                            →
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Peruuta
              </button>
              <button
                onClick={handleConfirmSelection}
                disabled={selectedFiles.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Valitse {selectedFiles.length > 0 && `(${selectedFiles.length})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleDriveBrowser;