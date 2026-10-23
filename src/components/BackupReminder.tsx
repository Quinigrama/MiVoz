import React from 'react';
import { snoozeBackup } from '../services/users';

interface BackupReminderProps {
  page: 'silabas' | 'ingles';
  shouldNag: boolean;
  message: string;
  onBackupNow: () => void;
  onDriveBackup?: () => void;
  onDismiss: () => void;
}

export const BackupReminder: React.FC<BackupReminderProps> = ({
  page,
  shouldNag,
  message,
  onBackupNow,
  onDriveBackup,
  onDismiss
}) => {
  if (!shouldNag || !message) return null;

  const handleSnooze = () => {
    snoozeBackup(page);
    onDismiss();
  };

  return (
    <div className="mvu-nag" role="status" style={{ marginTop: 12 }}>
      <p>💾 <b>{message}</b></p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="primary" onClick={onBackupNow}>
          Guardar copia (.zip)
        </button>
        {onDriveBackup && (
          <button className="small btn" onClick={onDriveBackup} style={{ borderColor: 'var(--accent)' }}>
            ☁️ Subir a Google Drive
          </button>
        )}
        <button className="ghost small" onClick={handleSnooze}>
          Mañana
        </button>
      </div>
    </div>
  );
};
