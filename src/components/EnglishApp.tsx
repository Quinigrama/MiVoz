import React, { useState, useEffect, useRef } from 'react';
import {
  EnglishText,
  DifficultWord,
  TalkHistoryItem,
  AICorrection,
  EnglishBook,
  SAMPLE_TEXT,
  openEnglishDB,
  loadKV,
  saveKV,
  loadPrefs,
  savePrefs,
  EnglishPrefs,
  parseEnglishText,
  speakersOfDialogue,
  compareSpokenText,
  speakEnglish,
  listenEnglish,
  ActiveListener,
  isSpeechRecognitionAvailable,
  cleanWord,
  displayWords,
  askAICoach
} from '../services/englishPractice';
import { currentUser, markBackedUp, checkBackupReminder, BackupStatus } from '../services/users';
import { BackupReminder } from './BackupReminder';

interface EnglishAppProps {
  onNavigateToSyllables?: () => void;
}

const TOPICS = [
  ['Describe your perfect weekend.', 'Describe tu fin de semana perfecto.'],
  ['Talk about your city and what you like about it.', 'Habla de tu ciudad y de lo que te gusta de ella.'],
  ['What did you do yesterday?', '¿Qué hiciste ayer?'],
  ['Describe your daily routine.', 'Describe tu rutina diaria.'],
  ['Talk about your favourite food and how to cook it.', 'Habla de tu comida favorita y de cómo se prepara.'],
  ['Describe a trip you remember well.', 'Describe un viaje que recuerdes bien.'],
  ['What are your plans for next summer?', '¿Qué planes tienes para el próximo verano?'],
  ['Talk about a hobby you enjoy.', 'Habla de una afición que disfrutes.'],
  ['Describe your home.', 'Describe tu casa.'],
  ['Talk about a film or series you like.', 'Habla de una película o serie que te guste.'],
  ['What would you do if you won the lottery?', '¿Qué harías si te tocara la lotería?'],
  ['Talk about your job or what you do during the day.', 'Habla de tu trabajo o de lo que haces durante el día.'],
  ['Describe a person who is important to you.', 'Describe a una persona importante para ti.'],
  ['Why do you want to speak English?', '¿Por qué quieres hablar inglés?'],
  ['Talk about the weather today and what you like to do when it rains.', 'Habla del tiempo de hoy y de lo que te gusta hacer cuando llueve.'],
  ['Describe your favourite place to relax.', 'Describe tu lugar favorito para relajarte.'],
  ['Explain how to get from your home to the nearest supermarket.', 'Explica cómo ir de tu casa al supermercado más cercano.'],
  ['Talk about technology you use every day.', 'Habla de la tecnología que usas cada día.'],
  ['What did you eat today?', '¿Qué has comido hoy?'],
  ['Describe your best friend.', 'Describe a tu mejor amigo o amiga.'],
  ['Talk about something you learned recently.', 'Habla de algo que hayas aprendido hace poco.'],
  ['What is your favourite season and why?', '¿Cuál es tu estación favorita y por qué?'],
  ['Order a meal in a restaurant, playing both the waiter and yourself.', 'Pide comida en un restaurante haciendo de camarero y de cliente.'],
  ['Talk about a problem you solved and how you did it.', 'Habla de un problema que resolviste y de cómo lo hiciste.'],
  ['Describe what you can see from your window.', 'Describe lo que ves desde tu ventana.']
];

