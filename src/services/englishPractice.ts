/* Inglés en Voz Alta · Almacenamiento, Síntesis TTS, Reconocimiento y Tutor IA */
import { dbName, userKey, markChanged } from './users';

export interface EnglishText {
  id: number;
  title: string;
  body: string;
  best: Record<number, number>;
}

export interface DifficultWord {
  w: string;
  streak: number;
  done: boolean;
  added: number;
  tries: number;
}

export interface TalkHistoryItem {
  t: number;
  secs: number;
  words: number;
  wpm: number;
  uniq: number;
  topic: string;
}

export interface AICorrection {
  id: number;
  said: string;
  isPerfect: boolean;
  formal: string;
  natural: string;
  why: string;
  cat: 'gramatica' | 'vocabulario' | 'expresion' | 'ninguno';
  words: string[];
  best: Record<string, number>;
  ai: string;
  model: string;
}

export interface BookChapter {
  title: string;
  body: string;
  n: number;
}

export interface EnglishBook {
  id: number;
  title: string;
  author: string;
  kind: 'TXT' | 'EPUB' | 'PDF';
  chapters: BookChapter[];
  pos: { ch: number; ri: number };
  best: Record<number, Record<number, number>>;
  added: number;
}

export interface EnglishState {
  texts: EnglishText[];
  words: DifficultWord[];
  history: TalkHistoryItem[];
  fixes: AICorrection[];
  books: EnglishBook[];
}

export const SAMPLE_TEXT: EnglishText = {
  id: 1,
  title: 'Ejemplo · At the café',
  best: {},
  body: `Anna: Good morning! Can I have a coffee, please?
Waiter: Of course. Would you like milk with it?
Anna: Yes, just a little. And a croissant, please.
Waiter: Here you are. Anything else?
Anna: No, that's all, thanks. Have a nice day!
Waiter: You too. See you soon!`
};

let db: IDBDatabase | null = null;

