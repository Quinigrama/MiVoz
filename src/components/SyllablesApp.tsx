import React, { useState, useEffect, useRef } from 'react';
import {
  FRASES,
  FR,
  ALL_SYL,
  parseText,
  WordInfo,
  clips,
  extras,
  MAX_VERS,
  nVers,
  versions,
  setFavorite,
  deleteVersion,
  clearBank,
  saveSyl,
  addVersion,
  sylMeta,
  ac,
  resample,
  trimClip,
  finish,
  playData,
  stopAllAudio,
  decodeMono,
  clipData,
  startRecording,
  stopActiveRecording,
  levelReport,
  recNatural,
  setRecNatural,
  segmentWords,
  segmentByTiming,
  splitSyllables,
  CUT_TYPES,
  getCutBias,
  learnCut,
  squeezeGaps,
  drawWaveCanvas,
  buildPhraseAudio,
  buildBackupZip,
  importBackupZip,
  readZip,
  keyFromName,
  wavBytes,
  getBestRandomStory,
  baseIssues,
  issuesOfTake,
  f0Of,
  GuidedTake,
  SegmentedWord,
  biasOf,
  PlaybackMark,
  SyllableTake
} from '../services/spanishSpeech';
import { currentUser, markBackedUp, checkBackupReminder, BackupStatus } from '../services/users';
import { BackupReminder } from './BackupReminder';
import { DriveSyncModal } from './DriveSyncModal';

interface SyllablesAppProps {
  onNavigateToEnglish?: () => void;
  onOpenDriveSync?: () => void;
}

