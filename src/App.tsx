import React, { useState, useEffect } from 'react';
import { SyllablesApp } from './components/SyllablesApp';
import { EnglishApp } from './components/EnglishApp';
import { UserSelector } from './components/UserSelector';
import { DriveSyncModal } from './components/DriveSyncModal';
import { loadAllSyllables, openAudioDB } from './services/spanishSpeech';
import { openEnglishDB } from './services/englishPractice';
import { subscribeAuth, getCurrentGoogleUser } from './services/googleAuth';
import { User as FirebaseUser } from 'firebase/auth';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'silabas' | 'ingles'>('silabas');
  const [isReady, setIsReady] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(getCurrentGoogleUser());
  const [hasDriveToken, setHasDriveToken] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await openAudioDB();
        await loadAllSyllables();
        await openEnglishDB();
      } catch (e) {
        console.error('Error initializing databases', e);
      } finally {
        setIsReady(true);
      }
    })();

    const unsub = subscribeAuth((user, token) => {
      setGoogleUser(user);
      setHasDriveToken(!!token);
    });
    return unsub;
  }, []);

  if (!isReady) {
    return (
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          fontFamily: 'var(--body)',
          color: 'var(--muted)'
        }}
      >
        <span>Cargando tu voz y textos…</span>
      </div>
    );
  }

  return (
    <div>
      <nav
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '16px 16px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className={currentPage === 'silabas' ? 'primary small' : 'ghost small'}
            onClick={() => setCurrentPage('silabas')}
          >
            🗣️ Sílabas con Mi Voz
          </button>
          <button
            className={currentPage === 'ingles' ? 'primary small' : 'ghost small'}
            onClick={() => setCurrentPage('ingles')}
          >
            🇬🇧 Inglés en Voz Alta
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="small"
            onClick={() => setIsDriveModalOpen(true)}
            title="Sincronizar grabaciones con la carpeta MiVoz de Google Drive"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderColor: googleUser && hasDriveToken ? 'var(--accent)' : 'var(--line)',
              background: googleUser && hasDriveToken ? 'var(--accent-soft)' : 'var(--surface)'
            }}
          >
            <span>☁️</span>
            <span>{googleUser && hasDriveToken ? 'MiVoz (Drive)' : 'Google Drive'}</span>
            {googleUser && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: hasDriveToken ? 'var(--ok)' : 'var(--rec)'
                }}
              />
            )}
          </button>

          <UserSelector onUserChanged={() => loadAllSyllables()} />
        </div>
      </nav>

      <main>
        {currentPage === 'silabas' ? (
          <SyllablesApp
            onNavigateToEnglish={() => setCurrentPage('ingles')}
            onOpenDriveSync={() => setIsDriveModalOpen(true)}
          />
        ) : (
          <EnglishApp onNavigateToSyllables={() => setCurrentPage('silabas')} />
        )}
      </main>

      <DriveSyncModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onSyncComplete={() => loadAllSyllables()}
      />
    </div>
  );
};

export default App;