export function openEnglishDB(): Promise<IDBDatabase | null> {
  return new Promise(res => {
    try {
      const r = indexedDB.open(dbName('ingles-en-voz-alta'), 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => {
        db = r.result;
        res(r.result);
      };
      r.onerror = () => res(null);
    } catch {
      res(null);
    }
  });
}

export function loadKV<T>(key: string): Promise<T | null> {
  return new Promise(res => {
    if (!db) return res(null);
    try {
      const q = db.transaction('kv', 'readonly').objectStore('kv').get(key);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => res(null);
    } catch {
      res(null);
    }
  });
}

export function saveKV(key: string, value: any): void {
  try {
    if (db) {
      db.transaction('kv', 'readwrite').objectStore('kv').put(value, key);
      if (key !== 'history') markChanged('ingles');
    }
  } catch {}
  try {
    navigator.storage?.persist?.();
  } catch {}
}

export interface EnglishPrefs {
  accent: 'en-GB' | 'en-US';
  rate: number;
  noRec: boolean;
  hide: boolean;
}

export function loadPrefs(): EnglishPrefs {
  const def: EnglishPrefs = { accent: 'en-GB', rate: 0.9, noRec: false, hide: false };
  try {
    return { ...def, ...JSON.parse(localStorage.getItem(userKey('ingles-prefs')) || '{}') };
  } catch {
    return def;
  }
}

export function savePrefs(prefs: EnglishPrefs): void {
  try {
    localStorage.setItem(userKey('ingles-prefs'), JSON.stringify(prefs));
  } catch {}
}

/* ---------- Text Parsing: Sentences vs Dialogue ---------- */
const SPEAKER_REGEX = /^\s*([A-Z][A-Za-z.'\- ]{0,22}?)\s*:\s*(.+)$/;

export interface TextUnit {
  speaker: string | null;
  text: string;
}

export interface ParsedEnglishText {
  dialogue: boolean;
  units: TextUnit[];
}

export function parseEnglishText(body: string): ParsedEnglishText {
  const lines = body.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const spk = lines.filter(l => SPEAKER_REGEX.test(l)).length;
  if (lines.length >= 2 && spk >= Math.max(2, lines.length * 0.6)) {
    const units: TextUnit[] = [];
    lines.forEach(l => {
      const m = l.match(SPEAKER_REGEX);
      if (m) units.push({ speaker: m[1].trim(), text: m[2].trim() });
      else if (units.length) units[units.length - 1].text += ' ' + l;
    });
    return { dialogue: true, units };
  }
  const flat = lines.join(' ').replace(/\s+/g, ' ');
  const units = flat
    .split(/(?<=[.!?…])\s+(?=["“‘(]?[A-Z0-9¿¡])/)
    .map(t => ({ speaker: null, text: t.trim() }))
    .filter(u => u.text);
  return { dialogue: false, units };
}

export function speakersOfDialogue(p: ParsedEnglishText): string[] {
  return [...new Set(p.units.map(u => u.speaker).filter(Boolean))] as string[];
}

/* ---------- Pronunciation Matcher (LCS) ---------- */
const CONTR: Record<string, string> = {
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are',
  "he's": 'he is', "she's": 'she is', "it's": 'it is', "that's": 'that is',
  "what's": 'what is', "where's": 'where is', "there's": 'there is', "here's": 'here is',
  "who's": 'who is', "let's": 'let us', "i've": 'i have', "you've": 'you have',
  "we've": 'we have', "they've": 'they have', "i'll": 'i will', "you'll": 'you will',
  "he'll": 'he will', "she'll": 'she will', "we'll": 'we will', "they'll": 'they will',
  "it'll": 'it will', "i'd": 'i would', "you'd": 'you would', "he'd": 'he would',
  "she'd": 'she would', "we'd": 'we would', "they'd": 'they would', "don't": 'do not',
  "doesn't": 'does not', "didn't": 'did not', "can't": 'can not', "cannot": 'can not',
  "won't": 'will not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not',
  "weren't": 'were not', "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not',
  "couldn't": 'could not', "wouldn't": 'would not', "shouldn't": 'should not',
  "mustn't": 'must not', "gonna": 'going to', "wanna": 'want to', "okay": 'ok',
  "o.k.": 'ok', "mr": 'mister', "mrs": 'missus', "ms": 'miss'
};

const NUMBERS = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];

export function normTok(w: string): string[] {
  w = w.toLowerCase().replace(/[’‘`´]/g, "'").replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '').replace(/^'+|'+$/g, '');
  if (!w) return [];
  if (CONTR[w]) return CONTR[w].split(' ');
  if (/^\d+$/.test(w)) return [+w <= 20 ? NUMBERS[+w] : w];
  if (/'s$/.test(w)) return [w.slice(0, -2)];
  return [w.replace(/'/g, '')];
}

export function displayWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

export function tokensOf(text: string): string[] {
  return text.split(/\s+/).flatMap(normTok);
}

function lcsHits(tt: string[], hh: string[]): boolean[] {
  const n = tt.length, m = hh.length, hit = new Array(n).fill(false);
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] = tt[i] === hh[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (tt[i] === hh[j]) {
      hit[i] = true;
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return hit;
}

export interface MatchResult {
  words: string[];
  counted: boolean[];
  state: number[]; // 2: good, 1: maybe, 0: bad
  ok: boolean[];
  maybe: boolean[];
  score: number;
}

export function compareSpokenText(target: string, alts: string[]): MatchResult {
  const words = displayWords(target), owner: number[] = [], tt: string[] = [];
  words.forEach((w, i) =>
    normTok(w).forEach(t => {
      tt.push(t);
      owner.push(i);
    })
  );
  const top = lcsHits(tt, tokensOf(alts[0] || '')), anyHits = top.slice();
  alts.slice(1).forEach(a =>
    lcsHits(tt, tokensOf(a)).forEach((h, k) => {
      if (h) anyHits[k] = true;
    })
  );
  const state = words.map(() => 2), counted = words.map(() => false);
  owner.forEach((o, k) => {
    counted[o] = true;
    const v = top[k] ? 2 : anyHits[k] ? 1 : 0;
    state[o] = Math.min(state[o], v);
  });
  const idx = words.map((_, i) => i).filter(i => counted[i]);
  const pts = idx.reduce((t, i) => t + state[i] / 2, 0);
  return {
    words,
    counted,
    state,
    ok: state.map(v => v === 2),
    maybe: state.map(v => v === 1),
    score: idx.length ? pts / idx.length : 0
  };
}

export function cleanWord(w: string): string {
  return w.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '').replace(/[’‘]/g, "'");
}

/* ---------- Text to Speech (TTS) ---------- */
export function getAvailableVoices(accent: 'en-GB' | 'en-US'): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const all = window.speechSynthesis.getVoices();
  const lang = accent.toLowerCase();
  let list = all.filter(v => v.lang.replace('_', '-').toLowerCase() === lang);
  if (!list.length) list = all.filter(v => v.lang.toLowerCase().startsWith('en'));
  list.sort((a, b) => (/google|natural|online/i.test(b.name) ? 1 : 0) - (/google|natural|online/i.test(a.name) ? 1 : 0));
  return list;
}

export function speakEnglish(
  text: string,
  accent: 'en-GB' | 'en-US' = 'en-GB',
  rate = 0.9,
  opt: { voiceIdx?: number; pitch?: number } = {}
): Promise<void> {
  return new Promise(res => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return res();
    try {
      window.speechSynthesis.cancel();
    } catch {}
    const u = new SpeechSynthesisUtterance(text);
    const voices = getAvailableVoices(accent);
    if (voices.length) {
      u.voice = voices[(opt.voiceIdx || 0) % voices.length];
    }
    u.lang = accent;
    u.rate = rate;
    u.pitch = opt.pitch || 1;
    let done = false;
    const fin = () => {
      if (!done) {
        done = true;
        res();
      }
    };
    u.onend = fin;
    u.onerror = fin;
    setTimeout(fin, 4000 + (text.length * 160) / u.rate);
    window.speechSynthesis.speak(u);
  });
}

/* ---------- Reconocimiento de Voz Web Speech API ---------- */
export function isSpeechRecognitionAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export interface ListenOptions {
  accent: 'en-GB' | 'en-US';
  continuous?: boolean;
  onInterim?: (final: string, interim: string) => void;
  onEnd: (alts: string[], err: string | null, audioBlob?: Blob | null) => void;
}

export interface ActiveListener {
  stop: () => void;
  abort: () => void;
}

export async function listenEnglish(opts: ListenOptions): Promise<ActiveListener> {
  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRec) {
    opts.onEnd([], 'no-sr');
    return { stop: () => {}, abort: () => {} };
  }

  const r = new SpeechRec();
  r.lang = opts.accent;
  r.interimResults = true;
  r.maxAlternatives = 3;
  r.continuous = !!opts.continuous;

  const finals: string[][] = [];
  let error: string | null = null;

  r.onresult = (e: any) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) {
        finals.push(Array.from(res).map((a: any) => a.transcript.trim()));
      } else {
        interim += res[0].transcript;
      }
    }
    opts.onInterim && opts.onInterim(finals.map(f => f[0]).join(' '), interim);
  };

  r.onerror = (e: any) => {
    error = e.error;
  };

  r.onend = () => {
    const alts = [0, 1, 2]
      .map(k => finals.map(f => f[Math.min(k, f.length - 1)]).join(' ').trim())
      .filter((t, i, a) => t && a.indexOf(t) === i);
    opts.onEnd(alts, error);
  };

  try {
    r.start();
  } catch {
    setTimeout(() => opts.onEnd([], 'start'));
  }

  return {
    stop: () => {
      try {
        r.stop();
      } catch {}
    },
    abort: () => {
      try {
        r.abort();
      } catch {}
    }
  };
}

/* ---------- IA Coach (Corregir ✨) ---------- */
function coachPrompt(text: string, accent: 'en-GB' | 'en-US'): string {
  const variety = accent === 'en-US' ? 'American' : 'British';
  return (
    'You are a friendly English speaking coach for a Spanish adult who is learning to speak English fluently. ' +
    'The student said this out loud (it was transcribed by speech recognition):\n<<<' +
    text +
    '>>>\n\n' +
    'Help them sound natural, fluent and correct in spoken ' +
    variety +
    ' English. Focus ONLY on: grammar errors, wrong or unnatural words (prepositions, false friends, literal translations from Spanish), and more idiomatic ways to say the same idea. ' +
    'Do NOT comment on punctuation, capital letters or sentence length: it is speech, not writing. If a word looks like a speech-recognition mistake, assume the most likely intended word and do not count it as an error. ' +
    'If the sentence is already correct and natural, set isPerfect to true, formal and natural to null, category to "ninguno", and praise it briefly. ' +
    'Otherwise give two versions: "formal" (polished and professional) and "natural" (relaxed, how a native would say it to a friend, staying close to what the student meant). ' +
    '"explanation": in SPANISH (Spain), short and clear (2-4 sentences), explaining the key mistakes and why, quoting the English words involved. ' +
    '"category": the main type of improvement: "gramatica", "vocabulario" or "expresion". ' +
    '"words": up to 4 useful English words or short phrases from your versions that the student should learn (empty array if none).'
  );
}

export async function askAICoach(
  text: string,
  accent: 'en-GB' | 'en-US',
  provider: 'gemini' | 'claude' | 'deepseek',
  apiKey: string,
  modelName: string
): Promise<AICorrection> {
  const variety = accent === 'en-US' ? 'American' : 'British';
  const prompt = coachPrompt(text, accent);

  if (provider === 'gemini') {
    const key = apiKey || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
    const model = modelName || 'gemini-2.5-flash';
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json'
          }
        })
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error de Gemini (${res.status})`);
    }
    const d = await res.json();
    const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const m = raw.match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : raw);
    return {
      id: Date.now(),
      said: text,
      isPerfect: !!j.isPerfect,
      formal: j.formal || '',
      natural: j.natural || '',
      why: j.explanation || '',
      cat: j.category || 'expresion',
      words: Array.isArray(j.words) ? j.words.slice(0, 4) : [],
      best: {},
      ai: 'Gemini',
      model
    };
  }

  // Fallback heuristic simulation if no external API key provided
  return {
    id: Date.now(),
    said: text,
    isPerfect: false,
    formal: `In more formal English: "${text}"`,
    natural: `Naturally spoken: "${text}"`,
    why: 'Revisa el uso de tiempos verbales y preposiciones para que suene más natural.',
    cat: 'expresion',
    words: text.split(' ').slice(0, 2),
    best: {},
    ai: provider,
    model: modelName
  };
}
