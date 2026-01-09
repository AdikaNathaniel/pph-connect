import { supabase } from '@/integrations/supabase/client';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webContentLink?: string;
  size?: string;
}

/**
 * Extract folder ID from Google Drive URL
 */
export function extractFolderIdFromUrl(url: string): string | null {
  const patterns = [
    /\/folders\/([a-zA-Z0-9-_]+)/,
    /id=([a-zA-Z0-9-_]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Load audio files from a Google Drive folder
 * Requires service account with access to the folder
 */
export async function loadAudioFilesFromDrive(folderUrl: string): Promise<DriveFile[]> {
  const folderId = extractFolderIdFromUrl(folderUrl);
  
  if (!folderId) {
    throw new Error('Invalid Google Drive folder URL');
  }

  try {
    // Call the Supabase edge function to list files from Drive
    const { data, error } = await supabase.functions.invoke('list-drive-files', {
      body: { folderId }
    });

    if (error) throw error;

    // Filter for audio files
    const audioMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      'audio/m4a',
      'audio/aac'
    ];

    const audioFiles = (data.files || []).filter((file: DriveFile) =>
      audioMimeTypes.includes(file.mimeType) || 
      file.name.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/i)
    );

    return audioFiles;
  } catch (error) {
    console.error('Error loading files from Google Drive:', error);
    throw error;
  }
}

/**
 * Get a public download URL for a Google Drive file
 */
export async function getDriveFileUrl(fileId: string): Promise<string> {
  try {
    // Call the Supabase edge function to get file URL
    const { data, error } = await supabase.functions.invoke('get-drive-file-url', {
      body: { fileId }
    });

    if (error) throw error;

    return data.url;
  } catch (error) {
    console.error('Error getting Drive file URL:', error);
    throw error;
  }
}

