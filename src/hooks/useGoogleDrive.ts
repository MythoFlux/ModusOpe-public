import { useState, useEffect, useCallback } from 'react';

// Käyttöliittymät ja vakiot
interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

interface UseGoogleDriveReturn {
  isSignedIn: boolean;
  isLoading: boolean;
  error: string | null;
  files: GoogleDriveFile[];
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  loadFiles: (folderId?: string) => Promise<void>;
  searchFiles: (query: string) => Promise<void>;
  createShareableLink: (fileId: string) => Promise<string | undefined>;
}

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

export function useGoogleDrive(): UseGoogleDriveReturn {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const hasValidConfig = () => {
    console.log('API Key:', import.meta.env.VITE_GOOGLE_API_KEY, 'Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    return apiKey && clientId && apiKey !== 'your_google_api_key_here' && clientId !== 'your_google_client_id_here.apps.googleusercontent.com';
  };

  const loadDemoFiles = useCallback(() => {
    const demoFiles: GoogleDriveFile[] = [
      { id: 'demo-1', name: 'Matematiikan oppimateriaali.pdf', mimeType: 'application/pdf', size: '2048576', modifiedTime: new Date().toISOString(), webViewLink: '#' },
      { id: 'demo-2', name: 'Oppitunnin suunnitelma.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: '1024000', modifiedTime: new Date(Date.now() - 86400000).toISOString(), webViewLink: '#' },
      { id: 'demo-3', name: 'Kuvat', mimeType: 'application/vnd.google-apps.folder', modifiedTime: new Date(Date.now() - 172800000).toISOString(), webViewLink: '#' }
    ];
    setFiles(demoFiles);
    setIsSignedIn(true); // Asetetaan demo-tilassa sisäänkirjautuneeksi
  }, []);

  // Yleiskäyttöinen apufunktio API-kutsuille
  const makeApiCall = useCallback(async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    if (!accessToken) throw new Error("Access token is not available");

    const headers = new Headers(options.headers || {});
    headers.append('Authorization', `Bearer ${accessToken}`);
    if (options.body) {
      headers.append('Content-Type', 'application/json');
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error.message || 'API call failed');
    }
    
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }, [accessToken]);
  
  const loadFiles = useCallback(async (folderId?: string) => {
    if (!isSignedIn || !accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      if (hasValidConfig()) {
        const url = new URL('https://www.googleapis.com/drive/v3/files');
        const query = folderId ? `'${folderId}' in parents and trashed=false` : "trashed=false";
        url.search = new URLSearchParams({
          q: query,
          pageSize: '50',
          fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink)',
          orderBy: 'modifiedTime desc'
        }).toString();
        const result = await makeApiCall<{ files: GoogleDriveFile[] }>(url.toString());
        setFiles(result.files || []);
      }
    } catch (err: any) {
      setError(`Tiedostojen lataus epäonnistui: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, accessToken, makeApiCall]);

  useEffect(() => {
    const initializeGis = () => {
      try {
        if (!hasValidConfig()) {
          setError('Google Drive -integraatio vaatii oikeat API-tunnukset. Katso README.md -tiedostosta ohjeet.');
          loadDemoFiles();
          return;
        }

        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error) {
              setError(`Kirjautumisvirhe: ${response.error}`);
              return;
            }
            if (response.access_token) {
              setAccessToken(response.access_token);
              setIsSignedIn(true);
              loadFiles();
            }
          },
        });
        setTokenClient(client);
      } catch (err) {
        setError('Google API ei ole käytettävissä. Käytetään demo-tilaa.');
        loadDemoFiles();
      }
    };
    if (window.google) {
      initializeGis();
    } else {
        // Varmistetaan, että `google` on olemassa ennen alustusta
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initializeGis;
        document.body.appendChild(script);
    }
  }, [loadDemoFiles, loadFiles]);
  
  const signIn = useCallback(async () => {
    if (hasValidConfig()) {
      if (tokenClient) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
      }
    } else {
      // Demo mode
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsLoading(false);
      setIsSignedIn(true);
      loadDemoFiles();
    }
  }, [tokenClient, loadDemoFiles]);

  const signOut = useCallback(async () => {
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    setAccessToken(null);
    setIsSignedIn(false);
    setFiles([]);
    setError(null);
  }, [accessToken]);

  const searchFiles = useCallback(async (query: string) => {
    if (!isSignedIn || !accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      if (hasValidConfig()) {
        const url = new URL('https://www.googleapis.com/drive/v3/files');
        const searchQuery = `name contains '${query}' and trashed=false`;
        url.search = new URLSearchParams({
          q: searchQuery,
          pageSize: '50',
          fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,iconLink)',
          orderBy: 'modifiedTime desc'
        }).toString();
        const result = await makeApiCall<{ files: GoogleDriveFile[] }>(url.toString());
        setFiles(result.files || []);
      } else {
        // Demo search logic
      }
    } catch (err: any) {
      setError(`Haku epäonnistui: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, accessToken, makeApiCall]);
  
  const createShareableLink = useCallback(async (fileId: string) => {
    if (!isSignedIn || !accessToken) return;
    try {
      if (hasValidConfig()) {
        await makeApiCall(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
          method: 'POST',
          body: JSON.stringify({ role: 'reader', type: 'anyone' })
        });
        const file = await makeApiCall<{ webViewLink: string }>(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`);
        return file.webViewLink;
      }
      return `https://drive.google.com/file/d/${fileId}/view`;
    } catch (err: any) {
      console.warn(`Could not create shareable link for ${fileId}: ${err.message}`);
      return `https://drive.google.com/file/d/${fileId}/view`;
    }
  }, [isSignedIn, accessToken, makeApiCall]);

  return { isSignedIn, isLoading, error, files, signIn, signOut, loadFiles, searchFiles, createShareableLink };
}

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}