export const EnglishApp: React.FC<EnglishAppProps> = ({ onNavigateToSyllables }) => {
  // Global settings
  const [prefs, setPrefsState] = useState<EnglishPrefs>(loadPrefs());

  // Data collections
  const [texts, setTexts] = useState<EnglishText[]>([SAMPLE_TEXT]);
  const [words, setWords] = useState<DifficultWord[]>([]);
  const [history, setHistory] = useState<TalkHistoryItem[]>([]);
  const [fixes, setFixes] = useState<AICorrection[]>([]);
  const [books, setBooks] = useState<EnglishBook[]>([]);

  // Navigation & current selections
  const [tab, setTab] = useState<'texts' | 'read' | 'dlg' | 'words' | 'talk' | 'fix'>('texts');
  const [curTextId, setCurTextId] = useState<number | string>(1);
  const [sentenceIdx, setSentenceIdx] = useState<number>(0);

  // Read mode state
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [readResult, setReadResult] = useState<any>(null);
  const [isReadingActive, setIsReadingActive] = useState(false);
  const [heardText, setHeardText] = useState('');
  const activeListenerRef = useRef<ActiveListener | null>(null);

  // Dialogue mode state
  const [dialogueRole, setDialogueRole] = useState<string>('');
  const [isDialogueRunning, setIsDialogueRunning] = useState(false);
  const [dialogueStatus, setDialogueStatus] = useState<string>('');
  const [dialogueResults, setDialogueResults] = useState<Record<number, any>>({});
  const [activeDialogueIdx, setActiveDialogueIdx] = useState<number>(-1);

  // Words mode state
  const [wordCardIdx, setWordCardIdx] = useState(0);
  const [wordAddInput, setWordAddInput] = useState('');
  const [isWordListening, setIsWordListening] = useState(false);
  const [wordFeedback, setWordFeedback] = useState('');

  // Talk mode state
  const [topicIdx, setTopicIdx] = useState(0);
  const [talkDuration, setTalkDuration] = useState(60);
  const [talkRemaining, setTalkRemaining] = useState(60);
  const [isTalking, setIsTalking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [talkInterim, setTalkInterim] = useState('');
  const [talkStats, setTalkStats] = useState<{ words: number; wpm: number; uniq: number } | null>(null);

  // Fix mode state
  const [fixInput, setFixInput] = useState('');
  const [isFixThinking, setIsFixThinking] = useState(false);
  const [currentFix, setCurrentFix] = useState<AICorrection | null>(null);
  const [fixSearch, setFixSearch] = useState('');
  const [fixCatFilter, setFixCatFilter] = useState('all');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'claude' | 'deepseek'>('gemini');

  // Text editor modal/panel
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorBody, setEditorBody] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Backup nag status
  const [nagStatus, setNagStatus] = useState<BackupStatus>({ shouldNag: false, message: '', days: 0 });

  // Load from IndexedDB
  useEffect(() => {
    (async () => {
      await openEnglishDB();
      const [t, w, h, fx, bk] = await Promise.all([
        loadKV<EnglishText[]>('texts'),
        loadKV<DifficultWord[]>('words'),
        loadKV<TalkHistoryItem[]>('history'),
        loadKV<AICorrection[]>('fixes'),
        loadKV<EnglishBook[]>('books')
      ]);

      const loadedTexts = t && t.length ? t : [SAMPLE_TEXT];
      setTexts(loadedTexts);
      setWords(w || []);
      setHistory(h || []);
      setFixes(fx || []);
      setBooks(bk || []);
      if (!t) saveKV('texts', loadedTexts);

      const s = checkBackupReminder('ingles', (w?.length || 0) + (fx?.length || 0), 'textos y palabras', 2, 7);
      setNagStatus(s);
    })();
  }, []);

  const updatePrefs = (newPrefs: Partial<EnglishPrefs>) => {
    const updated = { ...prefs, ...newPrefs };
    setPrefsState(updated);
    savePrefs(updated);
  };

  const getActiveTextObj = (): { title: string; body: string; id: number | string } | null => {
    return texts.find(t => t.id === curTextId) || texts[0] || null;
  };

  const currentObj = getActiveTextObj();
  const parsed = currentObj ? parseEnglishText(currentObj.body) : { dialogue: false, units: [] };

  // Sync dialogue role default
  useEffect(() => {
    if (parsed.dialogue && parsed.units.length) {
      const sp = speakersOfDialogue(parsed);
      if (sp.length && !sp.includes(dialogueRole)) {
        setDialogueRole(sp[sp.length > 1 ? 1 : 0]);
      }
    }
  }, [parsed]);

  // Add difficult word helper
  const handleAddWord = (w: string) => {
    const cleaned = cleanWord(w).toLowerCase();
    if (!cleaned || (cleaned.length < 2 && cleaned !== 'i')) return;
    const exists = words.find(x => x.w === cleaned);
    let nextWords = [...words];
    if (exists) {
      exists.done = false;
      exists.streak = 0;
    } else {
      nextWords.push({ w: cleaned, streak: 0, done: false, added: Date.now(), tries: 0 });
    }
    setWords(nextWords);
    saveKV('words', nextWords);
  };

  // Read: start reading sentence aloud
  const handleStartReadSentence = async () => {
    if (!parsed.units[sentenceIdx]) return;
    if (isReadingActive && activeListenerRef.current) {
      activeListenerRef.current.stop();
      setIsReadingActive(false);
      return;
    }

    const targetSentence = parsed.units[sentenceIdx].text;
    setHeardText('Te escucho… lee la frase.');
    setIsReadingActive(true);

    activeListenerRef.current = await listenEnglish({
      accent: prefs.accent,
      onInterim: (f, i) => {
        setHeardText((f + ' ' + i).trim());
      },
      onEnd: (alts, err) => {
        setIsReadingActive(false);
        activeListenerRef.current = null;
        if (!alts.length) {
          setHeardText('No he oído nada. Pulsa otra vez y lee la frase en voz alta.');
          return;
        }

        const match = compareSpokenText(targetSentence, alts);
        setReadResult(match);
        setHeardText(alts[0]);

        // Save best score
        if (currentObj && typeof currentObj.id === 'number') {
          const t = texts.find(x => x.id === currentObj.id);
          if (t) {
            t.best = t.best || {};
            t.best[sentenceIdx] = Math.max(t.best[sentenceIdx] || 0, match.score);
            saveKV('texts', texts);
          }
        }

        // Auto-add misunderstood words to difficult words
        match.words.forEach((w, i) => {
          if (match.counted[i] && !match.ok[i] && !match.maybe[i]) {
            handleAddWord(w);
          }
        });
      }
    });
  };

  // Words mode practice
  const pendingWords = words.filter(w => !w.done);
  const doneWords = words.filter(w => w.done);
  const curCardWord = pendingWords[wordCardIdx] || null;

  const handleTestWordSpeech = async () => {
    if (!curCardWord) return;
    setIsWordListening(true);
    setWordFeedback('Te escucho…');

    await listenEnglish({
      accent: prefs.accent,
      onInterim: (f, i) => setWordFeedback((f + ' ' + i).trim()),
      onEnd: alts => {
        setIsWordListening(false);
        if (!alts.length) {
          setWordFeedback('No he oído nada. Vuelve a probar.');
          return;
        }

        const target = curCardWord.w.toLowerCase();
        const ok = alts.some(a => a.toLowerCase().includes(target));

        curCardWord.tries++;
        if (ok) {
          curCardWord.streak++;
          if (curCardWord.streak >= 3) {
            curCardWord.done = true;
            setWordFeedback(`¡Dominada! 🎉 He entendido ${alts[0]}`);
          } else {
            setWordFeedback(`¡Bien! (${curCardWord.streak}/3). He entendido ${alts[0]}`);
          }
        } else {
          curCardWord.streak = 0;
          setWordFeedback(`He entendido ${alts[0]}. Escucha la nativa y repite.`);
        }
        setWords([...words]);
        saveKV('words', words);
      }
    });
  };

  // Dialogue flow engine
  const handleStartDialogue = async () => {
    if (!parsed.dialogue) return;
    setIsDialogueRunning(true);
    setDialogueResults({});

    for (let i = 0; i < parsed.units.length; i++) {
      setActiveDialogueIdx(i);
      const unit = parsed.units[i];

      if (unit.speaker !== dialogueRole) {
        setDialogueStatus(`${unit.speaker} habla…`);
        await speakEnglish(unit.text, prefs.accent, prefs.rate);
        await new Promise(r => setTimeout(r, 400));
      } else {
        setDialogueStatus('Tu turno: di tu frase.');
        const result: any = await new Promise(resolve => {
          listenEnglish({
            accent: prefs.accent,
            onInterim: (f, it) => setDialogueStatus(`Entiendo: ${(f + ' ' + it).trim()}`),
            onEnd: alts => {
              if (alts.length) {
                resolve(compareSpokenText(unit.text, alts));
              } else {
                resolve(null);
              }
            }
          });
        });

        if (result) {
          setDialogueResults(prev => ({ ...prev, [i]: result }));
          await new Promise(r => setTimeout(r, result.score >= 0.8 ? 800 : 1400));
        } else {
          setDialogueStatus('No te he oído. Diálogo en pausa.');
          break;
        }
      }
    }
    setIsDialogueRunning(false);
    setActiveDialogueIdx(-1);
    setDialogueStatus('¡Diálogo terminado!');
  };

  // Talk free speech timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTalking && talkRemaining > 0) {
      interval = setInterval(() => {
        setTalkRemaining(prev => {
          if (prev <= 1) {
            handleStopTalking();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTalking, talkRemaining]);

  const handleStartTalking = async () => {
    setLiveTranscript('');
    setTalkInterim('');
    setTalkRemaining(talkDuration);
    setTalkStats(null);
    setIsTalking(true);

    activeListenerRef.current = await listenEnglish({
      accent: prefs.accent,
      continuous: true,
      onInterim: (f, it) => {
        setTalkInterim((f + ' ' + it).trim());
      },
      onEnd: alts => {
        if (alts[0]) {
          setLiveTranscript(prev => (prev + ' ' + alts[0]).trim());
        }
        setTalkInterim('');
      }
    });
  };

  const handleStopTalking = () => {
    if (activeListenerRef.current) {
      activeListenerRef.current.stop();
      activeListenerRef.current = null;
    }
    setIsTalking(false);

    const full = (liveTranscript + ' ' + talkInterim).trim();
    const wordsArr = full.split(/\s+/).filter(w => /[a-z0-9]/i.test(w));
    const secs = talkDuration - talkRemaining || talkDuration;
    const wpm = secs > 5 ? wordsArr.length / (secs / 60) : 0;
    const uniq = new Set(wordsArr.map(w => w.toLowerCase().replace(/[^a-z']/g, ''))).size;

    setTalkStats({ words: wordsArr.length, wpm: Math.round(wpm), uniq });

    if (wordsArr.length) {
      const item: TalkHistoryItem = {
        t: Date.now(),
        secs,
        words: wordsArr.length,
        wpm,
        uniq,
        topic: TOPICS[topicIdx][0]
      };
      const nextHistory = [...history, item];
      setHistory(nextHistory);
      saveKV('history', nextHistory);
    }
  };

  // AI Correction
  const handleTriggerFix = async () => {
    if (!fixInput.trim()) return;
    setIsFixThinking(true);
    try {
      const fix = await askAICoach(fixInput.trim(), prefs.accent, aiProvider, aiApiKey, '');
      setCurrentFix(fix);
      const nextFixes = [fix, ...fixes];
      setFixes(nextFixes);
      saveKV('fixes', nextFixes);
      speakEnglish(fix.natural || fix.formal || fix.said, prefs.accent);
    } catch (e: any) {
      alert(e.message || 'Error al corregir');
    } finally {
      setIsFixThinking(false);
    }
  };

  // Backup & Restore
  const handleDownloadBackup = () => {
    const data = { app: 'ingles-en-voz-alta', v: 1, texts, words, history, fixes, books };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ingles-copia-${Date.now()}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    markBackedUp('ingles');
    setNagStatus({ shouldNag: false, message: '', days: 0 });
  };

  return (
    <div className="wrap">
      <header>
        {onNavigateToSyllables && (
          <button
            onClick={onNavigateToSyllables}
            style={{
              display: 'inline-block',
              fontSize: 13,
              color: 'var(--accent)',
              textDecoration: 'none',
              fontWeight: 600,
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              marginBottom: 8
            }}
          >
            ← Grabadora de sílabas
          </button>
        )}
        <h1>Inglés en Voz Alta</h1>
        <p>Lee en voz alta los textos de tus libros, mira qué palabras se te entienden, practica las difíciles y suéltate hablando.</p>
        <BackupReminder
          page="ingles"
          shouldNag={nagStatus.shouldNag}
          message={nagStatus.message}
          onBackupNow={handleDownloadBackup}
          onDismiss={() => setNagStatus({ shouldNag: false, message: '', days: 0 })}
        />
      </header>

      {/* SETTINGS PANEL */}
      <section className="panel" aria-label="Ajustes">
        <div className="settings">
          <label htmlFor="accent">
            Acento
            <select
              id="accent"
              value={prefs.accent}
              onChange={e => updatePrefs({ accent: e.target.value as any })}
            >
              <option value="en-GB">Británico (Reino Unido)</option>
              <option value="en-US">Americano (EE. UU.)</option>
            </select>
          </label>
          <label htmlFor="rate">
            Velocidad de la voz nativa <output>{prefs.rate.toFixed(1).replace('.', ',')}×</output>
            <input
              type="range"
              id="rate"
              min="0.5"
              max="1.2"
              step="0.05"
              value={prefs.rate}
              onChange={e => updatePrefs({ rate: +e.target.value })}
            />
          </label>
        </div>
      </section>

      {/* PRACTICE MODE TABS */}
      <div className="tabs" role="tablist" aria-label="Modos de práctica">
        <button
          role="tab"
          aria-selected={tab === 'texts'}
          onClick={() => setTab('texts')}
        >
          Textos
        </button>
        <button
          role="tab"
          aria-selected={tab === 'read'}
          onClick={() => setTab('read')}
        >
          Leer
        </button>
        <button
          role="tab"
          aria-selected={tab === 'dlg'}
          onClick={() => setTab('dlg')}
        >
          Diálogo
        </button>
        <button
          role="tab"
          aria-selected={tab === 'words'}
          onClick={() => setTab('words')}
        >
          Palabras · <span>{pendingWords.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'talk'}
          onClick={() => setTab('talk')}
        >
          Hablar
        </button>
        <button
          role="tab"
          aria-selected={tab === 'fix'}
          onClick={() => setTab('fix')}
        >
          Corregir ✨
        </button>
      </div>

      {/* TAB: TEXTOS */}
      {tab === 'texts' && (
        <section className="panel" role="tabpanel">
          <div className="row between">
            <div className="label">Tus textos</div>
            <button
              className="primary small"
              onClick={() => {
                setEditingId(null);
                setEditorTitle('');
                setEditorBody('');
                setIsEditorOpen(true);
              }}
            >
              + Nuevo texto
            </button>
          </div>

          <div className="tlist">
            {texts.map(t => {
              const p = parseEnglishText(t.body);
              const doneCount = Object.values(t.best || {}).filter(v => v >= 0.8).length;
              return (
                <div key={t.id} className="titem">
                  <div className="tt">
                    <b>{t.title}</b>
                    <span>
                      {p.dialogue ? `Diálogo · ${speakersOfDialogue(p).join(', ')}` : 'Texto'} · {p.units.length} frases · {doneCount} bien leídas
                    </span>
                  </div>
                  <button
                    className="primary small"
                    onClick={() => {
                      setCurTextId(t.id);
                      setSentenceIdx(0);
                      setTab('read');
                    }}
                  >
                    Leer
                  </button>
                  {p.dialogue && (
                    <button
                      className="small"
                      onClick={() => {
                        setCurTextId(t.id);
                        setTab('dlg');
                      }}
                    >
                      Diálogo
                    </button>
                  )}
                  <button
                    className="ghost small"
                    onClick={() => {
                      setEditingId(t.id);
                      setEditorTitle(t.title);
                      setEditorBody(t.body);
                      setIsEditorOpen(true);
                    }}
                  >
                    Editar
                  </button>
                </div>
              );
            })}
          </div>

          {/* New/Edit Modal Form */}
          {isEditorOpen && (
            <div className="panel" style={{ padding: 14, background: 'var(--bg)', marginTop: 12 }}>
              <div className="label">{editingId ? 'Editar texto' : 'Nuevo texto'}</div>
              <input
                type="text"
                placeholder="Título del texto"
                value={editorTitle}
                onChange={e => setEditorTitle(e.target.value)}
              />
              <textarea
                placeholder="Pega aquí el texto o el diálogo.&#10;Para diálogos usa el formato:&#10;Anna: Hello!&#10;Bob: Hi!"
                value={editorBody}
                onChange={e => setEditorBody(e.target.value)}
              />
              <div className="row">
                <button
                  className="primary"
                  onClick={() => {
                    if (!editorBody.trim()) return;
                    const title = editorTitle.trim() || editorBody.split(/\s+/).slice(0, 4).join(' ') + '…';
                    let nextTexts = [...texts];
                    if (editingId) {
                      nextTexts = nextTexts.map(x => (x.id === editingId ? { ...x, title, body: editorBody } : x));
                    } else {
                      nextTexts.unshift({ id: Date.now(), title, body: editorBody, best: {} });
                    }
                    setTexts(nextTexts);
                    saveKV('texts', nextTexts);
                    setIsEditorOpen(false);
                  }}
                >
                  Guardar
                </button>
                <button className="ghost" onClick={() => setIsEditorOpen(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="row" style={{ paddingTop: 12, borderTop: '1px solid var(--line)' }}>
            <button className="small" onClick={handleDownloadBackup}>
              ⇩ Copia de seguridad
            </button>
          </div>
        </section>
      )}

      {/* TAB: LEER */}
      {tab === 'read' && (
        <section className="panel" role="tabpanel">
          <div className="row between">
            <div className="label grow">{currentObj?.title}</div>
            <span className="pill">
              Frase {sentenceIdx + 1} de {parsed.units.length}
            </span>
          </div>

          {parsed.units[sentenceIdx]?.speaker && (
            <div className="speaker">{parsed.units[sentenceIdx].speaker}</div>
          )}

          {/* Sentence interactive display with clickable words */}
          <p className="sentence">
            {parsed.units[sentenceIdx] ? (
              displayWords(parsed.units[sentenceIdx].text).map((w, i) => {
                const cls =
                  readResult && readResult.counted[i]
                    ? readResult.ok[i]
                      ? 'good'
                      : readResult.maybe[i]
                      ? 'maybe'
                      : 'bad'
                    : '';
                const isSelected = selectedWord === cleanWord(w);
                return (
                  <span
                    key={i}
                    className={`w ${cls} ${isSelected ? 'sel' : ''}`}
                    onClick={() => {
                      const cw = cleanWord(w);
                      setSelectedWord(cw);
                      speakEnglish(cw, prefs.accent, prefs.rate);
                    }}
                  >
                    {w}
                  </span>
                );
              })
            ) : (
              <span>Selecciona un texto</span>
            )}
          </p>

          {/* Word Action Bar */}
          {selectedWord && (
            <div className="wordbar">
              <b>{selectedWord}</b>
              <button
                className="small"
                onClick={() => speakEnglish(selectedWord, prefs.accent, prefs.rate)}
              >
                🔊 Escuchar
              </button>
              <button
                className="small"
                onClick={() => {
                  handleAddWord(selectedWord);
                }}
              >
                + A palabras difíciles
              </button>
            </div>
          )}

          <div className="row">
            <button
              onClick={() => {
                if (parsed.units[sentenceIdx]) {
                  speakEnglish(parsed.units[sentenceIdx].text, prefs.accent, prefs.rate);
                }
              }}
            >
              🔊 Voz nativa
            </button>
            <button
              className="recbtn"
              onClick={handleStartReadSentence}
            >
              {isReadingActive ? '■ Parar' : '🎤 Leer en voz alta'}
            </button>
          </div>

          {heardText && <p className="heard">He entendido: <b>{heardText}</b></p>}

          {readResult && (
            <div className="row">
              <span className="score" style={{ color: readResult.score >= 0.8 ? 'var(--ok)' : 'var(--ink)' }}>
                {Math.round(readResult.score * 100)} %
              </span>
              <span className="note grow">
                {readResult.score >= 0.8 ? '¡Muy bien pronunciado!' : 'Se entiende a medias. Vuelve a probar.'}
              </span>
            </div>
          )}

          <div className="row">
            <button
              className="ghost"
              disabled={sentenceIdx === 0}
              onClick={() => {
                setSentenceIdx(prev => Math.max(0, prev - 1));
                setReadResult(null);
                setHeardText('');
                setSelectedWord(null);
              }}
            >
              ← Anterior
            </button>
            <button
              className="ghost"
              disabled={sentenceIdx >= parsed.units.length - 1}
              onClick={() => {
                setSentenceIdx(prev => Math.min(parsed.units.length - 1, prev + 1));
                setReadResult(null);
                setHeardText('');
                setSelectedWord(null);
              }}
            >
              Siguiente →
            </button>
          </div>

          <div className="label" style={{ marginTop: 12 }}>Frases del texto</div>
          <div className="slist">
            {parsed.units.map((u, i) => (
              <button
                key={i}
                className={`sitem ${i === sentenceIdx ? 'cur' : ''}`}
                onClick={() => {
                  setSentenceIdx(i);
                  setReadResult(null);
                  setHeardText('');
                  setSelectedWord(null);
                }}
              >
                <span className="n">{i + 1}</span>
                <span className="st">{u.speaker ? `[${u.speaker}] ` : ''}{u.text}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* TAB: DIÁLOGO */}
      {tab === 'dlg' && (
        <section className="panel" role="tabpanel">
          <div className="label">{currentObj?.title}</div>
          {!parsed.dialogue ? (
            <p className="note">Este texto no es un diálogo. Escribe intervenciones con «Nombre: frase» para activar este modo.</p>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="row">
                <label className="note">Yo hago de</label>
                <select
                  value={dialogueRole}
                  onChange={e => setDialogueRole(e.target.value)}
                >
                  {speakersOfDialogue(parsed).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <label className="note" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={prefs.hide}
                    onChange={e => updatePrefs({ hide: e.target.checked })}
                  />
                  Ocultar mis frases (modo reto)
                </label>
              </div>

              <div className="row">
                <button
                  className="primary"
                  disabled={isDialogueRunning}
                  onClick={handleStartDialogue}
                >
                  ▶ Empezar diálogo
                </button>
                <button
                  className="ghost"
                  disabled={!isDialogueRunning}
                  onClick={() => setIsDialogueRunning(false)}
                >
                  ■ Parar
                </button>
              </div>

              {dialogueStatus && <div className="status">{dialogueStatus}</div>}

              <div className="dlog">
                {parsed.units.map((u, i) => {
                  const isMe = u.speaker === dialogueRole;
                  const isNow = activeDialogueIdx === i;
                  const res = dialogueResults[i];

                  return (
                    <div
                      key={i}
                      className={`bubble ${isMe ? 'me' : ''} ${isNow ? 'now' : ''}`}
                    >
                      <span className="speaker">
                        {u.speaker}
                        {res && ` · ${Math.round(res.score * 100)} %`}
                      </span>
                      <div className={`txt ${isMe && prefs.hide && !res ? 'hid' : ''}`}>
                        {u.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB: PALABRAS DIFÍCILES */}
      {tab === 'words' && (
        <section className="panel" role="tabpanel">
          <div className="label">Practicar palabras difíciles</div>
          <div className="wcard">
            <div className="big">{curCardWord ? curCardWord.w : '¡Nada pendiente!'}</div>
            <div className="streak">
              <i className={curCardWord && curCardWord.streak >= 1 ? 'on' : ''}></i>
              <i className={curCardWord && curCardWord.streak >= 2 ? 'on' : ''}></i>
              <i className={curCardWord && curCardWord.streak >= 3 ? 'on' : ''}></i>
            </div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button
                disabled={!curCardWord}
                onClick={() => curCardWord && speakEnglish(curCardWord.w, prefs.accent, prefs.rate)}
              >
                🔊 Escuchar
              </button>
              <button
                className="recbtn"
                disabled={!curCardWord}
                onClick={handleTestWordSpeech}
              >
                {isWordListening ? '■ Parar' : '🎤 Decirla'}
              </button>
              <button
                className="ghost"
                disabled={pendingWords.length < 2}
                onClick={() => {
                  setWordCardIdx(prev => (prev + 1) % pendingWords.length);
                  setWordFeedback('');
                }}
              >
                Otra →
              </button>
            </div>
            {wordFeedback && <p className="heard">{wordFeedback}</p>}
          </div>

          <p className="note">Cuando la dices bien tres veces seguidas, pasa a «Dominadas».</p>

          <div className="row">
            <input
              type="text"
              placeholder="Añadir una palabra o expresión"
              value={wordAddInput}
              onChange={e => setWordAddInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddWord(wordAddInput);
                  setWordAddInput('');
                }
              }}
            />
            <button
              className="small"
              onClick={() => {
                handleAddWord(wordAddInput);
                setWordAddInput('');
              }}
            >
              + Añadir
            </button>
          </div>

          <div className="label">Por practicar</div>
          <div className="chips">
            {pendingWords.map((pw, i) => (
              <button
                key={i}
                className="chip"
                onClick={() => {
                  setWordCardIdx(i);
                  speakEnglish(pw.w, prefs.accent, prefs.rate);
                }}
              >
                {pw.w} <small>{pw.streak}/3</small>
              </button>
            ))}
          </div>

          <div className="label" style={{ marginTop: 12 }}>Dominadas</div>
          <div className="chips">
            {doneWords.map((dw, i) => (
              <button
                key={i}
                className="chip done"
                onClick={() => speakEnglish(dw.w, prefs.accent, prefs.rate)}
              >
                {dw.w}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* TAB: HABLAR */}
      {tab === 'talk' && (
        <section className="panel" role="tabpanel">
          <div className="label">Habla libre</div>
          <p className="topic">{TOPICS[topicIdx][0]}</p>
          <p className="note">{TOPICS[topicIdx][1]}</p>

          <div className="row">
            <button
              className="ghost small"
              onClick={() => setTopicIdx(prev => (prev + 1) % TOPICS.length)}
            >
              ↻ Otro tema
            </button>
            <label className="note">Duración</label>
            <select
              value={talkDuration}
              onChange={e => {
                const d = +e.target.value;
                setTalkDuration(d);
                setTalkRemaining(d);
              }}
            >
              <option value="30">30 s</option>
              <option value="60">1 min</option>
              <option value="120">2 min</option>
            </select>
          </div>

          <div className="row">
            <span className="timer">
              {Math.floor(talkRemaining / 60)}:{String(talkRemaining % 60).padStart(2, '0')}
            </span>
            <button
              className="recbtn"
              onClick={isTalking ? handleStopTalking : handleStartTalking}
            >
              {isTalking ? '■ Terminar' : '🎤 Empezar a hablar'}
            </button>
          </div>

          <div className="live">
            {liveTranscript} <span className="interim">{talkInterim}</span>
          </div>

          {talkStats && (
            <div className="stats">
              <div className="stat">
                <b>{talkStats.words}</b>
                <span>palabras</span>
              </div>
              <div className="stat">
                <b>{talkStats.wpm}</b>
                <span>palabras por minuto</span>
              </div>
              <div className="stat">
                <b>{talkStats.uniq}</b>
                <span>palabras distintas</span>
              </div>
            </div>
          )}

          <div className="label" style={{ marginTop: 12 }}>Tu progreso</div>
          <div className="hist">
            {history.slice(-10).map((h, i) => (
              <div key={i} className="hrow">
                <span>{new Date(h.t).toLocaleDateString()}</span>
                <div className="bar" style={{ width: `${Math.min(100, (h.wpm / 150) * 100)}%` }}></div>
                <span>{Math.round(h.wpm)} ppm</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB: CORREGIR ✨ */}
      {tab === 'fix' && (
        <section className="panel" role="tabpanel">
          <div className="label">Corrígeme con Inteligencia Artificial</div>
          <p className="note">Di o escribe una frase en inglés como te salga. Te devuelvo dos versiones mejoradas: formal y natural.</p>

          <textarea
            placeholder="Por ejemplo: Yesterday I have gone to the supermarket for buy some fruits."
            value={fixInput}
            onChange={e => setFixInput(e.target.value)}
          />

          <div className="row">
            <button
              className="primary"
              disabled={isFixThinking || !fixInput.trim()}
              onClick={handleTriggerFix}
            >
              {isFixThinking ? 'Pensando… ✨' : '✨ Corregir'}
            </button>
            <button className="ghost small" onClick={() => setFixInput('')}>
              Borrar
            </button>
          </div>

          {currentFix && (
            <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
              <div className="fixbox said">
                <div className="label">Lo que dijiste</div>
                <p className="fixtxt mine">{currentFix.said}</p>
              </div>

              {currentFix.formal && (
                <div className="fixbox formal">
                  <div className="label">🎩 Formal</div>
                  <p className="fixtxt">{currentFix.formal}</p>
                  <button
                    className="small"
                    onClick={() => speakEnglish(currentFix.formal, prefs.accent, prefs.rate)}
                  >
                    🔊 Escuchar
                  </button>
                </div>
              )}

              {currentFix.natural && (
                <div className="fixbox natural">
                  <div className="label">💬 Natural</div>
                  <p className="fixtxt">{currentFix.natural}</p>
                  <button
                    className="small"
                    onClick={() => speakEnglish(currentFix.natural, prefs.accent, prefs.rate)}
                  >
                    🔊 Escuchar
                  </button>
                </div>
              )}

              {currentFix.why && <p className="why">💡 {currentFix.why}</p>}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
