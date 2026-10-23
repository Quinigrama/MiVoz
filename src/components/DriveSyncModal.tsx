import React, { useState, useEffect } from 'react';
import {
  loginWithGoogle,
  logoutGoogle,
  subscribeAuth,
  getCachedToken,
  getCurrentGoogleUser
} from '../services/googleAuth';
import {
  listMiVozFiles,
  uploadFileToMiVoz,
  downloadFileFromDrive,
  deleteFileFromDrive,
  DriveItem
} from '../services/googleDrive';
import { buildBackupZip, importBackupZip, clips, loadAllSyllables } from '../services/spanishSpeech';
import { currentUser, markBackedUp } from '../services/users';

interface DriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

export const DriveSyncModal: React.FC<DriveSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete
}) => {
  const [googleUser, setGoogleUser] = useState(getCurrentGoogleUser());
  const [hasToken, setHasToken] = useState(!!getCachedToken());
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [restoringFileId, setRestoringFileId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DriveItem | null>(null);

  useEffect(() => {
    const unsub = subscribeAuth((user, token) => {
      setGoogleUser(user);
      setHasToken(!!token);
      if (token) {
        refreshFileList();
      } else {
        setFiles([]);
      }
    });
    return unsub;
  }, []);

  const refreshFileList = async () => {
    setIsLoadingFiles(true);
    setStatusMsg(null);
    try {
      const items = await listMiVozFiles();
      setFiles(items);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Error al conectar con Google Drive', isError: true });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    setStatusMsg(null);
    try {
      await loginWithGoogle();
      setStatusMsg({ text: 'Conectado a Google Drive correctamente.' });
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'No se pudo iniciar sesión con Google.', isError: true });
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutGoogle();
      setFiles([]);
      setStatusMsg({ text: 'Sesión de Google cerrada.' });
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Error al cerrar sesión.', isError: true });
    }
  };

  const handleUploadCurrentBackup = async () => {
    if (!clips.size) {
      setStatusMsg({ text: 'Aún no tienes sílabas grabadas para guardar.', isError: true });
      return;
    }
    setIsUploading(true);
    setStatusMsg({ text: 'Generando copia y subiendo a MiVoz en Google Drive…' });
    try {
      const blob = buildBackupZip();
      const d = new Date();
      const z = (n: number) => String(n).padStart(2, '0');
      const uName = currentUser().name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const fileName = `mi-voz-silabas-${uName}-${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}.zip`;

      await uploadFileToMiVoz(blob, fileName, 'application/zip');
      markBackedUp('silabas');
      setStatusMsg({ text: `¡Copia «${fileName}» guardada en la carpeta MiVoz de tu Google Drive!` });
      await refreshFileList();
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Error al subir la copia a Google Drive.', isError: true });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRestoreFile = async (file: DriveItem) => {
    setRestoringFileId(file.id);
    setStatusMsg({ text: `Descargando «${file.name}» desde Google Drive…` });
    try {
      const blob = await downloadFileFromDrive(file.id);
      setStatusMsg({ text: 'Restaurando banco de sílabas…' });
      const result = await importBackupZip(blob);
      await loadAllSyllables();
      markBackedUp('silabas');
      setStatusMsg({
        text: `¡Restauración completada! ${result.added} sílabas nuevas, ${result.replaced} actualizadas, ${result.vers} versiones extra.`
      });
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Error al restaurar el archivo desde Drive.', isError: true });
    } finally {
      setRestoringFileId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setStatusMsg({ text: `Eliminando «${target.name}» de Google Drive…` });
    try {
      await deleteFileFromDrive(target.id);
      setStatusMsg({ text: `«${target.name}» eliminado de tu Google Drive.` });
      await refreshFileList();
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Error al eliminar el archivo de Google Drive.', isError: true });
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '';
    const b = parseInt(bytes, 10);
    if (isNaN(b)) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        zIndex: 1000,
        overflowY: 'auto'
      }}
      onClick={e => {
        if (e.target === e.currentTarget && !isUploading && !restoringFileId) {
          onClose();
        }
      }}
    >
      <div
        className="panel"
        style={{
          maxWidth: 640,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          position: 'relative'
        }}
      >
        <div className="row between">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>☁️</span>
            <div>
              <h2 id="drive-modal-title" style={{ margin: 0, font: '800 20px/1.2 var(--display)' }}>
                Google Drive · Carpeta «MiVoz»
              </h2>
              <span className="note">Sincroniza tus grabaciones entre el móvil y el ordenador</span>
            </div>
          </div>
          <button className="ghost small" onClick={onClose} aria-label="Cerrar ventana">
            ✕
          </button>
        </div>

        {/* AUTHENTICATION STATE */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}
        >
          {googleUser && hasToken ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {googleUser.photoURL ? (
                <img
                  src={googleUser.photoURL}
                  alt={googleUser.displayName || 'Usuario'}
                  referrerPolicy="no-referrer"
                  style={{ width: 40, height: 40, borderRadius: '50%' }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700
                  }}
                >
                  {(googleUser.displayName || googleUser.email || 'G')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                  {googleUser.displayName || 'Usuario de Google'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{googleUser.email}</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>Conecta tu cuenta de Google</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Guarda tus sílabas en una carpeta privada para acceder desde cualquier dispositivo.
              </div>
            </div>
          )}

          <div>
            {googleUser && hasToken ? (
              <button className="ghost small" onClick={handleSignOut}>
                Desconectar
              </button>
            ) : (
              <button
                className="btn primary small"
                onClick={handleSignIn}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  fontWeight: 600
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 48 48"
                  style={{ display: 'block', verticalAlign: 'middle' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>Conectar con Google</span>
              </button>
            )}
          </div>
        </div>

        {statusMsg && (
          <div className={`status ${statusMsg.isError ? 'err' : 'ok'}`} style={{ padding: '4px 0' }}>
            {statusMsg.text}
          </div>
        )}

        {/* ACTIONS & FILE LIST */}
        {googleUser && hasToken && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div className="row between">
              <button
                className="primary"
                onClick={handleUploadCurrentBackup}
                disabled={isUploading || !!restoringFileId}
              >
                {isUploading ? 'Subiendo…' : '☁️ Guardar banco actual en MiVoz'}
              </button>
              <button
                className="ghost small"
                onClick={refreshFileList}
                disabled={isLoadingFiles || isUploading}
              >
                🔄 Actualizar lista
              </button>
            </div>

            <div>
              <div className="label" style={{ marginBottom: 8 }}>
                Archivos en tu carpeta «MiVoz» en Google Drive ({files.length})
              </div>

              {isLoadingFiles ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>
                  Consultando tu Google Drive…
                </div>
              ) : files.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    background: 'var(--bg)',
                    borderRadius: 10,
                    border: '1px dashed var(--line)'
                  }}
                >
                  <p style={{ margin: '0 0 8px', color: 'var(--ink)', fontWeight: 600 }}>
                    La carpeta «MiVoz» está vacía en tu Drive
                  </p>
                  <p className="note" style={{ margin: 0 }}>
                    Pulsa «Guardar banco actual en MiVoz» para subir tu primera copia de seguridad.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                    maxHeight: 280,
                    overflowY: 'auto'
                  }}
                >
                  {files.map(file => {
                    const isRestoring = restoringFileId === file.id;

                    return (
                      <div
                        key={file.id}
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: 'var(--bg)',
                          border: '1px solid var(--line)'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                          <div
                            style={{
                              font: '600 14px var(--mono)',
                              color: 'var(--ink)',
                              wordBreak: 'break-all'
                            }}
                          >
                            📦 {file.name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {formatDate(file.modifiedTime)}
                            {file.size ? ` · ${formatFileSize(file.size)}` : ''}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            className="small primary"
                            disabled={isRestoring || isUploading}
                            onClick={() => handleRestoreFile(file)}
                            title="Restaurar este banco de sílabas en tu navegador"
                          >
                            {isRestoring ? 'Cargando…' : 'Restaurar'}
                          </button>
                          <button
                            className="small ghost"
                            disabled={isRestoring || isUploading}
                            onClick={() => setDeleteTarget(file)}
                            style={{ color: 'var(--rec)' }}
                            title="Eliminar archivo de Google Drive"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXPLICIT CONFIRMATION MODAL FOR DELETION (Mandatory workspace-integration rule) */}
        {deleteTarget && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'grid',
              placeItems: 'center',
              padding: 16,
              zIndex: 1100
            }}
          >
            <div
              className="panel"
              style={{
                maxWidth: 440,
                width: '100%',
                border: '1.5px solid var(--rec)'
              }}
            >
              <div className="label" style={{ color: 'var(--rec)' }}>
                Confirmación necesaria
              </div>
              <p style={{ margin: 0, font: '600 16px var(--body)', color: 'var(--ink)' }}>
                ¿Deseas eliminar «{deleteTarget.name}» de tu Google Drive?
              </p>
              <p className="note" style={{ margin: 0 }}>
                Esta acción eliminará el archivo de la carpeta MiVoz en la nube. No se puede deshacer.
              </p>
              <div className="row" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
                <button className="ghost small" onClick={() => setDeleteTarget(null)}>
                  Cancelar
                </button>
                <button
                  className="recbtn small"
                  onClick={handleConfirmDelete}
                  style={{ background: 'var(--rec)', borderColor: 'var(--rec)', color: '#fff' }}
                >
                  Sí, eliminar archivo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