export const SyllablesApp: React.FC<SyllablesAppProps> = ({ onNavigateToEnglish, onOpenDriveSync }) => {
  // App state
  const [text, setText] = useState('Hola mamá, ¿qué tal estás?');
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [xfMs, setXfMs] = useState(35);
  const [ratePct, setRatePct] = useState(80);
  const [gapMs, setGapMs] = useState(110);
  const [minVMs, setMinVMs] = useState(150);
  const [polish, setPolish] = useState(true);
  const [unitsel, setUnitsel] = useState(true);
  const [prosody, setProsody] = useState(true);
  const [glide, setGlide] = useState(true);
  const [pAmt, setPAmt] = useState(100);

  // Active tab
  const [tab, setTab] = useState<'guided' | 'single' | 'bank'>('guided');
  const [selectedSyl, setSelectedSyl] = useState<string | null>(null);
  const [playingMarkIdx, setPlayingMarkIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playStatus, setPlayStatus] = useState<{ msg: string; kind?: 'ok' | 'err' }>({ msg: '' });

  // Guided reading state
  const [gi, setGi] = useState(0);
  const [karaokeOn, setKaraokeOn] = useState(true);
  const [karaokeSpeed, setKaraokeSpeed] = useState(1.0);
  const [naturalAudio, setNaturalAudio] = useState(recNatural());
  const [isRecordingGuided, setIsRecordingGuided] = useState(false);
  const [guidedTake, setGuidedTake] = useState<GuidedTake | null>(null);
  const [guidedStatus, setGuidedStatus] = useState<{ msg: string; kind?: 'ok' | 'err' }>({
    msg: 'Graba o sube la lectura de esta frase.'
  });
  const [reviewPicks, setReviewPicks] = useState<Record<string, boolean>>({});
  const [editingWordIdx, setEditingWordIdx] = useState<number | null>(null);
  const [dragCutIdx, setDragCutIdx] = useState<number | null>(null);

  // Overlay (Karaoke) state
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayWord, setOverlayWord] = useState('');
  const [overlayWordClass, setOverlayWordClass] = useState('blank');
  const [overlayCurIdx, setOverlayCurIdx] = useState(-1);
  const [overlayHint, setOverlayHint] = useState('');
  const [recordingLevel, setRecordingLevel] = useState(0);
  const [isLevelHot, setIsLevelHot] = useState(false);

  // Single syllable state
  const [isRecordingSingle, setIsRecordingSingle] = useState(false);
  const [singleStatus, setSingleStatus] = useState<{ msg: string; kind?: 'ok' | 'err' }>({ msg: '' });
  const [fromBank, setFromBank] = useState(false);

  // Bank review state
  const [worseOn, setWorseOn] = useState(false);
  const [delArmedKey, setDelArmedKey] = useState<string | null>(null);
  const [clearBankArmed, setClearBankArmed] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [lastTap, setLastTap] = useState<{ k: string | null; t: number }>({ k: null, t: 0 });

  // Backup reminder state
  const [nagStatus, setNagStatus] = useState<BackupStatus>({ shouldNag: false, message: '', days: 0 });

  // Canvas refs
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const guidedWaveRef = useRef<HTMLCanvasElement>(null);
  const editCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastWaveDataRef = useRef<Float32Array | null>(null);
  const lastMarksRef = useRef<PlaybackMark[]>([]);
  const rafRef = useRef<number>(0);

  // Initial load
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    // Select best first sentence
    let best = 0, bs = -1;
    FR.forEach((_, i) => {
      const n = new Set(FR[i].flatMap(w => w.syl).filter(k => !clips.has(k))).size;
      if (n > bs) {
        bs = n;
        best = i;
      }
    });
    setGi(best >= 0 ? best : 0);
    setLoaded(true);
    refreshNag();
  }, []);

  const refreshNag = () => {
    const s = checkBackupReminder('silabas', clips.size, 'sílabas', 10, 7);
    setNagStatus(s);
  };

  const words = parseText(text);

  // Redraw main assembled waveform
  const updateMainWaveform = (head: number | null = null) => {
    if (!waveCanvasRef.current) return;
    drawWaveCanvas(waveCanvasRef.current, lastWaveDataRef.current, {
      head,
      contour: lastMarksRef.current
    });
  };

  // Redraw guided waveform
  useEffect(() => {
    if (!guidedWaveRef.current) return;
    if (!guidedTake) {
      drawWaveCanvas(guidedWaveRef.current, null);
      return;
    }
    const lines: number[] = [];
    guidedTake.words.forEach(w => w.sylRanges.slice(1).forEach(r => lines.push(w.start + r[0])));
    drawWaveCanvas(guidedWaveRef.current, guidedTake.data, {
      regions: guidedTake.words.map(w => [w.start, w.end]),
      lines
    });
  }, [guidedTake]);

  // Redraw cut editor canvas
  useEffect(() => {
    if (editingWordIdx === null || !guidedTake || !editCanvasRef.current) return;
    const w = guidedTake.words[editingWordIdx];
    if (!w) return;
    const cv = editCanvasRef.current;
    const seg = guidedTake.data.subarray(w.start, w.end);
    const len = w.end - w.start;
    const cuts = w.sylRanges.slice(1).map(r => r[0]);

    drawWaveCanvas(cv, seg, { lines: [] });

    const g = cv.getContext('2d');
    if (!g) return;
    const W = cv.clientWidth, H = cv.clientHeight;
    g.font = '600 13px "IBM Plex Mono", monospace';
    g.textAlign = 'center';
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink') || '#1A2130';

    w.sylRanges.forEach(([a, b], j) => {
      g.fillText(w.word.syl[j], (((a + b) / 2) / len) * W, 16);
    });

    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--rec') || '#D23638';
    cuts.forEach((c, i) => {
      const x = (c / len) * W;
      g.fillRect(x - 1.5, 22, 3, H - 30);
      g.beginPath();
      g.arc(x, H - 9, i === dragCutIdx ? 9 : 7, 0, Math.PI * 2);
      g.fill();
    });
  }, [editingWordIdx, guidedTake, dragCutIdx]);

  // Play assembled phrase
  const handlePlayPhrase = () => {
    if (!words.length) return;
    stopAllAudio();
    cancelAnimationFrame(rafRef.current);

    const r = buildPhraseAudio(words, {
      polish,
      unitsel,
      prosody,
      glide,
      pAmt,
      xfMs,
      ratePct,
      gapMs,
      minVMs
    });

    lastWaveDataRef.current = r.data;
    lastMarksRef.current = r.marks;
    const dur = r.data.length / ac().sampleRate;

    setPlayStatus({
      msg: `${dur.toFixed(1).replace('.', ',')} s de audio${
        r.alt ? ` · ${r.alt} ${r.alt > 1 ? 'sílabas con otra versión' : 'sílaba con otra versión'} que encaja mejor` : ''
      }${r.missing ? ` · ${r.missing} ${r.missing > 1 ? 'sílabas' : 'sílaba'} sin grabar (pitido)` : ''}`
    });

    setIsPlaying(true);
    const startTime = playData(r.data, () => {
      cancelAnimationFrame(rafRef.current);
      setPlayingMarkIdx(null);
      setIsPlaying(false);
      updateMainWaveform(null);
    });

    const tick = () => {
      const t = ac().currentTime - startTime;
      const m = r.marks.find(m => t >= m.t0 && t < m.t1);
      setPlayingMarkIdx(m ? m.idx : null);
      updateMainWaveform(Math.min(1, t / dur));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleStopPhrase = () => {
    stopAllAudio();
    cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
    setPlayingMarkIdx(null);
    updateMainWaveform(null);
  };

  // Download assembled phrase as WAV
  const handleDownloadPhrase = () => {
    if (!words.length) {
      setPlayStatus({ msg: 'Escribe algo para poder descargarlo.', kind: 'err' });
      return;
    }
    const r = buildPhraseAudio(words, {
      polish,
      unitsel,
      prosody,
      glide,
      pAmt,
      xfMs,
      ratePct,
      gapMs,
      minVMs
    });
    const sr = ac().sampleRate;
    const slug =
      text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9ñ]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'mi-voz';
    const blob = new Blob([wavBytes(r.data, sr) as any], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}.wav`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setPlayStatus({
      msg: `Audio descargado: ${slug}.wav. Mira en tu carpeta de Descargas.${
        r.missing ? ` (Ojo: ${r.missing} sílabas sonaron como pitido)` : ''
      }`,
      kind: 'ok'
    });
  };

  const handleSharePhrase = async () => {
    if (!words.length) return;
    const r = buildPhraseAudio(words, {
      polish,
      unitsel,
      prosody,
      glide,
      pAmt,
      xfMs,
      ratePct,
      gapMs,
      minVMs
    });
    const sr = ac().sampleRate;
    const slug = text.slice(0, 30) || 'mi-voz';
    const blob = new Blob([wavBytes(r.data, sr) as any], { type: 'audio/wav' });
    try {
      if (navigator.share) {
        await navigator.share({
          files: [new File([blob], `${slug}.wav`, { type: 'audio/wav' })],
          title: text.slice(0, 60)
        });
        setPlayStatus({ msg: 'Audio enviado.', kind: 'ok' });
      }
    } catch {
      setPlayStatus({ msg: 'No se pudo enviar. Prueba con «Descargar audio».', kind: 'err' });
    }
  };

  // Random story
  const handleRandomText = () => {
    const best = getBestRandomStory();
    setText(best.text);
    setPlayStatus({
      msg: `🎲 Texto nuevo: ${Math.round(best.coverage * 100)} % de sus sílabas ya están grabadas.`,
      kind: best.coverage > 0.9 ? 'ok' : undefined
    });
  };

  // Guided Reading Karaoke Recording
  const startGuidedRecording = () => {
    const idx = gi;
    const phraseWords = FR[idx];
    const rawWords = FRASES[idx].split(/\s+/);
    const isKaraoke = karaokeOn && rawWords.length === phraseWords.length;
    const speed = karaokeSpeed;

    const times: number[] = [];
    const timers: NodeJS.Timeout[] = [];

    setOverlayOpen(true);
    setOverlayWordClass('blank');
    setOverlayWord('');
    setOverlayCurIdx(-1);
    setOverlayHint(
      isKaraoke
        ? 'Prepárate…'
        : 'Lee palabra a palabra, con una pausa corta entre cada una. Pulsa Parar al terminar.'
    );
    setGuidedStatus({ msg: 'Grabando…' });
    setIsRecordingGuided(true);

    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    startRecording({
      maxMs: 60000,
      onLevel: (pk, hot) => {
        setRecordingLevel(Math.min(100, pk * 140));
        setIsLevelHot(hot);
      },
      onStart: t0 => {
        if (!isKaraoke) return;
        let t = 0;
        ['3', '2', '1'].forEach(c => {
          at(t, () => {
            setOverlayWord(c);
            setOverlayWordClass('count');
            setOverlayHint('Prepárate…');
          });
          t += 650;
        });
        at(t, () => {
          setOverlayWordClass('blank');
          setOverlayHint('');
        });
        t += 300;

        phraseWords.forEach((w, i) => {
          const show = (280 + 170 * w.syl.length) / speed;
          const gap = 600 / speed;
          at(t, () => {
            times[i] = (performance.now() - t0) / 1000;
            setOverlayWord(rawWords[i]);
            setOverlayWordClass('');
            setOverlayCurIdx(i);
            setOverlayHint(`Palabra ${i + 1} de ${rawWords.length}`);
          });
          t += show;
          at(t, () => {
            setOverlayWordClass('blank');
            setOverlayCurIdx(i + 1);
          });
          t += gap;
        });

        at(t + 400, () => {
          setOverlayHint('¡Hecho!');
          stopActiveRecording();
        });
      },
      onBlob: async blob => {
        timers.forEach(clearTimeout);
        setOverlayOpen(false);
        setIsRecordingGuided(false);
        setRecordingLevel(0);

        try {
          const m = await decodeMono(blob);
          const sr = ac().sampleRate;
          const data = resample(m.data, m.sr, sr);
          const ws = FR[idx];

          let { segs, ok, found } = segmentWords(data, sr, ws.length);
          let viaTiming = false;

          if (!ok && times.length === ws.length) {
            const timedSegs = segmentByTiming(data, sr, times, ws.length);
            if (timedSegs) {
              segs = timedSegs;
              ok = true;
              viaTiming = true;
            }
          }

          if (!segs.length) {
            setGuidedStatus({ msg: 'No se oye nada en la grabación. Acércate un poco más al micro.', kind: 'err' });
            return;
          }

          if (!ok) {
            setGuidedTake({
              data,
              sr,
              ok: false,
              words: segs.map(([a, b]) => ({
                start: a,
                end: b,
                word: ws[0] || { word: '', syl: [], punct: false, stress: -1 },
                sylRanges: [[0, b - a]],
                sure: [false],
                types: [],
                auto: [0],
                touched: new Set()
              }))
            });
            setGuidedStatus({
              msg: `He encontrado ${found} trozos y la frase tiene ${ws.length} palabras. Repite dejando una pausa algo más clara entre cada palabra.`,
              kind: 'err'
            });
            return;
          }

          const segmentedWords: SegmentedWord[] = segs.map(([a, b], i) => {
            const seg = data.subarray(a, b);
            const sp = splitSyllables(seg, sr, ws[i].syl);
            return {
              start: a,
              end: b,
              word: ws[i],
              sylRanges: sp.ranges,
              sure: sp.sure,
              types: sp.types || [],
              auto: sp.ranges.map(r => r[0]),
              touched: new Set()
            };
          });

          const newTake: GuidedTake = {
            data,
            sr,
            ok: true,
            words: segmentedWords
          };
          setGuidedTake(newTake);

          // Setup initial picks
          const picks: Record<string, boolean> = {};
          const seen = new Set<string>();
          segmentedWords.forEach((w, wi) => {
            w.word.syl.forEach((s, j) => {
              const full = nVers(s) >= MAX_VERS;
              const dup = seen.has(s);
              seen.add(s);
              const isSure = w.sure[j] !== false;
              picks[`${wi}-${j}`] = isSure && !full && !dup;
            });
          });
          setReviewPicks(picks);
          setEditingWordIdx(null);

          const nd = segmentedWords.reduce((t, w) => t + w.sure.filter(x => !x).length, 0);
          const lv = levelReport(data);
          setGuidedStatus({
            msg: `He encontrado las ${ws.length} palabras${
              viaTiming ? ' guiándome por el ritmo del karaoke' : ''
            }. ${
              nd
                ? `${nd} ${nd === 1 ? 'sílaba tiene' : 'sílabas tienen'} un corte dudoso (⚠): revísalas o ajústalas con ✂. `
                : 'Todos los cortes parecen limpios. '
            }Revisa y guarda.${lv}`,
            kind: lv ? 'err' : 'ok'
          });
        } catch {
          setGuidedStatus({ msg: 'No he podido procesar el audio.', kind: 'err' });
        }
      },
      onFail: () => {
        timers.forEach(clearTimeout);
        setOverlayOpen(false);
        setIsRecordingGuided(false);
        setGuidedStatus({
          msg: 'No puedo usar el micrófono aquí. Permite el acceso o usa «Subir audio».',
          kind: 'err'
        });
      }
    });
  };

  // Handle uploaded audio for guided reading
  const handleUploadGuidedAudio = async (file: File) => {
    try {
      const m = await decodeMono(file);
      const sr = ac().sampleRate;
      const data = resample(m.data, m.sr, sr);
      const ws = FR[gi];
      const { segs, ok, found } = segmentWords(data, sr, ws.length);
      if (!ok) {
        setGuidedStatus({
          msg: `He encontrado ${found} trozos y la frase tiene ${ws.length} palabras. Comprueba el audio.`,
          kind: 'err'
        });
        return;
      }
      const segmentedWords: SegmentedWord[] = segs.map(([a, b], i) => {
        const seg = data.subarray(a, b);
        const sp = splitSyllables(seg, sr, ws[i].syl);
        return {
          start: a,
          end: b,
          word: ws[i],
          sylRanges: sp.ranges,
          sure: sp.sure,
          types: sp.types || [],
          auto: sp.ranges.map(r => r[0]),
          touched: new Set()
        };
      });
      setGuidedTake({ data, sr, ok: true, words: segmentedWords });
      const picks: Record<string, boolean> = {};
      const seen = new Set<string>();
      segmentedWords.forEach((w, wi) => {
        w.word.syl.forEach((s, j) => {
          const full = nVers(s) >= MAX_VERS;
          const dup = seen.has(s);
          seen.add(s);
          picks[`${wi}-${j}`] = w.sure[j] !== false && !full && !dup;
        });
      });
      setReviewPicks(picks);
      setGuidedStatus({ msg: 'Audio subido y troceado. Revisa y guarda.', kind: 'ok' });
    } catch {
      setGuidedStatus({ msg: 'No se pudo leer el archivo de audio.', kind: 'err' });
    }
  };

  const getSyllableAudio = (w: SegmentedWord, j: number): Float32Array => {
    if (!guidedTake) return new Float32Array(0);
    const [a, b] = w.sylRanges[j];
    const d = guidedTake.data.slice(w.start + a, w.start + b);
    const isEdge = j === 0 || j === w.sylRanges.length - 1;
    return squeezeGaps(isEdge ? trimClip(d, guidedTake.sr, 0.04) || finish(d, guidedTake.sr) : finish(d, guidedTake.sr), guidedTake.sr);
  };

  const handleSaveGuidedReview = () => {
    if (!guidedTake) return;
    guidedTake.words.forEach(w => {
      (w.touched || []).forEach(i => {
        const type = w.types[i - 1];
        if (!type) return;
        learnCut(type, biasOf(type) + (w.sylRanges[i][0] - w.auto[i]) / guidedTake.sr);
      });
    });

    let nNew = 0, nExtra = 0;
    guidedTake.words.forEach((w, wi) => {
      w.word.syl.forEach((s, j) => {
        if (!reviewPicks[`${wi}-${j}`]) return;
        const meta = sylMeta(w.word, j, 'guiada');
        if (w.sure && w.sure[j] === false) meta.dud = true;
        const audio = getSyllableAudio(w, j);
        if (clips.has(s)) {
          addVersion(s, audio, guidedTake.sr, meta);
          nExtra++;
        } else {
          saveSyl(s, audio, guidedTake.sr, meta);
          nNew++;
        }
      });
    });

    setGuidedTake(null);
    setEditingWordIdx(null);
    refreshNag();

    // Find best next sentence
    let best = -1, bs = -1;
    FR.forEach((_, i) => {
      const n = new Set(FR[i].flatMap(w => w.syl).filter(k => !clips.has(k))).size;
      if (n > bs) {
        bs = n;
        best = i;
      }
    });

    setGuidedStatus({
      msg: `${nNew} ${nNew === 1 ? 'sílaba nueva' : 'sílabas nuevas'}${
        nExtra ? ` y ${nExtra} ${nExtra === 1 ? 'versión extra' : 'versiones extra'}` : ''
      } guardadas.${best >= 0 ? ' Te paso a la frase que más aporta ahora.' : ' ¡Texto completo!'}`,
      kind: 'ok'
    });

    if (best >= 0) setGi(best);
  };

  // Single syllable recording
  const handleRecordSingle = () => {
    if (!selectedSyl) return;
    if (isRecordingSingle) {
      stopActiveRecording();
      return;
    }
    setSingleStatus({ msg: `Grabando «${selectedSyl}»…` });
    setIsRecordingSingle(true);

    startRecording({
      maxMs: 2000,
      onLevel: (pk, hot) => {
        setRecordingLevel(Math.min(100, pk * 140));
        setIsLevelHot(hot);
      },
      onBlob: async blob => {
        setIsRecordingSingle(false);
        setRecordingLevel(0);
        try {
          const m = await decodeMono(blob);
          const p = trimClip(m.data, m.sr, 0.1);
          if (!p) {
            setSingleStatus({ msg: 'No se oye nada en esa toma. Prueba a hablar más cerca.', kind: 'err' });
            return;
          }
          saveSyl(selectedSyl, p, m.sr, { src: 'suelta' });
          const lv = levelReport(m.data);
          setSingleStatus({
            msg: `«${selectedSyl}» guardada (${(p.length / m.sr).toFixed(2).replace('.', ',')} s).${lv}`,
            kind: lv ? 'err' : 'ok'
          });
          playData(clipData(selectedSyl)!);
          refreshNag();
        } catch {
          setSingleStatus({ msg: 'No se pudo leer el audio.', kind: 'err' });
        }
      },
      onFail: () => {
        setIsRecordingSingle(false);
        setSingleStatus({ msg: 'Error de micrófono.', kind: 'err' });
      }
    });
  };

  // Single syllable next missing
  const handleNextMissing = () => {
    const all = words.flatMap(w => w.syl);
    const start = selectedSyl ? all.indexOf(selectedSyl) : -1;
    for (let i = 1; i <= all.length; i++) {
      const k = all[(start + i + all.length) % all.length];
      if (!clips.has(k)) {
        setSelectedSyl(k);
        return;
      }
    }
    setSingleStatus({ msg: '¡Ya tienes todas las sílabas de la frase de arriba!', kind: 'ok' });
  };

  // Backup download & import
  const handleDownloadBackup = () => {
    if (!clips.size) {
      setBackupStatus('Todavía no hay sílabas que guardar.');
      return;
    }
    const blob = buildBackupZip();
    const d = new Date(), z = (n: number) => String(n).padStart(2, '0');
    const uName = currentUser().name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fileName = `mi-voz-silabas-${uName}-${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    markBackedUp('silabas');
    refreshNag();
    setBackupStatus(`Copia de ${clips.size} sílabas descargada.`);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setBackupStatus('Importando…');
    let added = 0, replaced = 0, vers = 0;

    for (const f of files) {
      if (/\.zip$/i.test(f.name) || f.type === 'application/zip') {
        try {
          const res = await importBackupZip(f);
          added += res.added;
          replaced += res.replaced;
          vers += res.vers;
        } catch {}
      } else {
        const k = keyFromName(f.name);
        if (k) {
          try {
            const m = await decodeMono(f);
            const p = trimClip(m.data, m.sr, 0.1);
            if (p) {
              clips.has(k) ? replaced++ : added++;
              saveSyl(k, p, m.sr, null);
            }
          } catch {}
        }
      }
    }
    refreshNag();
    setBackupStatus(`Importación terminada: ${added} nuevas, ${replaced} sustituidas, ${vers} versiones extra.`);
  };

  // Coverage calculation
  let recordedCount = 0;
  ALL_SYL.forEach(k => clips.has(k) && recordedCount++);
  const coveragePct = Math.round((recordedCount / ALL_SYL.size) * 100);

  const curSylTake = selectedSyl ? clips.get(selectedSyl) : null;
  const curSylVersions = selectedSyl ? versions(selectedSyl) : [];

  return (
    <div className="wrap">
      <header>
        {onNavigateToEnglish && (
          <button
            onClick={onNavigateToEnglish}
            style={{
              display: 'inline-block',
              font: '600 13px var(--body)',
              color: 'var(--accent)',
              background: 'transparent',
              border: 0,
              padding: 0,
              cursor: 'pointer',
              marginBottom: 8
            }}
          >
            🇬🇧 Practicar inglés en voz alta →
          </button>
        )}
        <h1>Sílabas con Mi Voz</h1>
        <p>
          Lee en voz alta unas frases, la app las trocea en sílabas y luego las empalma para leer cualquier texto con tu voz.
        </p>
        <BackupReminder
          page="silabas"
          shouldNag={nagStatus.shouldNag}
          message={nagStatus.message}
          onBackupNow={handleDownloadBackup}
          onDriveBackup={() => (onOpenDriveSync ? onOpenDriveSync() : setIsDriveModalOpen(true))}
          onDismiss={() => setNagStatus({ shouldNag: false, message: '', days: 0 })}
        />
      </header>

      {/* SYNTHESIS & TEXT PLAYBACK PANEL */}
      <section className="panel" aria-labelledby="t-text">
        <div className="label" id="t-text">Escribe lo que quieres oír</div>
        <textarea
          id="txt"
          spellCheck={false}
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="row" aria-label="Frases de ejemplo">
          <button className="small" onClick={() => setText('Hola mamá, ¿qué tal estás?')}>Hola mamá</button>
          <button className="small" onClick={() => setText('Buenos días a todos.')}>Buenos días</button>
          <button className="small" onClick={() => setText('La casa es muy bonita.')}>La casa</button>
          <button className="small" onClick={() => setText('Quiero un café con leche, por favor.')}>Un café</button>
          <button className="small primary" onClick={handleRandomText} title="Inventa un texto nuevo de 3 a 5 frases">
            🎲 Texto al azar
          </button>
        </div>

        <div className="sliders">
          <label htmlFor="xf">
            Fundido entre sílabas <output>{xfMs} ms</output>
            <input
              type="range"
              id="xf"
              min="0"
              max="80"
              value={xfMs}
              onChange={e => setXfMs(+e.target.value)}
            />
          </label>
          <label htmlFor="rate">
            Ritmo dentro de la palabra <output>{ratePct} %</output>
            <input
              type="range"
              id="rate"
              min="55"
              max="100"
              step="5"
              value={ratePct}
              onChange={e => setRatePct(+e.target.value)}
            />
          </label>
          <label htmlFor="gap">
            Pausa entre palabras <output>{gapMs} ms</output>
            <input
              type="range"
              id="gap"
              min="0"
              max="500"
              step="10"
              value={gapMs}
              onChange={e => setGapMs(+e.target.value)}
            />
          </label>
          <label htmlFor="minv">
            Alargar vocales cortas <output>{minVMs ? `${minVMs} ms` : 'no'}</output>
            <input
              type="range"
              id="minv"
              min="0"
              max="350"
              step="10"
              value={minVMs}
              onChange={e => setMinVMs(+e.target.value)}
            />
          </label>
        </div>

        <label className="note" htmlFor="polish" style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            id="polish"
            checked={polish}
            onChange={e => setPolish(e.target.checked)}
            style={{ accentColor: 'var(--accent)', width: 16, height: 16, margin: 0 }}
          />
          Pulir uniones (desmárcalo para comparar con el empalme en bruto)
        </label>

        <label className="check" htmlFor="unitsel">
          <input
            type="checkbox"
            id="unitsel"
            checked={unitsel}
            disabled={!polish}
            onChange={e => setUnitsel(e.target.checked)}
          />
          Elegir la mejor versión de cada sílaba según dónde va
        </label>

        <label className="check" htmlFor="prosody">
          <input
            type="checkbox"
            id="prosody"
            checked={prosody}
            disabled={!polish}
            onChange={e => setProsody(e.target.checked)}
          />
          Entonación de frase: acento de cada palabra, melodía, preguntas y final de frase
        </label>

        {prosody && polish && (
          <div className="sliders">
            <label className="check" htmlFor="glide" style={{ color: 'var(--ink)' }}>
              <input
                type="checkbox"
                id="glide"
                checked={glide}
                onChange={e => setGlide(e.target.checked)}
              />
              Tono deslizante entre sílabas
            </label>
            <label htmlFor="pAmt">
              Intensidad de la entonación <output>{pAmt} %</output>
              <input
                type="range"
                id="pAmt"
                min="0"
                max="200"
                step="10"
                value={pAmt}
                onChange={e => setPAmt(+e.target.value)}
              />
            </label>
          </div>
        )}

        <div className="row">
          <button className="primary" onClick={handlePlayPhrase}>
            ▶ Leer con mi voz
          </button>
          <button className="ghost" onClick={handleStopPhrase} disabled={!isPlaying}>
            ■ Parar
          </button>
          <button onClick={handleDownloadPhrase}>⇩ Descargar audio</button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button onClick={handleSharePhrase}>↗ Enviar</button>
          )}
        </div>

        <canvas ref={waveCanvasRef} aria-label="Forma de onda de la frase montada"></canvas>
        <div className={`status ${playStatus.kind || ''}`}>{playStatus.msg}</div>

        {/* Syllable tape breakdown */}
        <div className="tape">
          {words.length === 0 ? (
            <span className="note">Escribe alguna palabra para ver sus sílabas.</span>
          ) : (
            words.map((w, wi) => {
              let cumulativeIdx = 0;
              for (let k = 0; k < wi; k++) cumulativeIdx += words[k].syl.length;

              return (
                <div key={wi} className="word">
                  {w.syl.map((s, si) => {
                    const currentItemIdx = cumulativeIdx + si;
                    const hasSyl = clips.has(s);
                    const isSel = selectedSyl === s;
                    const isTonic = si === w.stress;
                    const isPlayingSyl = playingMarkIdx === currentItemIdx;
                    const nv = nVers(s);

                    return (
                      <React.Fragment key={si}>
                        {si > 0 && <span className="dash">·</span>}
                        <button
                          className={`chip ${hasSyl ? 'has' : ''} ${isSel ? 'sel' : ''} ${
                            isTonic ? 'tonic' : ''
                          } ${isPlayingSyl ? 'playing' : ''}`}
                          data-n={nv > 1 ? nv : undefined}
                          onClick={() => {
                            setSelectedSyl(s);
                            setFromBank(false);
                            setTab('single');
                          }}
                        >
                          {s}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="legend">
          <span><i className="sw a"></i>Grabada</span>
          <span><i className="sw b"></i>Falta (sonará un pitido)</span>
          <span>Toca una sílaba para grabarla suelta</span>
        </div>
      </section>

      {/* TABS SELECTOR */}
      <div className="tabs" role="tablist" aria-label="Formas de grabar">
        <button
          role="tab"
          aria-selected={tab === 'guided'}
          onClick={() => setTab('guided')}
        >
          Lectura guiada
        </button>
        <button
          role="tab"
          aria-selected={tab === 'single'}
          onClick={() => setTab('single')}
        >
          Sílaba suelta
        </button>
        <button
          role="tab"
          aria-selected={tab === 'bank'}
          onClick={() => setTab('bank')}
        >
          Banco · <span>{clips.size}</span>
        </button>
      </div>

      {/* TAB: LECTURA GUIADA */}
      {tab === 'guided' && (
        <section className="panel" role="tabpanel">
          <div className="row between">
            <div className="label">
              Frase <span>{gi + 1}</span> de <span>{FRASES.length}</span>
            </div>
            {(() => {
              const n = new Set(FR[gi].flatMap(w => w.syl).filter(k => !clips.has(k))).size;
              return (
                <span className={`pill ${n ? '' : 'none'}`}>
                  {n ? `Aporta ${n} sílaba${n > 1 ? 's' : ''} nueva${n > 1 ? 's' : ''}` : 'Ya la tienes completa'}
                </span>
              );
            })()}
          </div>

          <p className="sentence">
            {FRASES[gi].split(/\s+/).map((tok, i) => (
              <span
                key={i}
                className={`w ${guidedTake ? (guidedTake.ok ? 'got' : 'bad') : ''}`}
              >
                {tok}
              </span>
            ))}
          </p>

          <div className="sylhint">
            {FR[gi]
              .map(w =>
                w.syl
                  .map(s => (clips.has(s) ? s : `*${s}*`))
                  .join('·')
              )
              .join('  ')
              .split('*')
              .map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part))}
          </div>

          <p className="note">
            Léela como si dictaras: <b>palabra a palabra, con una pausa corta entre cada una</b>, en tu tono normal. Di cada palabra <b>entera y de un tirón</b>, sin separarla en sílabas, sin alargar la última y sin pegarla a la siguiente. En el karaoke no hace falta ir clavado al tiempo: la app busca los silencios entre palabras.
          </p>

          <label className="check" htmlFor="kOn">
            <input
              type="checkbox"
              id="kOn"
              checked={karaokeOn}
              onChange={e => setKaraokeOn(e.target.checked)}
            />
            Modo karaoke: te enseño las palabras una a una, a tu ritmo
          </label>

          <label className="check" htmlFor="natG">
            <input
              type="checkbox"
              id="natG"
              checked={naturalAudio}
              onChange={e => {
                setNaturalAudio(e.target.checked);
                setRecNatural(e.target.checked);
              }}
            />
            Grabación natural: sin los filtros del navegador (recomendado en un sitio tranquilo)
          </label>

          {karaokeOn && (
            <div className="sliders">
              <label htmlFor="kSpeed">
                Velocidad del karaoke <output>{karaokeSpeed.toFixed(1).replace('.', ',')}×</output>
                <input
                  type="range"
                  id="kSpeed"
                  min="0.6"
                  max="1.6"
                  step="0.1"
                  value={karaokeSpeed}
                  onChange={e => setKaraokeSpeed(+e.target.value)}
                />
              </label>
            </div>
          )}

          <div className="row">
            <button className="recbtn" onClick={startGuidedRecording}>
              ● Grabar frase
            </button>
            <label className="btn" htmlFor="gUp">
              ⇪ Subir audio
            </label>
            <input
              type="file"
              id="gUp"
              accept="audio/*"
              className="hidden-input"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleUploadGuidedAudio(f);
                e.target.value = '';
              }}
            />
            <button
              className="ghost"
              disabled={gi === 0}
              onClick={() => {
                setGi(Math.max(0, gi - 1));
                setGuidedTake(null);
                setEditingWordIdx(null);
              }}
            >
              ← Anterior
            </button>
            <button
              className="ghost"
              disabled={gi === FRASES.length - 1}
              onClick={() => {
                setGi(Math.min(FRASES.length - 1, gi + 1));
                setGuidedTake(null);
                setEditingWordIdx(null);
              }}
            >
              Siguiente →
            </button>
            <button
              className="ghost"
              onClick={() => {
                let best = gi, bs = -1;
                FR.forEach((_, i) => {
                  const n = new Set(FR[i].flatMap(w => w.syl).filter(k => !clips.has(k))).size;
                  if (n > bs) {
                    bs = n;
                    best = i;
                  }
                });
                if (bs > 0) {
                  setGi(best);
                  setGuidedTake(null);
                  setEditingWordIdx(null);
                } else {
                  setGuidedStatus({ msg: '¡Ya tienes todas las sílabas del texto de grabación!', kind: 'ok' });
                }
              }}
            >
              La que más aporta
            </button>
          </div>

          <div className="meter" aria-hidden="true">
            <i style={{ width: `${recordingLevel}%` }} className={isLevelHot ? 'hot' : ''}></i>
          </div>

          <canvas ref={guidedWaveRef} aria-label="Grabación troceada en palabras y sílabas"></canvas>
          <div className={`status ${guidedStatus.kind || ''}`}>{guidedStatus.msg}</div>

          {/* Review cuts box */}
          {guidedTake && guidedTake.ok && (
            <div style={{ marginTop: 12 }}>
              <div className="label" style={{ marginBottom: 8 }}>Revisa los cortes</div>
              <p className="note" style={{ marginBottom: 10 }}>
                Toca una sílaba para oírla. Las marcadas se guardarán: las nuevas entran en tu banco y las que ya tenías se añaden como otra versión. Las que tienen borde discontinuo (⚠) son dudosas: pulsa ✂ Ajustar si hace falta mover el corte.
              </p>

              <div className="review">
                {guidedTake.words.map((w, wi) => (
                  <div key={wi} className="rword">
                    <button
                      className="wbtn"
                      onClick={() => playData(finish(guidedTake.data.slice(w.start, w.end), guidedTake.sr))}
                    >
                      ▶ {w.word.word}
                    </button>

                    {w.word.syl.map((s, j) => {
                      const exists = clips.has(s);
                      const full = nVers(s) >= MAX_VERS;
                      const isSure = w.sure[j] !== false;
                      const isPicked = !!reviewPicks[`${wi}-${j}`];

                      return (
                        <span
                          key={j}
                          className={`pick ${isPicked ? 'on' : ''} ${isSure ? '' : 'doubt'}`}
                        >
                          <button
                            type="button"
                            onClick={() => playData(getSyllableAudio(w, j))}
                          >
                            {s}
                          </button>
                          <label>
                            <input
                              type="checkbox"
                              checked={isPicked}
                              aria-label={`Guardar ${s}`}
                              onChange={e => {
                                setReviewPicks(prev => ({
                                  ...prev,
                                  [`${wi}-${j}`]: e.target.checked
                                }));
                              }}
                            />
                          </label>
                          {exists && (
                            <small>
                              {full ? `ya tienes ${MAX_VERS} versiones` : `+ versión ${nVers(s) + 1} de ${MAX_VERS}`}
                            </small>
                          )}
                          {!isSure && <small className="warn">⚠ revisa</small>}
                        </span>
                      );
                    })}

                    {w.word.syl.length > 1 && (
                      <button
                        className="ghost cutbtn"
                        onClick={() => setEditingWordIdx(editingWordIdx === wi ? null : wi)}
                      >
                        ✂ Ajustar
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Interactive Cut Editor */}
              {editingWordIdx !== null && guidedTake.words[editingWordIdx] && (
                <div className="editbox">
                  <div className="row between">
                    <span className="label">
                      Ajusta los cortes de «{guidedTake.words[editingWordIdx].word.word}»
                    </span>
                    <button className="primary" onClick={() => setEditingWordIdx(null)}>
                      Listo
                    </button>
                  </div>
                  <p className="note">
                    Arrastra las líneas rojas hasta el hueco o el cambio de sonido entre sílabas. Al soltar suena la sílaba.
                  </p>
                  <p className="note">
                    {(() => {
                      const cutBias = getCutBias();
                      const learnt = Object.entries(cutBias)
                        .filter(([, b]) => b.n >= 3)
                        .map(
                          ([t, b]) =>
                            `cortes ${CUT_TYPES[t] || t} ${b.m >= 0 ? '+' : '−'}${Math.round(
                              Math.abs(Math.max(-0.06, Math.min(0.06, b.m))) * 1000
                            )} ms`
                        );
                      return learnt.length
                        ? `🧠 Ya aprendí de tus ajustes y corrijo solo: ${learnt.join(' · ')}.`
                        : '🧠 Cuando guardes, la app aprende de cómo mueves los cortes.';
                    })()}
                  </p>

                  <canvas
                    ref={editCanvasRef}
                    aria-label="Palabra ampliada con los cortes de sus sílabas"
                    onPointerDown={e => {
                      const w = guidedTake.words[editingWordIdx];
                      const cv = editCanvasRef.current;
                      if (!w || !cv) return;
                      const rect = cv.getBoundingClientRect();
                      const xNorm = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      const len = w.end - w.start;
                      let best = -1, bd = 1e9;
                      w.sylRanges.slice(1).forEach((r, i) => {
                        const dpx = Math.abs(r[0] / len - xNorm) * cv.clientWidth;
                        if (dpx < bd) {
                          bd = dpx;
                          best = i;
                        }
                      });
                      if (best >= 0 && bd <= 40) {
                        setDragCutIdx(best);
                        cv.setPointerCapture(e.pointerId);
                      }
                    }}
                    onPointerMove={e => {
                      if (dragCutIdx === null || !editCanvasRef.current) return;
                      const w = guidedTake.words[editingWordIdx];
                      const cv = editCanvasRef.current;
                      const rect = cv.getBoundingClientRect();
                      const xNorm = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      const len = w.end - w.start;
                      const i = dragCutIdx + 1;
                      const gap = Math.floor(guidedTake.sr * 0.03);
                      const lo = w.sylRanges[i - 1][0] + gap;
                      const hi = w.sylRanges[i][1] - gap;
                      const c = Math.max(lo, Math.min(hi, Math.round(xNorm * len)));
                      w.sylRanges[i - 1][1] = c;
                      w.sylRanges[i][0] = c;
                      // Trigger re-render of canvas
                      setGuidedTake({ ...guidedTake });
                    }}
                    onPointerUp={() => {
                      if (dragCutIdx === null) return;
                      const w = guidedTake.words[editingWordIdx];
                      const i = dragCutIdx + 1;
                      setDragCutIdx(null);
                      w.touched.add(i);
                      w.sure[i - 1] = true;
                      w.sure[i] = true;
                      setReviewPicks(prev => ({
                        ...prev,
                        [`${editingWordIdx}-${i - 1}`]: true,
                        [`${editingWordIdx}-${i}`]: true
                      }));
                      playData(getSyllableAudio(w, i));
                    }}
                  />

                  <div className="row">
                    {guidedTake.words[editingWordIdx].word.syl.map((s, j) => (
                      <button
                        key={j}
                        className="ghost"
                        onClick={() => playData(getSyllableAudio(guidedTake.words[editingWordIdx], j))}
                      >
                        ▶ {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="row" style={{ marginTop: 12 }}>
                <button
                  className="primary"
                  onClick={handleSaveGuidedReview}
                  disabled={Object.values(reviewPicks).filter(Boolean).length === 0}
                >
                  Guardar {Object.values(reviewPicks).filter(Boolean).length} cortes
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    setGuidedTake(null);
                    setEditingWordIdx(null);
                    setGuidedStatus({ msg: 'Toma descartada. Puedes volver a grabarla.' });
                  }}
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            <div className="row between">
              <span className="label">Cobertura del texto de grabación</span>
              <span className="state">
                {recordedCount} de {ALL_SYL.size} sílabas ({coveragePct} %)
              </span>
            </div>
            <div className="progress">
              <i style={{ width: `${coveragePct}%` }}></i>
            </div>
          </div>
        </section>
      )}

      {/* TAB: SÍLABA SUELTA */}
      {tab === 'single' && (
        <section className="panel" role="tabpanel">
          <div className="studio">
            <div className="big">{selectedSyl || '—'}</div>
            <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
              <div className="state">
                {!selectedSyl ? (
                  'Elige una sílaba en la frase de arriba o en el banco.'
                ) : curSylTake ? (
                  <span>
                    <b>Grabada</b> · {(curSylTake.data.length / curSylTake.sr).toFixed(2).replace('.', ',')} s
                    {nVers(selectedSyl) > 1 ? ` · ${nVers(selectedSyl)} versiones` : ''}. Al grabar, sustituyes la favorita.
                  </span>
                ) : (
                  <span>
                    <b>Falta por grabar.</b> Pulsa Grabar y di «{selectedSyl}».
                  </span>
                )}
              </div>

              <div className="row">
                <button
                  className="recbtn"
                  disabled={!selectedSyl}
                  onClick={handleRecordSingle}
                >
                  {isRecordingSingle ? '■ Parar' : '● Grabar'}
                </button>
                <button
                  disabled={!selectedSyl || !curSylTake}
                  onClick={() => selectedSyl && playData(clipData(selectedSyl)!)}
                >
                  ▶ Escuchar
                </button>
                <label className="btn" htmlFor="upSingle">
                  ⇪ Subir audio
                </label>
                <input
                  type="file"
                  id="upSingle"
                  accept="audio/*"
                  className="hidden-input"
                  onChange={async e => {
                    const f = e.target.files?.[0];
                    if (f && selectedSyl) {
                      try {
                        const m = await decodeMono(f);
                        const p = trimClip(m.data, m.sr, 0.1);
                        if (p) {
                          saveSyl(selectedSyl, p, m.sr, { src: 'suelta' });
                          setSingleStatus({ msg: `«${selectedSyl}» guardada.`, kind: 'ok' });
                          refreshNag();
                        }
                      } catch {
                        setSingleStatus({ msg: 'No se pudo leer el archivo.', kind: 'err' });
                      }
                    }
                    e.target.value = '';
                  }}
                />
                <button
                  className="ghost"
                  disabled={!selectedSyl || !curSylTake}
                  onClick={() => {
                    if (selectedSyl) {
                      deleteVersion(selectedSyl, 'p');
                      refreshNag();
                    }
                  }}
                >
                  Borrar
                </button>
              </div>

              <div className="meter" aria-hidden="true">
                <i style={{ width: `${recordingLevel}%` }} className={isLevelHot ? 'hot' : ''}></i>
              </div>

              <div className="row">
                <button className="ghost" onClick={handleNextMissing}>
                  Siguiente que falta →
                </button>
                {fromBank && (
                  <button className="ghost" onClick={() => setTab('bank')}>
                    ← Volver al banco
                  </button>
                )}
              </div>
            </div>
          </div>

          <label className="check" htmlFor="natS">
            <input
              type="checkbox"
              id="natS"
              checked={naturalAudio}
              onChange={e => {
                setNaturalAudio(e.target.checked);
                setRecNatural(e.target.checked);
              }}
            />
            Grabación natural: sin los filtros del navegador (recomendado en un sitio tranquilo)
          </label>
          <p className="note">
            Útil para rellenar huecos o repetir una sílaba que salió mal. Dila seca y natural, sin alargarla. Se para sola a los 2 segundos.
          </p>
          <div className={`status ${singleStatus.kind || ''}`}>{singleStatus.msg}</div>
        </section>
      )}

      {/* TAB: BANCO DE CORTES */}
      {tab === 'bank' && (
        <section className="panel" role="tabpanel">
          <div className="row between">
            <div style={{ display: 'grid', gap: 6 }}>
              <div className="label">Tus sílabas grabadas</div>
              <span className="note">Un toque para oírla · doble toque para volver a grabarla</span>
            </div>
            {clips.size > 0 && (
              <div className="row">
                {clearBankArmed ? (
                  <>
                    <span className="note">¿Borrar todas?</span>
                    <button
                      className="recbtn small"
                      onClick={() => {
                        clearBank();
                        setSelectedSyl(null);
                        setClearBankArmed(false);
                        refreshNag();
                      }}
                    >
                      Sí, borrar
                    </button>
                    <button className="ghost small" onClick={() => setClearBankArmed(false)}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button className="ghost small" onClick={() => setClearBankArmed(true)}>
                    Borrar todas
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bank syllable chips */}
          <div className="bank">
            {clips.size === 0 ? (
              <span className="note">Aún no hay sílabas grabadas. Empieza por la lectura guiada.</span>
            ) : (
              [...clips.keys()]
                .sort((a, b) => a.localeCompare(b, 'es'))
                .map(k => {
                  const nv = nVers(k);
                  return (
                    <button
                      key={k}
                      className="chip has"
                      data-n={nv > 1 ? nv : undefined}
                      title="Doble toque para volver a grabarla"
                      onClick={() => {
                        const now = performance.now();
                        if (lastTap.k === k && now - lastTap.t < 400) {
                          setLastTap({ k: null, t: 0 });
                          setSelectedSyl(k);
                          setFromBank(true);
                          setTab('single');
                          setSingleStatus({
                            msg: `Vas a volver a grabar «${k}». Escucha la actual con ▶ y pulsa Grabar cuando quieras.`
                          });
                          return;
                        }
                        setLastTap({ k, t: now });
                        setSelectedSyl(k);
                        playData(clipData(k)!);
                      }}
                    >
                      {k}
                    </button>
                  );
                })
            )}
          </div>

          {/* Versions of selected syllable */}
          {selectedSyl && clips.has(selectedSyl) && (
            <div className="vers">
              <div className="row between">
                <div className="label">
                  Versiones de «{selectedSyl}» · {curSylVersions.length} de {MAX_VERS}
                </div>
                <button
                  className="ghost small"
                  onClick={() => {
                    setFromBank(true);
                    setTab('single');
                    setSingleStatus({
                      msg: `Vas a volver a grabar «${selectedSyl}». Escucha la actual con ▶ y pulsa Grabar cuando quieras.`
                    });
                  }}
                >
                  ● Regrabar la favorita
                </button>
              </div>

              {curSylVersions.map((v, i) => {
                const f = f0Of(v.take);
                const iss = worseOn ? issuesOfTake(v.take, 0) : baseIssues(v.take);
                const m = v.take.meta;
                const bits: string[] = [];
                if (m && m.pos) bits.push(m.pos);
                if (m && m.ton != null) bits.push(m.ton ? 'tónica' : 'átona');
                if (m && m.src === 'suelta') bits.push('grabada suelta');
                bits.push(
                  `${(v.take.data.length / v.take.sr).toFixed(2).replace('.', ',')} s${
                    f ? ` · ${Math.round(f)} Hz` : ''
                  }`
                );

                const isArmed = delArmedKey === `${selectedSyl}|${v.id}`;

                return (
                  <div key={i} className="vrow">
                    <button
                      className="small"
                      aria-label={`Escuchar versión ${i + 1}`}
                      onClick={() => playData(resample(v.take.data, v.take.sr, ac().sampleRate))}
                    >
                      ▶
                    </button>
                    <span className="vlab">
                      <b>{v.fav ? '★ Favorita' : `Versión ${i + 1}`}</b> · {bits.join(' · ')}
                      {iss.length > 0 && <span style={{ color: 'var(--rec)' }}> · ⚠ {iss.join(', ')}</span>}
                    </span>

                    {!v.fav && (
                      <button
                        className="ghost small"
                        onClick={() => {
                          setFavorite(selectedSyl, v.id);
                          setDelArmedKey(null);
                        }}
                      >
                        ★ Favorita
                      </button>
                    )}

                    <button
                      className={isArmed ? 'recbtn small' : 'ghost small'}
                      onClick={() => {
                        if (!isArmed) {
                          setDelArmedKey(`${selectedSyl}|${v.id}`);
                          return;
                        }
                        deleteVersion(selectedSyl, v.id);
                        setDelArmedKey(null);
                        refreshNag();
                      }}
                    >
                      {isArmed ? '¿Seguro?' : 'Borrar'}
                    </button>
                  </div>
                );
              })}
              <p className="note">
                Al leer, la app elige sola la versión que mejor encaja en cada sitio; la favorita tiene preferencia si no hay ninguna mejor.
              </p>
            </div>
          )}

          {/* Sílabas a mejorar */}
          <div className="worse">
            <div className="row between">
              <div className="label">Sílabas a mejorar</div>
              <button className="small" onClick={() => setWorseOn(!worseOn)}>
                🔎 {worseOn ? 'Ocultar revisión' : 'Revisar mi banco'}
              </button>
            </div>
            <p className="note">
              Busca versiones que pueden sonar mal al empalmar: muy cortas o largas, saturadas, con un tono muy distinto o con corte dudoso.
            </p>

            {worseOn && (
              <div className="wl">
                {(() => {
                  const fs = [...clips.values()].map(f0Of).filter(Boolean).sort((a, b) => a - b);
                  const medF0 = fs.length ? fs[fs.length >> 1] : 0;
                  const suspicious: { key: string; label: string; take: SyllableTake }[] = [];

                  [...clips.keys()].forEach(k => {
                    versions(k).forEach((v, i) => {
                      const iss = issuesOfTake(v.take, medF0);
                      if (iss.length) {
                        suspicious.push({
                          key: k,
                          label: `${k} ${v.fav ? '★' : `v${i + 1}`} (${iss.join(', ')})`,
                          take: v.take
                        });
                      }
                    });
                  });

                  if (!suspicious.length) {
                    return <span className="note">¡Todo en orden! No he encontrado versiones sospechosas.</span>;
                  }

                  return suspicious.map((item, idx) => (
                    <button
                      key={idx}
                      className="chip has"
                      onClick={() => {
                        playData(resample(item.take.data, item.take.sr, ac().sampleRate));
                        setSelectedSyl(item.key);
                      }}
                    >
                      {item.label}
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>

          {/* Backup Section */}
          <div className="backup">
            <div className="label">Copia de seguridad y sincronización</div>
            <p className="note">
              Tus sílabas se guardan en este dispositivo. Puedes guardarlas en la nube en tu carpeta «MiVoz» de Google Drive para tenerlas en tu móvil y ordenador, o descargar un archivo .zip.
            </p>
            <div className="row">
              <button
                className="primary"
                onClick={() => (onOpenDriveSync ? onOpenDriveSync() : setIsDriveModalOpen(true))}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <span>☁️</span> Google Drive (MiVoz)
              </button>
              <button onClick={handleDownloadBackup}>
                ⇩ Descargar copia .zip
              </button>
              <label className="btn" htmlFor="bkZipIn">
                ⇪ Importar copia o audios
              </label>
              <input
                type="file"
                id="bkZipIn"
                accept=".zip,application/zip,audio/*"
                multiple
                className="hidden-input"
                onChange={handleImportBackup}
              />
            </div>
            {backupStatus && <div className="status ok">{backupStatus}</div>}
          </div>

          <details>
            <summary>Cómo funciona</summary>
            <p>
              El texto se pasa a una escritura fonética: «qu» y «c» fuerte suenan como «k», la «h» no suena, «v» es «b», «ll» es «y» y «ge/gi» es «je/ji». Luego cada palabra se divide en sílabas con las reglas del español.
            </p>
            <p>
              En la lectura guiada, la app busca los silencios para separar las palabras, analiza la curva de energía vocálica y corta cada sílaba. Con ✂ Ajustar puedes mover el corte con el dedo y la app aprende de tus ajustes.
            </p>
            <p>
              Entonación de frase: la app calcula la sílaba tónica de cada palabra, ajusta las melodías (subida en tónicas, caída al final, preguntas hacia arriba) y desliza suavemente el tono usando TD-PSOLA.
            </p>
          </details>
        </section>
      )}

      {/* KARAOKE OVERLAY */}
      {overlayOpen && (
        <div className="ov" role="dialog" aria-modal="true" aria-label="Grabando frase">
          <div className="ov-top">
            <span className="recdot" aria-hidden="true"></span>
            <span className="label">Grabando · frase {gi + 1}</span>
          </div>

          <p className={`ov-line ${karaokeOn ? '' : 'free'}`}>
            {FRASES[gi].split(/\s+/).map((w, i) => (
              <span
                key={i}
                className={`w ${
                  !karaokeOn ? '' : i < overlayCurIdx ? 'done' : i === overlayCurIdx ? 'cur' : ''
                }`}
              >
                {w}
              </span>
            ))}
          </p>

          {karaokeOn && (
            <div className={`ov-word ${overlayWordClass}`} aria-live="assertive">
              {overlayWord}
            </div>
          )}

          <p className="ov-hint">{overlayHint}</p>

          <div className="meter" aria-hidden="true">
            <i style={{ width: `${recordingLevel}%` }} className={isLevelHot ? 'hot' : ''}></i>
          </div>

          <button className="recbtn" onClick={stopActiveRecording}>
            ■ Parar
          </button>
        </div>
      )}

      {/* GOOGLE DRIVE SYNC MODAL */}
      <DriveSyncModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onSyncComplete={refreshNag}
      />
    </div>
  );
};
