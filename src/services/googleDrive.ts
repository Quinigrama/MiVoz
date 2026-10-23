/* Mi Voz · Servicio de Google Drive (Sincronización en la carpeta "MiVoz") */
import { getCachedToken } from './googleAuth';

export interface DriveItem {
  id: string;
  name: string;
  size?: string;
  modifiedTime: string;
  mimeType: string;
}

const FOLDER_NAME = 'MiVoz';
let cachedFolderId: string | null = null;

async function getAuthHeader(): Promise<string> {
  const token = getCachedToken();
  if (!token) {
    throw new Error('Debes iniciar sesión con Google para sincronizar con Google Drive.');
  }
  return `Bearer ${token}`;
}

/**
 * Busca o crea la carpeta "MiVoz" en el Google Drive del usuario
 */
export async function getOrCreateMiVozFolder(): Promise<string> {
  if (cachedFolderId) return cachedFolderId;

  const authHeader = await getAuthHeader();
  const query = `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: authHeader }
  });

  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error al buscar la carpeta en Drive (${searchRes.status})`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    cachedFolderId = searchData.files[0].id;
    return cachedFolderId!;
  }

  // Si no existe, crear la carpeta MiVoz
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error al crear la carpeta MiVoz (${createRes.status})`);
  }

  const createData = await createRes.json();
  cachedFolderId = createData.id;
  return cachedFolderId!;
}

/**
 * Lista todos los archivos dentro de la carpeta "MiVoz"
 */
export async function listMiVozFiles(): Promise<DriveItem[]> {
  const folderId = await getOrCreateMiVozFolder();
  const authHeader = await getAuthHeader();

  const query = `'${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,size,modifiedTime,mimeType)&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: authHeader }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error al listar archivos de Drive (${res.status})`);
  }

  const data = await res.json();
  return (data.files || []) as DriveItem[];
}

/**
 * Sube un archivo a la carpeta "MiVoz" en Google Drive usando multipart/related
 */
export async function uploadFileToMiVoz(
  blob: Blob,
  fileName: string,
  mimeType: string = 'application/zip'
): Promise<DriveItem> {
  const folderId = await getOrCreateMiVozFolder();
  const authHeader = await getAuthHeader();

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaHeader = `Content-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;

  // Convert Blob to Base64 to ensure boundary binary compatibility
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  const base64Data = btoa(binary);

  const multipartBody = delimiter + metaPart + delimiter + mediaHeader + base64Data + closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,modifiedTime,mimeType',
    {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error al subir archivo a Drive (${uploadRes.status})`);
  }

  return (await uploadRes.json()) as DriveItem;
}

/**
 * Descarga el contenido binario (Blob) de un archivo desde Google Drive
 */
export async function downloadFileFromDrive(fileId: string): Promise<Blob> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: authHeader }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error al descargar de Drive (${res.status})`);
  }

  return await res.blob();
}

/**
 * Elimina un archivo de Google Drive (Requisito: confirmación explícita)
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: authHeader }
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error al borrar archivo de Drive (${res.status})`);
  }
}
