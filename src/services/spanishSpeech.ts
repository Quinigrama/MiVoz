/* Sílabas con Mi Voz · Motor de Fonética, Síntesis por Concatenación y DSP */
import { dbName, userKey, markChanged } from './users';

export interface SyllableMeta {
  pos?: 'mono' | 'ini' | 'med' | 'fin';
  ton?: boolean;
  prev?: string;
  next?: string;
  src?: string;
  dud?: boolean;
}

export interface SyllableTake {
  sr: number;
  data: Float32Array;
  meta: SyllableMeta | null;
  id?: number | string;
}

export interface VersionInfo {
  id: number | 'p';
  fav: boolean;
  take: SyllableTake;
}

export interface WordInfo {
  word: string;
  syl: string[];
  punct: boolean;
  stress: number;
  end?: string;
}

export interface SegmentedWord {
  start: number;
  end: number;
  word: WordInfo;
  sylRanges: [number, number][];
  sure: boolean[];
  types: string[];
  auto: number[];
  touched: Set<number>;
}

export interface GuidedTake {
  data: Float32Array;
  sr: number;
  ok: boolean;
  words: SegmentedWord[];
}

export const FRASES = [
  "El vecino toca la trompeta los fines de semana.",
  "Ya es hora de que arreglen el tejado del colegio.",
  "El zorro astuto engañó al cuervo con su voz dulce.",
  "Hubo un apagón y nos quedamos a oscuras.",
  "El granjero ordeña las vacas antes del amanecer.",
  "La exposición de pintura atrajo a miles de visitantes.",
  "El cielo se puso gris y empezó a llover con mucha fuerza.",
  "El examen de inglés fue más difícil de lo previsto.",
  "La guitarra suena mejor si cambias las cuerdas viejas.",
  "El volcán entró en erupción después de cien años.",
  "Juan y Lucía se casaron en una iglesia muy antigua.",
  "El náufrago sobrevivió tres semanas en una isla desierta.",
  "Ese huerto produce lechugas, pimientos y calabacines.",
  "El guardia de seguridad vigila la entrada del banco.",
  "El bebé se ríe cuando le hacen cosquillas.",
  "Cierra bien la ventana porque hace mucho frío.",
  "La niña juega con su muñeca en el jardín de la abuela.",
  "El queso manchego es famoso en todo el mundo.",
  "El sastre arregló el dobladillo del pantalón.",
  "El bosque está lleno de setas después de la lluvia.",
  "El juez dictó sentencia después de un largo juicio.",
  "El ratón se escondió detrás del armario.",
  "El sábado fuimos de excursión a la sierra de Gredos.",
  "Escribí un mensaje a mi madre para felicitarla.",
  "Hay que fregar los platos y barrer la cocina.",
  "El escultor talló una figura en mármol blanco.",
  "El hielo crujía bajo nuestros pies en el estanque.",
  "El científico observó las bacterias con el microscopio.",
  "Hicimos un muñeco de nieve con bufanda y gorro.",
  "Mañana temprano iremos a comprar pan y leche al mercado.",
  "El chófer aparcó la furgoneta delante del hotel.",
  "Tengo que renovar el carné de conducir este año.",
  "Se me olvidó el paraguas en el autobús.",
  "Los guiris disfrutan del sol en la costa.",
  "La miel de romero tiene un sabor muy suave.",
  "El trigo dorado se mueve con la brisa de la tarde.",
  "La gente aplaudió con entusiasmo al final del concierto.",
  "Un enjambre de abejas zumbaba junto a la colmena.",
  "Ojalá que el viernes haga buen tiempo para la feria.",
  "La orquesta afinó los instrumentos antes de empezar.",
  "Los domingos visitamos a los abuelos en el pueblo.",
  "El ruido de los coches no me deja dormir por la noche.",
  "La cruz roja atiende a los heridos del accidente.",
  "El piloto aterrizó el avión sin ningún problema.",
  "El público gritó de alegría con el último gol.",
  "Las flores del balcón necesitan agua cada dos días.",
  "Hoy toca limpiar el garaje y ordenar las herramientas.",
  "Juego al ajedrez con mi primo todos los jueves.",
  "Su gran sueño es viajar a Japón y a Australia.",
  "Las ovejas pastan tranquilas en la ladera del monte.",
  "La clase de baile empieza a las ocho y cuarto.",
  "El tren llega a la estación con diez minutos de retraso.",
  "El fuego de la chimenea calienta toda la casa.",
  "Hace falta harina, azúcar y huevos para el bizcocho.",
  "El atleta saltó más de ocho metros en longitud.",
  "El pianista ensayó la sonata durante horas.",
  "El alcalde inauguró el nuevo puente sobre el río.",
  "El perro de mi vecino ladra cada noche junto a la puerta.",
  "Me gusta pasear por la playa cuando sopla el viento del norte.",
  "La boda se celebró en un jardín lleno de luces.",
  "Brindamos con champán por el éxito del proyecto.",
  "El granizo rompió los cristales del invernadero.",
  "La bruja del cuento vivía en una choza del bosque.",
  "Necesito cambiar la rueda pinchada de la bicicleta.",
  "Los ingredientes del gazpacho son tomate, pepino y ajo.",
  "El fontanero cambió el grifo de la bañera.",
  "La cebra y la jirafa beben agua en la charca.",
  "Los bomberos apagaron el incendio en pocos minutos.",
  "Prueba este flan casero con caramelo.",
  "El crucero zarpó rumbo a las islas griegas.",
  "El jefe llegó tarde a la reunión de los lunes.",
  "El reloj de la plaza marca las doce en punto.",
  "El ciclista ganó la etapa con un sprint final.",
  "El submarino se sumergió a gran profundidad.",
  "El gato negro duerme tranquilo encima del sofá.",
  "La cigüeña construyó su nido en el campanario.",
  "El clima de esta región es seco y caluroso.",
  "Compré una chaqueta azul y unos guantes de lana.",
  "La señora del quinto piso tiene tres perros pequeños.",
  "La profesora explica la lección con mucha paciencia.",
  "La grúa levantó el contenedor con mucho cuidado.",
  "La nieve cubrió los tejados durante la madrugada.",
  "El pingüino nada rápido bajo el hielo del polo sur.",
  "El cocinero prepara una paella para veinte personas.",
  "Ayer vi una película muy divertida en el cine del barrio.",
  "Guarda las llaves en el cajón de la mesa.",
  "El oso pardo pesca salmones en el río.",
  "Los niños hacen cola para subir a la noria.",
  "Una ardilla trepó por el tronco del castaño.",
  "El buey y la mula descansaban en el establo.",
  "Me duele la muela desde hace una semana.",
  "El cántaro de barro mantiene fresca el agua.",
  "Él siempre lleva una libreta en el bolsillo.",
  "Busco un piso céntrico con terraza y ascensor.",
  "El yogur de fresa es el que más le gusta a Pablo.",
  "Cada otoño las hojas cubren el suelo del parque.",
  "La empresa busca un ingeniero con experiencia.",
  "El fútbol es el deporte favorito de mi sobrino.",
  "El tigre acecha a su presa entre la hierba alta.",
  "Ese chico tiene un perrito blanco muy simpático.",
  "Mi tía hace unas croquetas de jamón buenísimas.",
  "Los exploradores cruzaron el desierto en camello.",
  "Hay un atasco enorme en la salida de la ciudad.",
  "El vaquero lanzó el lazo y atrapó al ternero.",
  "La plancha está demasiado caliente para la seda.",
  "Quiero un café con leche y una tostada con tomate.",
  "La biblioteca abre a las nueve y cierra a las ocho.",
  "El pez dorado nada en círculos dentro de la pecera.",
  "El ordenador se quedó colgado en mitad del trabajo.",
  "El cliente pidió la cuenta y dejó una buena propina.",
  "El dragón de la leyenda guardaba un tesoro de oro.",
  "El fantasma del castillo asustaba a los visitantes.",
  "Prefiero el agua fría en verano y el té en invierno.",
  "El mecánico revisó el freno y el embrague del coche.",
  "La abuela teje una manta de ganchillo para el nieto.",
  "Mi hermano trabaja en una fábrica de zapatos en Elche.",
  "El tráfico en la autopista era muy denso esta mañana."
];

/* ---------- Fonética y silabeo ---------- */
const VOW = 'aeiouáéíóú', STRONG = 'aeoáéóíú';

export function phon(w: string): string[] {
  const u: string[] = [];
  for (let i = 0; i < w.length; i++) {
    const c = w[i], n = w[i + 1] || '', n2 = w[i + 2] || '';
    const front = n !== '' && 'eéií'.includes(n);
    switch (c) {
      case 'á': u.push('á'); break;
      case 'é': u.push('é'); break;
      case 'ó': u.push('ó'); break;
      case 'ü': u.push('u'); break;
      case 'c':
        if (n === 'h') { u.push('ĉ'); i++; }
        else u.push(front ? 'z' : 'k');
        break;
      case 'q':
        u.push('k'); if (n === 'u') i++;
        break;
      case 'g':
        if (n === 'u' && n2 !== '' && 'eéií'.includes(n2)) { u.push('g'); i++; }
        else u.push(front ? 'j' : 'g');
        break;
      case 'h': break;
      case 'l':
        if (n === 'l') { u.push('y'); i++; }
        else u.push('l');
        break;
      case 'r':
        if (n === 'r') { u.push('ř'); i++; }
        else u.push(i === 0 ? 'ř' : 'r');
        break;
      case 'v': u.push('b'); break;
      case 'w': u.push('u'); break;
      case 'x': u.push('k', 's'); break;
      case 'y': u.push(n !== '' && 'aeiouáéíóú'.includes(n) ? 'y' : 'i'); break;
      default:
        if ('abdefijkmnñoprstuzíú'.includes(c)) u.push(c);
    }
  }
  return u;
}

const insep = (a: string, b: string) => 'bkdfgpt'.includes(a) && 'lr'.includes(b);

export function syllabify(u: string[]): string[] & { accent?: number } {
  const isV = (x: string) => VOW.includes(x);
  const nuc: [number, number][] = [];
  let i = 0;
  while (i < u.length) {
    if (isV(u[i])) {
      let j = i;
      while (j + 1 < u.length && isV(u[j + 1]) && !(STRONG.includes(u[j]) && STRONG.includes(u[j + 1]))) j++;
      nuc.push([i, j]);
      i = j + 1;
    } else i++;
  }
  if (!nuc.length) {
    const empty: any = [];
    empty.accent = -1;
    return empty;
  }
  const starts = [0];
  for (let k = 1; k < nuc.length; k++) {
    const a = nuc[k - 1][1] + 1, b = nuc[k][0], n = b - a;
    let take = 0;
    if (n === 1) take = 1;
    else if (n === 2) take = insep(u[a], u[a + 1]) ? 2 : 1;
    else if (n === 3) take = insep(u[a + 1], u[a + 2]) ? 2 : 1;
    else if (n >= 4) take = 2;
    starts.push(b - take);
  }
  const map: Record<string, string> = { 'á': 'a', 'é': 'e', 'ó': 'o', 'í': 'i', 'ú': 'u', 'ĉ': 'ch', 'ř': 'rr' };
  const raw = starts.map((s, k) => u.slice(s, starts[k + 1] ?? u.length));
  const res: any = raw.map(r => r.map(x => map[x] || x).join(''));
  res.accent = raw.findIndex(r => r.some(x => 'áéíóú'.includes(x)));
  return res;
}

const ATONAS = new Set(
  'el la los las lo un una unos unas de del al a en con por para sin y e o u ni que se me te nos os le les mi mis tu tus su sus si pero como cuando donde'.split(' ')
);

export function stressIdx(low: string, syl: string[] & { accent?: number }): number {
  if (ATONAS.has(low)) return -1;
  if (syl.accent !== undefined && syl.accent >= 0) return syl.accent;
  const n = syl.length;
  if (n === 1) return 0;
  return /[aeiouns]$/.test(low) ? n - 2 : n - 1;
}

export function parseText(t: string): WordInfo[] {
  const out: WordInfo[] = [];
  for (const tok of t.split(/\s+/)) {
    const parts = tok.match(/[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]+/g);
    if (parts) {
      for (const p of parts) {
        const low = p.toLowerCase(), syl = syllabify(phon(low));
        if (syl.length) out.push({ word: p, syl, punct: false, stress: stressIdx(low, syl) });
      }
    }
    const m = (tok.match(/[.,;:!?…]/g) || []).join('');
    if (m && out.length) {
      const L = out[out.length - 1];
      L.punct = true;
      L.end = m.includes('?') ? '?' : (/[.!…]/.test(m) ? '.' : ',');
    }
  }
  return out;
}

export const FR = FRASES.map(f => parseText(f));
export const ALL_SYL = new Set(FR.flat().flatMap(w => w.syl));

/* ---------- Almacenamiento IndexedDB ---------- */
export const clips = new Map<string, SyllableTake>();
export const extras = new Map<string, SyllableTake[]>();
export const MAX_VERS = 5;
let idb: IDBDatabase | null = null;

export function openAudioDB(): Promise<IDBDatabase | null> {
  return new Promise(res => {
    try {
      const r = indexedDB.open(dbName('silabas-con-mi-voz'), 2);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('clips')) db.createObjectStore('clips');
        if (!db.objectStoreNames.contains('extras')) db.createObjectStore('extras');
      };
      r.onsuccess = () => {
        idb = r.result;
        res(r.result);
      };
      r.onerror = () => res(null);
    } catch {
      res(null);
    }
  });
}

function loadStore(db: IDBDatabase, name: string, each: (k: string, v: any) => void): Promise<void> {
  return new Promise(res => {
    try {
      const req = db.transaction(name, 'readonly').objectStore(name).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (c) {
          if (typeof c.key === 'string') each(c.key, c.value);
          c.continue();
        } else res();
      };
      req.onerror = () => res();
    } catch {
      res();
    }
  });
}

export async function loadAllSyllables(): Promise<void> {
  clips.clear();
  extras.clear();
  const db = idb || (await openAudioDB());
  if (!db) return;
  await loadStore(db, 'clips', (k, v) => clips.set(k, v));
  await loadStore(db, 'extras', (k, v) => {
    const syl = k.split('#')[0];
    if (!extras.has(syl)) extras.set(syl, []);
    extras.get(syl)!.push(v);
  });
  extras.forEach(a => a.sort((x: any, y: any) => (x.id || 0) - (y.id || 0)));
}

function storeIn(name: string, op: 'put' | 'del' | 'clear', k?: string, v?: any) {
  try {
    if (!idb) return;
    markChanged('silabas');
    const s = idb.transaction(name, 'readwrite').objectStore(name);
    if (op === 'put' && k) s.put(v, k);
    else if (op === 'del' && k) s.delete(k);
    else if (op === 'clear') s.clear();
  } catch {}
}

let lastId = 0;
function newId(): number {
  lastId = Math.max(Date.now(), lastId + 1);
  return lastId;
}

export function saveSyl(k: string, data: Float32Array, sr: number, meta?: SyllableMeta | null) {
  const v: SyllableTake = { sr, data, meta: meta || null };
  clips.set(k, v);
  storeIn('clips', 'put', k, v);
  askPersist();
}

export function nVers(k: string): number {
  return (clips.has(k) ? 1 : 0) + (extras.get(k) || []).length;
}

export function versions(k: string): VersionInfo[] {
  const out: VersionInfo[] = [];
  if (clips.has(k)) out.push({ id: 'p', fav: true, take: clips.get(k)! });
  (extras.get(k) || []).forEach(e => out.push({ id: (e.id as number) || 0, fav: false, take: e }));
  return out;
}

export function addVersion(k: string, data: Float32Array, sr: number, meta?: SyllableMeta | null) {
  if (!clips.has(k)) return saveSyl(k, data, sr, meta);
  const arr = extras.get(k) || [];
  const v: SyllableTake = { id: newId(), sr, data, meta: meta || null };
  arr.push(v);
  while (arr.length > MAX_VERS - 1) {
    const old = arr.shift()!;
    storeIn('extras', 'del', k + '#' + old.id);
  }
  extras.set(k, arr);
  storeIn('extras', 'put', k + '#' + v.id, v);
  askPersist();
}

export function setFavorite(k: string, id: number | 'p') {
  if (id === 'p') return;
  const arr = extras.get(k) || [];
  const i = arr.findIndex(e => e.id === id);
  const p = clips.get(k);
  if (i < 0 || !p) return;
  const e = arr[i];
  const old: SyllableTake = { id: newId(), sr: p.sr, data: p.data, meta: p.meta || null };
  arr.splice(i, 1, old);
  storeIn('extras', 'del', k + '#' + e.id);
  storeIn('extras', 'put', k + '#' + old.id, old);
  saveSyl(k, e.data, e.sr, e.meta);
}

export function deleteVersion(k: string, id: number | 'p') {
  const arr = extras.get(k) || [];
  if (id === 'p') {
    if (arr.length) {
      const e = arr.shift()!;
      storeIn('extras', 'del', k + '#' + e.id);
      saveSyl(k, e.data, e.sr, e.meta);
    } else {
      clips.delete(k);
      storeIn('clips', 'del', k);
    }
  } else {
    const i = arr.findIndex(e => e.id === id);
    if (i >= 0) {
      arr.splice(i, 1);
      storeIn('extras', 'del', k + '#' + id);
    }
  }
  if (!arr.length) extras.delete(k);
}

export function clearBank() {
  clips.clear();
  extras.clear();
  storeIn('clips', 'clear');
  storeIn('extras', 'clear');
}

export function firstU(sy: string): string {
  return /^(ch|rr)/.test(sy) ? sy.slice(0, 2) : sy[0];
}

export function lastU(sy: string): string {
  return /(ch|rr)$/.test(sy) ? sy.slice(-2) : sy[sy.length - 1];
}

export function sylMeta(word: WordInfo, j: number, src: string): SyllableMeta {
  const n = word.syl.length;
  return {
    pos: n === 1 ? 'mono' : j === 0 ? 'ini' : j === n - 1 ? 'fin' : 'med',
    ton: word.stress === j,
    prev: j > 0 ? lastU(word.syl[j - 1]) : '#',
    next: j < n - 1 ? firstU(word.syl[j + 1]) : '#',
    src
  };
}

let persistAsked = false;
function askPersist() {
  if (persistAsked) return;
  persistAsked = true;
  try {
    navigator.storage?.persist?.();
  } catch {}
}

/* ---------- Audio básico y Web AudioContext ---------- */
let audioCtx: AudioContext | null = null;
export function ac(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function resample(d: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return d;
  const len = Math.round((d.length * to) / from);
  const o = new Float32Array(len);
  const r = from / to;
  for (let i = 0; i < len; i++) {
    const x = i * r, i0 = Math.floor(x), f = x - i0;
    o[i] = (d[i0] || 0) * (1 - f) + (d[i0 + 1] || 0) * f;
  }
  return o;
}

export function frameRms(d: Float32Array, fr: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < d.length; i += fr) {
    let s = 0;
    const e = Math.min(d.length, i + fr);
    for (let j = i; j < e; j++) s += d[j] * d[j];
    out.push(Math.sqrt(s / Math.max(1, e - i)));
  }
  return out;
}

export function finish(o: Float32Array, sr: number): Float32Array {
  let peak = 0;
  for (let i = 0; i < o.length; i++) peak = Math.max(peak, Math.abs(o[i]));
  const g = peak > 0 ? 0.85 / peak : 1;
  const fi = Math.floor(sr * 0.004), fo = Math.floor(sr * 0.012);
  for (let i = 0; i < o.length; i++) {
    let k = g;
    if (i < fi) k *= i / fi;
    if (i > o.length - fo) k *= Math.max(0, (o.length - i) / fo);
    o[i] *= k;
  }
  return o;
}

export function trimClip(d: Float32Array, sr: number, rel: number): Float32Array | null {
  const fr = Math.max(1, Math.floor(sr * 0.01)), rms = frameRms(d, fr);
  const max = Math.max(...rms);
  if (max < 0.004) return null;
  const thr = Math.max(max * rel, 0.002);
  const first = rms.findIndex(r => r > thr);
  let last = rms.length - 1;
  while (last > 0 && rms[last] <= thr) last--;
  const s = Math.max(0, first * fr - Math.floor(sr * 0.01));
  const e = Math.min(d.length, (last + 1) * fr + Math.floor(sr * 0.03));
  return finish(d.slice(s, e), sr);
}

export function beep(sr: number): Float32Array {
  const n = Math.floor(sr * 0.14), o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / (sr * 0.01), (n - i) / (sr * 0.02));
    o[i] = Math.sin((2 * Math.PI * 660 * i) / sr) * 0.12 * env;
  }
  return o;
}

export function clipData(key: string): Float32Array | null {
  const c = clips.get(key);
  return c ? resample(c.data, c.sr, ac().sampleRate) : null;
}

let activeSource: AudioBufferSourceNode | null = null;

export function playData(d: Float32Array, onEnd?: () => void): number {
  const a = ac();
  if (activeSource) {
    try {
      activeSource.onended = null;
      activeSource.stop();
    } catch {}
  }
  const b = a.createBuffer(1, Math.max(1, d.length), a.sampleRate);
  b.copyToChannel(d as any, 0);
  activeSource = a.createBufferSource();
  activeSource.buffer = b;
  activeSource.connect(a.destination);
  activeSource.onended = () => {
    activeSource = null;
    onEnd && onEnd();
  };
  activeSource.start();
  return a.currentTime;
}

export function stopAllAudio() {
  if (activeSource) {
    try {
      activeSource.stop();
    } catch {}
    activeSource = null;
  }
}

export async function decodeMono(blob: Blob): Promise<{ data: Float32Array; sr: number }> {
  const buf = await ac().decodeAudioData(await blob.arrayBuffer());
  const ch = buf.numberOfChannels, n = buf.length, mono = new Float32Array(n);
  for (let c = 0; c < ch; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) mono[i] += d[i] / ch;
  }
  return { data: mono, sr: buf.sampleRate };
}

/* ---------- Grabadora ---------- */
export function recNatural(): boolean {
  try {
    return localStorage.getItem('scmv-natural') !== '0';
  } catch {
    return true;
  }
}

export function setRecNatural(v: boolean) {
  try {
    localStorage.setItem('scmv-natural', v ? '1' : '0');
  } catch {}
}

export interface RecorderCallbacks {
  maxMs: number;
  onBlob: (blob: Blob) => void;
  onStart?: (t0: number) => void;
  onLevel?: (pk: number, hot: boolean) => void;
  onFail?: () => void;
}

let currentRec: {
  mr: MediaRecorder;
  raf: number;
  hot?: number;
} | null = null;

export async function startRecording(opts: RecorderCallbacks): Promise<boolean> {
  stopActiveRecording();
  const a = ac();
  let stream: MediaStream;
  try {
    if (!navigator.mediaDevices || !window.MediaRecorder) throw new Error('nomic');
    const natural = recNatural();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: { ideal: 48000 },
        echoCancellation: !natural,
        noiseSuppression: !natural,
        autoGainControl: !natural
      }
    });
  } catch {
    opts.onFail && opts.onFail();
    return false;
  }

  let mr: MediaRecorder;
  try {
    mr = new MediaRecorder(stream, { audioBitsPerSecond: 192000 });
  } catch {
    mr = new MediaRecorder(stream);
  }

  const chunks: Blob[] = [];
  const an = a.createAnalyser();
  an.fftSize = 512;
  a.createMediaStreamSource(stream).connect(an);
  const buf = new Float32Array(an.fftSize);
  const t0 = performance.now();

  currentRec = { mr, raf: 0 };

  mr.ondataavailable = e => e.data.size && chunks.push(e.data);
  mr.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    if (currentRec) cancelAnimationFrame(currentRec.raf);
    currentRec = null;
    opts.onBlob(new Blob(chunks, { type: mr.mimeType }));
  };
  mr.onstart = () => opts.onStart && opts.onStart(performance.now());
  mr.start();

  const loop = () => {
    if (!currentRec) return;
    an.getFloatTimeDomainData(buf);
    let pk = 0;
    for (let i = 0; i < buf.length; i++) pk = Math.max(pk, Math.abs(buf[i]));
    if (pk > 0.97) currentRec.hot = performance.now();
    const isHot = !!currentRec.hot && performance.now() - currentRec.hot < 700;
    opts.onLevel && opts.onLevel(pk, isHot);
    if (performance.now() - t0 > opts.maxMs) {
      stopActiveRecording();
      return;
    }
    currentRec.raf = requestAnimationFrame(loop);
  };
  currentRec.raf = requestAnimationFrame(loop);
  return true;
}

export function stopActiveRecording() {
  if (currentRec && currentRec.mr.state !== 'inactive') {
    currentRec.mr.stop();
  }
}

export function levelReport(d: Float32Array): string {
  let pk = 0, hot = 0;
  for (let i = 0; i < d.length; i++) {
    const a = Math.abs(d[i]);
    if (a > pk) pk = a;
    if (a >= 0.985) hot++;
  }
  if (hot > Math.max(20, d.length * 0.0004))
    return ' ⚠ Ha saturado: estabas muy cerca o muy fuerte. Aléjate un palmo, porque las sílabas saturadas suenan rotas al empalmar.';
  if (pk < 0.06) return ' 🔈 Llega muy flojo: acércate un poco al micro o habla algo más fuerte.';
  return '';
}

/* ---------- Troceado automático y algoritmos acústicos ---------- */
export function segmentWords(d: Float32Array, sr: number, nWords: number): { segs: [number, number][]; ok: boolean; found: number } {
  const hop = Math.floor(sr * 0.01), rms = frameRms(d, hop);
  const sorted = [...rms].sort((a, b) => a - b);
  const noise = sorted[Math.floor(sorted.length * 0.1)] || 0, max = sorted[sorted.length - 1] || 0;
  if (max < 0.004) return { segs: [], ok: false, found: 0 };
  const thr = Math.max(noise * 3, max * 0.05, 0.002);
  const voiced = rms.map(r => r > thr);
  const runs: [number, number][] = [];
  let s = -1;
  voiced.forEach((v, i) => {
    if (v && s < 0) s = i;
    if (!v && s >= 0) {
      runs.push([s, i]);
      s = -1;
    }
  });
  if (s >= 0) runs.push([s, voiced.length]);

  const buildRun = (gap: number) => {
    const m: [number, number][] = [];
    for (const r of runs) {
      if (m.length && r[0] - m[m.length - 1][1] < gap) m[m.length - 1][1] = r[1];
      else m.push([r[0], r[1]]);
    }
    return m.filter(r => r[1] - r[0] >= 6);
  };

  const valid: [number, number][][] = [];
  let best: [number, number][] = [], bestDiff = 1e9;
  for (let g = 6; g <= 70; g += 2) {
    const m = buildRun(g), diff = Math.abs(m.length - nWords);
    if (diff === 0) valid.push(m);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = m;
    }
  }
  const chosen = valid.length ? valid[Math.floor(valid.length / 2)] : best;
  const segs: [number, number][] = chosen.map(([a, b], i) => {
    const prevEnd = i ? chosen[i - 1][1] * hop : 0;
    const nextStart = i < chosen.length - 1 ? chosen[i + 1][0] * hop : d.length;
    const st = Math.max(prevEnd, a * hop - Math.floor(sr * 0.03));
    const en = Math.min(nextStart, b * hop + Math.floor(sr * 0.05));
    return [st, en];
  });
  return { segs, ok: valid.length > 0, found: chosen.length };
}

function biquad(d: Float32Array, sr: number, type: 'bp' | 'hp', f0: number, Q: number): Float32Array {
  const w = (2 * Math.PI * f0) / sr, c = Math.cos(w), al = Math.sin(w) / (2 * Q);
  let b0: number, b1: number, b2: number;
  if (type === 'bp') {
    b0 = al; b1 = 0; b2 = -al;
  } else {
    b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2;
  }
  const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  const o = new Float32Array(d.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < d.length; i++) {
    const x = d[i], y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    o[i] = y; x2 = x1; x1 = x; y2 = y1; y1 = y;
  }
  return o;
}

const VP = { f: 700, q: 0.5, h: 3, dw: 3, th: 0.25 };
export const CUT_TYPES: Record<string, string> = { abierta: 'tras vocal', cerrada: 'tras consonante', hiato: 'entre vocales' };

export function getCutBias(): Record<string, { n: number; m: number }> {
  try {
    return JSON.parse(localStorage.getItem(userKey('scmv-cutbias')) || '{}') || {};
  } catch {
    return {};
  }
}

export function biasOf(type: string): number {
  const b = getCutBias()[type];
  return b && b.n >= 3 ? Math.max(-0.06, Math.min(0.06, b.m)) : 0;
}

export function learnCut(type: string, offset: number) {
  const cutBias = getCutBias();
  const b = cutBias[type] || { n: 0, m: 0 };
  b.n = Math.min(b.n + 1, 20);
  b.m += (offset - b.m) / b.n;
  cutBias[type] = b;
  try {
    localStorage.setItem(userKey('scmv-cutbias'), JSON.stringify(cutBias));
  } catch {}
}

export function vowelCurve(d: Float32Array, sr: number): { v: Float32Array; hop: number } {
  const hop = Math.max(1, Math.floor(sr * 0.005)), win = hop * 4;
  const band = biquad(biquad(d, sr, 'bp', VP.f, VP.q), sr, 'bp', VP.f, VP.q);
  const hi = biquad(d, sr, 'hp', 3200, 0.7);
  const n = Math.max(1, Math.ceil(d.length / hop)), v = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    const c = f * hop + hop / 2, a = Math.max(0, Math.floor(c - win / 2)), b = Math.min(d.length, Math.floor(c + win / 2));
    let eb = 0, eh = 0;
    for (let i = a; i < b; i++) {
      eb += band[i] * band[i];
      eh += hi[i] * hi[i];
    }
    const L = Math.max(1, b - a);
    eb = Math.sqrt(eb / L);
    eh = Math.sqrt(eh / L);
    v[f] = Math.sqrt((eb * eb * eb) / (eb * eb + VP.h * eh * eh + 1e-12));
  }
  const s = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    let t = 0, k = 0;
    for (let j = f - 3; j <= f + 3; j++) {
      if (j >= 0 && j < n) {
        t += v[j];
        k++;
      }
    }
    s[f] = t / k;
  }
  return { v: s, hop };
}

function consCount(syl: string, end: boolean): number {
  const u = syl.replace(/ch|rr|ll|qu/g, 'C');
  const m = end ? u.match(/[^aeiouáéíóú]*$/) : u.match(/^[^aeiouáéíóú]*/);
  return m ? m[0].length : 0;
}

export function splitSyllables(
  d: Float32Array,
  sr: number,
  sylls: string[]
): { ranges: [number, number][]; sure: boolean[]; types: string[] } {
  const k = sylls.length;
  if (k <= 1) return { ranges: [[0, d.length]], sure: [true], types: [] };
  const { v, hop } = vowelCurve(d, sr), n = v.length;
  let mx = 0;
  for (let i = 0; i < v.length; i++) mx = Math.max(mx, v[i]);
  const even = () => ({
    ranges: Array.from({ length: k }, (_, i) => [
      Math.floor((i * d.length) / k),
      Math.floor(((i + 1) * d.length) / k)
    ] as [number, number]),
    sure: Array(k).fill(false),
    types: []
  });
  if (!mx) return even();
  const M: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (v[i] >= v[i - 1] && v[i] > v[i + 1] && v[i] > mx * 0.12) M.push(i);
  }
  if (M.length < k) return even();
  const minD = Math.round((0.05 * sr) / hop);
  const dipMin = (a: number, b: number) => {
    let m = a;
    for (let j = a; j <= b; j++) if (v[j] < v[m]) m = j;
    return m;
  };

  const L = M.length, NEG = -1e9;
  const S = Array.from({ length: k }, () => new Float64Array(L).fill(NEG));
  const P = Array.from({ length: k }, () => new Int32Array(L).fill(-1));
  for (let a = 0; a < L; a++) S[0][a] = v[M[a]] / mx;

  for (let j = 1; j < k; j++) {
    for (let b = 0; b < L; b++) {
      for (let a = 0; a < b; a++) {
        if (S[j - 1][a] <= NEG / 2 || M[b] - M[a] < minD) continue;
        const m = dipMin(M[a], M[b]), dip = (Math.min(v[M[a]], v[M[b]]) - v[m]) / mx;
        const sc = S[j - 1][a] + v[M[b]] / mx + VP.dw * dip;
        if (sc > S[j][b]) {
          S[j][b] = sc;
          P[j][b] = a;
        }
      }
    }
  }

  let bi = -1, bs = NEG;
  for (let b = 0; b < L; b++) {
    if (S[k - 1][b] > bs) {
      bs = S[k - 1][b];
      bi = b;
    }
  }
  if (bi < 0) return even();
  const pk: number[] = [];
  for (let j = k - 1; j >= 0; j--) {
    pk.unshift(M[bi]);
    bi = P[j][bi];
  }

  const cuts = [0], sure = Array(k).fill(true), types: string[] = [];
  for (let j = 0; j < k - 1; j++) {
    const a = pk[j], b = pk[j + 1], m = dipMin(a, b), base = v[m];
    let off = a;
    while (off < m && v[off] > base + VP.th * (v[a] - base)) off++;
    let on = b;
    while (on > m && v[on] > base + VP.th * (v[b] - base)) on--;
    const nc = consCount(sylls[j], true), no = consCount(sylls[j + 1], false);
    let c: number;
    if (nc + no === 0) c = m;
    else c = off + ((on - off) * nc) / (nc + no);
    if (no > 0 && nc === 0) c = Math.max(a, c - 1);
    const type = nc + no === 0 ? 'hiato' : nc === 0 ? 'abierta' : 'cerrada';
    types.push(type);
    c = Math.max(a + 1, Math.min(b - 1, c + (biasOf(type) * sr) / hop));
    cuts.push(Math.round(c * hop));
    const depth = (Math.min(v[a], v[b]) - base) / Math.min(v[a], v[b]);
    if (depth < 0.2) {
      sure[j] = false;
      sure[j + 1] = false;
    }
  }
  cuts.push(d.length);
  const ranges: [number, number][] = cuts.slice(0, -1).map((c, i) => [c, cuts[i + 1]]);
  ranges.forEach(([s, e], i) => {
    const t = (e - s) / sr;
    if (t < 0.06 || t > 0.8) sure[i] = false;
  });
  return { ranges, sure, types };
}

export function segmentByTiming(
  d: Float32Array,
  sr: number,
  times: number[],
  n: number
): [number, number][] | null {
  const hop = Math.floor(sr * 0.01), rms = frameRms(d, hop);
  const sorted = [...rms].sort((a, b) => a - b);
  const noise = sorted[Math.floor(sorted.length * 0.1)] || 0, max = sorted[sorted.length - 1] || 0;
  if (max < 0.004) return null;
  const thr = Math.max(noise * 3, max * 0.05, 0.002);
  const frames: [number, number][] = [];
  let floor = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.max(floor, Math.floor((times[i] + 0.12) * 100));
    const b = Math.min(rms.length, Math.floor(((i + 1 < n ? times[i + 1] : rms.length / 100) + 0.25) * 100));
    const runs: [number, number][] = [];
    let s = -1;
    for (let f = a; f < b; f++) {
      const v = rms[f] > thr;
      if (v && s < 0) s = f;
      if (!v && s >= 0) {
        runs.push([s, f]);
        s = -1;
      }
    }
    if (s >= 0) runs.push([s, b]);
    const m: [number, number][] = [];
    for (const r of runs) {
      if (m.length && r[0] - m[m.length - 1][1] < 12) m[m.length - 1][1] = r[1];
      else m.push(r);
    }
    if (!m.length) return null;
    let best = m[0], be = -1;
    for (const r of m) {
      let e = 0;
      for (let f = r[0]; f < r[1]; f++) e += rms[f];
      if (e > be) {
        be = e;
        best = r;
      }
    }
    frames.push(best);
    floor = best[1];
  }
  return frames.map(([a, b], i) => {
    const prevEnd = i ? frames[i - 1][1] * hop : 0;
    const nextStart = i < n - 1 ? frames[i + 1][0] * hop : d.length;
    return [Math.max(prevEnd, a * hop - Math.floor(sr * 0.03)), Math.min(nextStart, b * hop + Math.floor(sr * 0.05))];
  });
}

/* ---------- DSP & Síntesis de Sílabas ---------- */
function env10(d: Float32Array, sr: number): number[] {
  return frameRms(d, Math.max(1, Math.floor(sr * 0.01)));
}

export function tightTrim(d: Float32Array, sr: number, head: number, tail: number): Float32Array {
  const fr = Math.max(1, Math.floor(sr * 0.01)), e = frameRms(d, fr), mx = Math.max(...e);
  if (!mx) return d;
  let s = 0, t = e.length - 1;
  if (head) while (s < t && e[s] < mx * head) s++;
  if (tail) while (t > s && e[t] < mx * tail) t--;
  const a = Math.max(0, s * fr - Math.floor(sr * 0.005)), b = Math.min(d.length, (t + 1) * fr + Math.floor(sr * 0.01));
  return d.slice(a, b);
}

export function squeezeGaps(d: Float32Array, sr: number, maxMs = 80, keepMs = 30): Float32Array {
  const fr = Math.max(1, Math.floor(sr * 0.01)), e = frameRms(d, fr);
  let mx = 0;
  for (const v of e) mx = Math.max(mx, v);
  if (!mx || e.length < 4) return d;
  const thr = mx * 0.06, maxF = Math.round(maxMs / 10), keep = Math.floor((sr * keepMs) / 2000);
  const cuts: [number, number][] = [];
  let s = -1;
  for (let i = 0; i <= e.length; i++) {
    const low = i < e.length && e[i] < thr;
    if (low && s < 0) s = i;
    if (!low && s >= 0) {
      if (s > 0 && i < e.length && i - s > maxF) cuts.push([s * fr + keep, Math.min(d.length, i * fr) - keep]);
      s = -1;
    }
  }
  if (!cuts.length) return d;
  const parts: Float32Array[] = [];
  let p = 0;
  for (const [a, b] of cuts) {
    parts.push(d.subarray(p, a));
    p = b;
  }
  parts.push(d.subarray(p));
  const xf = Math.floor(sr * 0.006), out = new Float32Array(d.length);
  let pos = 0;
  parts.forEach((q, k) => {
    const o = k ? Math.min(xf, q.length, pos) : 0;
    for (let j = 0; j < o; j++) {
      const t = j / o;
      out[pos - o + j] = out[pos - o + j] * (1 - t) + q[j] * t;
    }
    out.set(q.subarray(o), pos);
    pos += q.length - o;
  });
  return out.slice(0, pos);
}

export function levelMatch(d: Float32Array, sr: number): Float32Array {
  const e = env10(d, sr), mx = Math.max(...e);
  const loud = e.filter(v => v > mx * 0.3);
  const rms = loud.length ? Math.sqrt(loud.reduce((t, v) => t + v * v, 0) / loud.length) : mx;
  let g = rms ? 0.14 / rms : 1, pk = 0;
  for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
  if (pk * g > 0.95) g = 0.95 / pk;
  const o = new Float32Array(d.length);
  for (let i = 0; i < d.length; i++) o[i] = d[i] * g;
  return o;
}

export function stretch(x: Float32Array, sr: number, rate: number): Float32Array {
  const N = Math.floor(sr * 0.03), Hs = N >> 1, Ha = Hs / rate, tol = Math.floor(sr * 0.008);
  if (Math.abs(rate - 1) < 0.02 || x.length < N * 3) return x;
  const outLen = Math.ceil(x.length * rate) + N, out = new Float32Array(outLen), norm = new Float32Array(outLen);
  const w = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  let prev = 0;
  for (let k = 0; ; k++) {
    const target = Math.round(k * Ha);
    if (target + tol + N >= x.length || k * Hs + N >= outLen) break;
    let pos = target;
    if (k) {
      const nat = prev + Hs;
      let best = -Infinity;
      if (nat + N >= x.length) {
        pos = target;
      } else {
        for (let dl = -tol; dl <= tol; dl += 2) {
          const c0 = target + dl;
          if (c0 < 0) continue;
          let c = 0;
          for (let i = 0; i < N; i += 4) c += x[c0 + i] * x[nat + i];
          if (c > best) {
            best = c;
            pos = c0;
          }
        }
      }
    }
    for (let i = 0; i < N; i++) {
      out[k * Hs + i] += x[pos + i] * w[i];
      norm[k * Hs + i] += w[i];
    }
    prev = pos;
  }
  let end = outLen;
  while (end > 0 && norm[end - 1] < 1e-3) end--;
  for (let i = 0; i < end; i++) if (norm[i] > 1e-3) out[i] /= norm[i];
  return out.slice(0, end);
}

export function fades(o: Float32Array, sr: number): Float32Array {
  const fi = Math.min(o.length, Math.floor(sr * 0.004)), fo = Math.min(o.length, Math.floor(sr * 0.012));
  for (let i = 0; i < fi; i++) o[i] *= i / fi;
  for (let i = 0; i < fo; i++) o[o.length - 1 - i] *= i / fo;
  return o;
}

export function pitchOf(x: Float32Array, sr: number): number {
  const q = Math.max(1, Math.round(sr / 12000)), r = sr / q, n = Math.floor(x.length / q), d = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < q; j++) s += x[i * q + j];
    d[i] = s / q;
  }
  const W = Math.floor(r * 0.03), hop = Math.floor(r * 0.01), minL = Math.floor(r / 400), maxL = Math.ceil(r / 65);
  const en: number[] = [];
  for (let s0 = 0; s0 + W + maxL < n; s0 += hop) {
    let e = 0;
    for (let i = 0; i < W; i++) e += d[s0 + i] * d[s0 + i];
    en.push(e);
  }
  if (!en.length) return 0;
  const emax = Math.max(...en), f0s: number[] = [], df = new Float32Array(maxL + 1), cm = new Float32Array(maxL + 1);
  en.forEach((e, fi) => {
    if (e < emax * 0.2) return;
    const s0 = fi * hop;
    for (let tau = 1; tau <= maxL; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) {
        const v = d[s0 + i] - d[s0 + i + tau];
        s += v * v;
      }
      df[tau] = s;
    }
    let cum = 0;
    cm[0] = 1;
    for (let tau = 1; tau <= maxL; tau++) {
      cum += df[tau];
      cm[tau] = cum ? (df[tau] * tau) / cum : 1;
    }
    let tau = -1;
    for (let t = minL; t <= maxL; t++) {
      if (cm[t] < 0.15) {
        tau = t;
        while (tau + 1 <= maxL && cm[tau + 1] < cm[tau]) tau++;
        break;
      }
    }
    if (tau < 0) {
      let bt = minL;
      for (let t = minL; t <= maxL; t++) if (cm[t] < cm[bt]) bt = t;
      if (cm[bt] < 0.3) tau = bt;
    }
    if (tau > 0) {
      const a = cm[tau - 1], b = cm[tau], c = tau < maxL ? cm[tau + 1] : b, den = a - 2 * b + c;
      f0s.push(r / (tau + (den ? (0.5 * (a - c)) / den : 0)));
    }
  });
  if (f0s.length < 2) return 0;
  f0s.sort((a, b) => a - b);
  return f0s[Math.floor(f0s.length / 2)];
}

const f0Cache = new WeakMap<SyllableTake, number>();
export function f0Of(t: SyllableTake): number {
  if (!t) return 0;
  if (!f0Cache.has(t)) f0Cache.set(t, pitchOf(t.data, t.sr));
  return f0Cache.get(t) || 0;
}

const edgeCache = new WeakMap<SyllableTake, { s: number; e: number }>();
export function edgesOf(t: SyllableTake): { s: number; e: number } {
  if (!edgeCache.has(t)) {
    const d = t.data, n = Math.min(d.length, Math.floor(t.sr * 0.03));
    const rms = (a: number, b: number) => {
      let s = 0;
      for (let i = a; i < b; i++) s += d[i] * d[i];
      return Math.sqrt(s / Math.max(1, b - a));
    };
    const all = rms(0, d.length) || 1e-6;
    edgeCache.set(t, { s: rms(0, n) / all, e: rms(d.length - n, d.length) / all });
  }
  return edgeCache.get(t)!;
}

export function psola(x: Float32Array, sr: number, f0: number, P: number | number[], D: number): Float32Array {
  const T0 = Math.round(sr / f0);
  if (!f0 || x.length < 3 * T0) return stretch(x, sr, D);
  const marks: number[] = [];
  let m = 0;
  for (let i = 1; i < T0; i++) if (x[i] > x[m]) m = i;
  marks.push(m);
  for (;;) {
    const a = Math.floor(m + 0.8 * T0), b = Math.min(x.length - 1, Math.ceil(m + 1.2 * T0));
    if (a >= x.length - 1) break;
    let k = a;
    for (let i = a; i <= b; i++) if (x[i] > x[k]) k = i;
    marks.push(k);
    m = k;
    if (b >= x.length - 1) break;
  }
  const Pv = Array.isArray(P) ? P : [P, P, P];
  const Pat = (u: number) =>
    u < 0.5 ? Pv[0] + (Pv[1] - Pv[0]) * (u / 0.5) : Pv[1] + (Pv[2] - Pv[1]) * ((u - 0.5) / 0.5);
  const L = Math.max(1, Math.round(x.length * D)), out = new Float32Array(L + 2 * T0 + 2);
  const win = Float32Array.from({ length: 2 * T0 + 1 }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (2 * T0)));
  let k = 0;
  for (let t = marks[0] * D; t < L;) {
    const ta = t / D, p = Pat(Math.min(1, ta / x.length));
    while (k + 1 < marks.length && Math.abs(marks[k + 1] - ta) <= Math.abs(marks[k] - ta)) k++;
    const c = marks[k], o = Math.round(t);
    for (let i = -T0; i <= T0; i++) {
      const si = c + i, di = o + i;
      if (si < 0 || si >= x.length || di < 0) continue;
      out[di] += (x[si] * win[i + T0]) / p;
    }
    t += T0 / p;
  }
  return out.slice(0, L);
}

const INTERROG = new Set('qué quién quiénes cuál cuáles cuánto cuánta cuántos cuántas cómo dónde adónde cuándo'.split(' '));

export function prosodyPlan(ws: WordInfo[], A: number) {
  const out = ws.map(w => w.syl.map(() => ({ st: 0, st0: 0, st1: 0, dur: 1, gain: 1 })));
  let start = 0;
  for (let i = 0; i < ws.length; i++) {
    if (!(ws[i].punct || i === ws.length - 1)) continue;
    const end = ws[i].end || '.';
    let whIdx = -1;
    for (let w = start; w <= i; w++) {
      if (INTERROG.has(ws[w].word.toLowerCase())) {
        whIdx = w;
        break;
      }
    }
    const wh = end === '?' && whIdx >= 0;
    const items: { w: number; si: number; ton: boolean }[] = [];
    for (let w = start; w <= i; w++) {
      ws[w].syl.forEach((_, si) => items.push({ w, si, ton: ws[w].stress === si }));
    }
    const N = items.length;
    let L = -1;
    items.forEach((it, j) => {
      if (it.ton) L = j;
    });
    items.forEach((it, j) => {
      let st = N > 1 ? 1.5 - (3 * j) / (N - 1) : 0;
      if (it.ton) st += 2.5;
      if (wh && it.w === whIdx && it.ton) st += 2;
      if (L >= 0 && j >= L) {
        const k = N - 1 > L ? (j - L) / (N - 1 - L) : 1;
        if (wh) st -= 2 * k + (L === N - 1 ? 1 : 0);
        else if (end === '?') st += 1.5 + 4 * k;
        else if (end === ',') st += j === N - 1 ? 1.5 : 0;
        else st -= 3 * k + (L === N - 1 ? 1.5 : 0);
      }
      const o = out[it.w][it.si];
      o.st = Math.max(-6, Math.min(7, st * A));
      o.dur = (it.ton ? 1 + 0.12 * A : 1) * (j === N - 1 ? 1 + (end === ',' ? 0.15 : 0.3) * A : 1);
      o.gain = ws[it.w].stress < 0 ? Math.max(0.7, 1 - 0.1 * A) : it.ton ? 1 + 0.1 * A : 1;
    });
    const sts = items.map(it => out[it.w][it.si].st);
    items.forEach((it, j) => {
      const o = out[it.w][it.si];
      o.st0 = j > 0 ? (sts[j - 1] + sts[j]) / 2 : sts[j];
      o.st1 = j < N - 1 ? (sts[j] + sts[j + 1]) / 2 : sts[j] + (end === '?' && !wh ? 2 : end === ',' ? 0.5 : -1) * A;
      o.st1 = Math.max(-7, Math.min(9, o.st1));
    });
    start = i + 1;
  }
  return out;
}

export function chooseTakes(ws: WordInfo[], pp: any, base: number): (VersionInfo | null)[][] {
  const target = (c: VersionInfo, w: WordInfo, wi: number, si: number) => {
    const m = c.take.meta || {}, n = w.syl.length;
    const pos = n === 1 ? 'mono' : si === 0 ? 'ini' : si === n - 1 ? 'fin' : 'med';
    const prev = si > 0 ? lastU(w.syl[si - 1]) : '#', next = si < n - 1 ? firstU(w.syl[si + 1]) : '#';
    let cost = 0;
    cost += m.pos ? (m.pos === pos ? 0 : 1) : 0.5;
    cost += m.ton == null ? 0.4 : m.ton === (w.stress === si) ? 0 : 0.8;
    cost += m.prev == null ? 0.15 : m.prev === prev ? 0 : 0.3;
    cost += m.next == null ? 0.15 : m.next === next ? 0 : 0.3;
    if (pp && base) {
      const f = f0Of(c.take);
      if (f) cost += 0.15 * Math.abs(12 * Math.log2((base * Math.pow(2, pp[wi][si].st / 12)) / f));
    }
    if (c.fav) cost -= 0.2;
    return cost;
  };

  const join = (a: VersionInfo, b: VersionInfo) => {
    const ea = edgesOf(a.take), eb = edgesOf(b.take);
    let cost = 0.25 * Math.abs(Math.log((ea.e + 1e-3) / (eb.s + 1e-3)));
    if (!pp) {
      const fa = f0Of(a.take), fb = f0Of(b.take);
      if (fa && fb) cost += 0.1 * Math.abs(12 * Math.log2(fa / fb));
    }
    return cost;
  };

  return ws.map((w, wi) => {
    const cand = w.syl.map(k => versions(k));
    if (cand.some(c => !c.length)) return cand.map(c => c[0] || null);
    let cost = cand[0].map(c => target(c, w, wi, 0));
    const back: number[][] = [];
    for (let si = 1; si < cand.length; si++) {
      const nc: number[] = [], nb: number[] = [];
      cand[si].forEach(c => {
        let best = Infinity, bi = 0;
        cand[si - 1].forEach((p, pi) => {
          const v = cost[pi] + join(p, c);
          if (v < best) {
            best = v;
            bi = pi;
          }
        });
        nc.push(best + target(c, w, wi, si));
        nb.push(bi);
      });
      cost = nc;
      back.push(nb);
    }
    let bi = cost.indexOf(Math.min(...cost));
    const path = [bi];
    for (let si = cand.length - 1; si > 0; si--) {
      bi = back[si - 1][bi];
      path.unshift(bi);
    }
    return path.map((ci, si) => cand[si][ci]);
  });
}

export interface BuildOptions {
  polish: boolean;
  unitsel: boolean;
  prosody: boolean;
  glide: boolean;
  pAmt: number;
  xfMs: number;
  ratePct: number;
  gapMs: number;
  minVMs: number;
}

export interface PlaybackMark {
  idx: number;
  t0: number;
  t1: number;
  st?: number | number[] | null;
}

export interface BuildResult {
  data: Float32Array;
  marks: PlaybackMark[];
  missing: number;
  alt: number;
}

export function buildPhraseAudio(ws: WordInfo[], opts: BuildOptions): BuildResult {
  const a = ac(), sr = a.sampleRate;
  const { polish, unitsel, prosody: prosReq, glide, pAmt, xfMs, ratePct, gapMs, minVMs } = opts;
  const pros = polish && prosReq;
  const A = pAmt / 100;
  const gap = gapMs;
  const rate = ratePct / 100;
  const minV = minVMs / 1000;
  const xf = Math.floor((sr * xfMs) / 1000), tolJ = Math.floor(sr * 0.01);
  const pp = pros ? prosodyPlan(ws, A) : null;

  let base = 0;
  if (pros) {
    const fs = ws
      .flatMap(w => w.syl.flatMap(k => versions(k).map(v => f0Of(v.take))))
      .filter(f => f > 0)
      .sort((x, y) => x - y);
    base = fs.length ? fs[Math.floor(fs.length / 2)] : 0;
  }

  const useSel = polish && unitsel;
  const chosen = useSel ? chooseTakes(ws, pp, base) : ws.map(w => w.syl.map(k => versions(k)[0] || null));
  let alt = 0;

  const stage = ws.map((w, wi) =>
    w.syl.map((_, si) => {
      const c = chosen[wi][si];
      if (!c) return { d: beep(sr), miss: true, f0: 0 };
      if (!c.fav) alt++;
      let d = resample(c.take.data, c.take.sr, sr);
      if (!polish) return { d, miss: false, f0: 0 };
      d = levelMatch(
        squeezeGaps(
          tightTrim(d, sr, si === 0 ? 0.03 : 0.07, si === w.syl.length - 1 ? 0.05 : 0.2),
          sr
        ),
        sr
      );
      return { d, miss: false, f0: pros || minV > 0 ? f0Of(c.take) : 0 };
    })
  );

  let total = sr * 0.5;
  const plan = ws.map((w, wi) => {
    const parts = stage[wi].map((s, si) => {
      if (s.miss || !polish) return { d: s.d, miss: s.miss, st: null };
      const last = si === w.syl.length - 1;
      let D = last ? Math.min(1, (rate + 1) / 2) : rate, P: number | number[] = 1, g = 1;
      if (pros && pp) {
        const q = pp[wi][si];
        D *= q.dur;
        g = q.gain;
        if (base && s.f0) {
          const toP = (st: number) => Math.max(0.72, Math.min(1.4, (base * Math.pow(2, st / 12)) / s.f0));
          P = glide ? [toP(q.st0), toP(q.st), toP(q.st1)] : toP(q.st);
        }
      }
      if (minV > 0 && /[aeiouáéíóú]$/.test(w.syl[si])) {
        const len = s.d.length / sr, need = minV * (w.stress === si ? 1.15 : 1);
        if (len > 0.04 && len * D < need) D = Math.min(2.5, need / len);
      }
      const moved = Array.isArray(P) ? P.some(v => Math.abs(v - 1) > 0.02) : Math.abs(P - 1) > 0.02;
      const d = s.f0 && (moved || D > 1.02) ? psola(s.d, sr, s.f0, P, D) : stretch(s.d, sr, D);
      if (g !== 1) for (let i = 0; i < d.length; i++) d[i] *= g;
      const q = pros && pp ? pp[wi][si] : null;
      return {
        d: fades(d, sr),
        miss: false,
        st: q ? (glide ? [q.st0, q.st, q.st1] : [q.st, q.st, q.st]) : null
      };
    });
    parts.forEach(p => (total += p.d.length));
    total += (sr * (w.punct ? gap * 2.5 + 150 : gap)) / 1000;
    return { w, parts };
  });

  const out = new Float32Array(Math.ceil(total));
  let pos = 0, prevLen = 0, prevClip = false, missing = 0, idx = 0;
  const marks: PlaybackMark[] = [];

  plan.forEach(({ w, parts }) => {
    parts.forEach(({ d, miss, st: tone }) => {
      if (miss) missing++;
      let ov = prevClip ? Math.min(xf, Math.floor(d.length / 3), Math.floor(prevLen / 3)) : 0;
      let start = Math.max(0, pos - ov);
      if (ov > 8 && polish) {
        let best = -Infinity, bs = start;
        for (let dl = -tolJ; dl <= tolJ; dl += 2) {
          const st = pos - ov + dl;
          if (st < 0 || st + ov > pos + tolJ) continue;
          let c = 0;
          for (let i = 0; i < ov; i += 4) c += out[st + i] * d[i];
          if (c > best) {
            best = c;
            bs = st;
          }
        }
        start = bs;
        ov = Math.max(0, Math.min(ov, pos - start));
      }
      for (let j = 0; j < d.length; j++) {
        if (j < ov) {
          const t = j / ov;
          const fOut = polish ? Math.cos((t * Math.PI) / 2) : 1 - t;
          const fIn = polish ? Math.sin((t * Math.PI) / 2) : t;
          out[start + j] = out[start + j] * fOut + d[j] * fIn;
        } else {
          out[start + j] += d[j];
        }
      }
      marks.push({ idx: idx++, t0: start / sr, t1: (start + d.length) / sr, st: tone });
      pos = Math.max(pos, start + d.length);
      prevLen = d.length;
      prevClip = true;
    });
    const g = w.punct ? gap * 2.5 + 150 : gap;
    if (g > 0) {
      pos += Math.floor((sr * g) / 1000);
      prevClip = false;
    }
  });

  const data = out.slice(0, Math.min(out.length, pos + Math.floor(sr * 0.05)));
  let pk = 0;
  for (let i = 0; i < data.length; i++) pk = Math.max(pk, Math.abs(data[i]));
  if (pk > 0.98) {
    for (let i = 0; i < data.length; i++) data[i] *= 0.98 / pk;
  }
  return { data, marks, missing, alt };
}

/* ---------- Dibujo en Canvas ---------- */
export function getCssVar(name: string): string {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  } catch {
    return '';
  }
}

export interface DrawWaveOptions {
  regions?: [number, number][];
  lines?: number[];
  contour?: PlaybackMark[];
  head?: number | null;
}

export function drawWaveCanvas(cv: HTMLCanvasElement, d: Float32Array | null, opt: DrawWaveOptions = {}) {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (!w) return;
  cv.width = w * dpr;
  cv.height = h * dpr;
  const g = cv.getContext('2d');
  if (!g) return;
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, h);

  const bandCol = getCssVar('--band') || '#E3ECF0';
  const lineCol = getCssVar('--line') || '#D3D9E3';
  const waveCol = getCssVar('--wave') || '#0C7A85';
  const recCol = getCssVar('--rec') || '#D23638';
  const inkCol = getCssVar('--ink') || '#1A2130';

  if (d && d.length && opt.regions) {
    g.fillStyle = bandCol;
    opt.regions.forEach(([a, b]) => g.fillRect((a / d.length) * w, 0, ((b - a) / d.length) * w, h));
  }
  g.fillStyle = lineCol;
  g.fillRect(0, h / 2, w, 1);
  if (!d || !d.length) return;

  const step = d.length / w;
  g.fillStyle = waveCol;
  for (let x = 0; x < w; x++) {
    let mn = 0, mx = 0;
    const s = Math.floor(x * step), e = Math.min(d.length, Math.floor((x + 1) * step));
    for (let i = s; i < e; i++) {
      if (d[i] < mn) mn = d[i];
      if (d[i] > mx) mx = d[i];
    }
    g.fillRect(x, h / 2 - mx * h * 0.45, 1, Math.max(1, (mx - mn) * h * 0.45));
  }

  if (opt.lines) {
    g.fillStyle = recCol;
    opt.lines.forEach(p => g.fillRect((p / d.length) * w, 6, 1.5, h - 12));
  }

  if (opt.contour && opt.contour.some(m => m.st != null)) {
    const dur = d.length / ac().sampleRate;
    const y = (st: number) => h / 2 - (st / 8) * (h * 0.42);
    g.strokeStyle = recCol;
    g.fillStyle = recCol;
    g.lineWidth = 2;
    g.beginPath();
    let first = true, prevEnd = -1;
    opt.contour.forEach(m => {
      if (m.st == null) {
        first = true;
        return;
      }
      if (prevEnd >= 0 && m.t0 - prevEnd > 0.03) first = true;
      prevEnd = m.t1;
      const x0 = (m.t0 / dur) * w, x1 = (m.t1 / dur) * w;
      const sv = Array.isArray(m.st) ? m.st : [m.st, m.st, m.st];
      if (first) {
        g.moveTo(x0, y(sv[0]));
        first = false;
      } else {
        g.lineTo(x0, y(sv[0]));
      }
      g.lineTo((x0 + x1) / 2, y(sv[1]));
      g.lineTo(x1, y(sv[2]));
    });
    g.stroke();
  }

  if (opt.head != null) {
    g.fillStyle = inkCol;
    g.fillRect(opt.head * w, 0, 2, h);
  }
}

/* ---------- Generador de WAV y ZIP Backup ---------- */
export function wavBytes(data: Float32Array, sr: number): Uint8Array {
  const n = data.length, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
  const w = (o: number, t: string) => {
    for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i));
  };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const x = Math.max(-1, Math.min(1, data[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 32768 : x * 32767, true);
  }
  return new Uint8Array(b);
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

export function crc32(u: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function makeZip(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder(), parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let off = 0;
  const d = new Date();
  const dt = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const dd = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true);
    h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true);
    c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + size;
  }
  const cdSize = central.reduce((t, p) => t + p.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)] as any[], { type: 'application/zip' });
}

export async function readZip(buf: ArrayBuffer): Promise<{ name: string; data: Uint8Array }[]> {
  const u = new Uint8Array(buf), v = new DataView(buf);
  let e = -1;
  for (let i = u.length - 22; i >= Math.max(0, u.length - 66000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      e = i;
      break;
    }
  }
  if (e < 0) throw new Error('nozip');
  const count = v.getUint16(e + 10, true);
  let p = v.getUint32(e + 16, true);
  const out: { name: string; data: Uint8Array }[] = [];
  for (let k = 0; k < count; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const flags = v.getUint16(p + 8, true), method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true);
    const nlen = v.getUint16(p + 28, true), xlen = v.getUint16(p + 30, true), clen = v.getUint16(p + 32, true), loc = v.getUint32(p + 42, true);
    const nameBytes = u.subarray(p + 46, p + 46 + nlen);
    const name = new TextDecoder(flags & 0x0800 ? 'utf-8' : 'utf-8').decode(nameBytes);
    p += 46 + nlen + xlen + clen;
    const start = loc + 30 + v.getUint16(loc + 26, true) + v.getUint16(loc + 28, true);
    let data = u.slice(start, start + csize);
    if (method === 8) {
      if ((window as any).DecompressionStream) {
        data = new Uint8Array(
          await new Response(
            new Blob([data]).stream().pipeThrough(new (window as any).DecompressionStream('deflate-raw'))
          ).arrayBuffer()
        );
      }
    } else if (method !== 0) continue;
    if (!name.endsWith('/')) out.push({ name, data });
  }
  return out;
}

export function keyFromName(name: string): string | null {
  const base = name.split('/').pop()?.replace(/\.[^.]+$/, '').normalize('NFC').toLowerCase().trim() || '';
  return base.length <= 6 && /^(ch|rr|[bcdfgjklmnñprstyz])*[aeiou]+(ch|rr|[bcdfgjklmnñprstxyz])*$/.test(base) ? base : null;
}

export function buildBackupZip(): Blob {
  const keys = [...clips.keys()].sort((a, b) => a.localeCompare(b, 'es'));
  const files: { name: string; data: Uint8Array }[] = [];
  const fichas: Record<string, SyllableMeta> = {};
  keys.forEach(k => {
    versions(k).forEach((v, i) => {
      const name = k + (i ? '~' + (i + 1) : '') + '.wav';
      files.push({ name, data: wavBytes(v.take.data, v.take.sr) });
      if (v.take.meta) fichas[name] = v.take.meta;
    });
  });
  files.push({ name: 'fichas.json', data: new TextEncoder().encode(JSON.stringify(fichas)) });
  return makeZip(files);
}

export async function importBackupZip(blob: Blob): Promise<{ added: number; replaced: number; vers: number }> {
  let added = 0, replaced = 0, vers = 0;
  const entries = await readZip(await blob.arrayBuffer());
  let fichas: Record<string, any> = {};
  const fj = entries.find(z => z.name.split('/').pop() === 'fichas.json');
  if (fj) {
    try {
      fichas = JSON.parse(new TextDecoder().decode(fj.data));
    } catch {}
  }
  const wavs = entries
    .filter(z => z !== fj)
    .sort((a, b) => (/~\d+\./.test(a.name) ? 1 : 0) - (/~\d+\./.test(b.name) ? 1 : 0));

  for (const z of wavs) {
    const fileName = z.name.split('/').pop() || '';
    const mv = fileName.match(/^(.*?)~(\d+)(\.[^.]+)$/);
    const k = keyFromName(mv ? mv[1] + mv[3] : fileName);
    if (!k) continue;
    const meta = fichas[fileName] || null;
    const m = await decodeMono(new Blob([z.data as any]));
    if (mv && clips.has(k)) {
      if (nVers(k) < MAX_VERS) {
        addVersion(k, m.data, m.sr, meta);
        vers++;
      }
    } else {
      clips.has(k) ? replaced++ : added++;
      saveSyl(k, m.data, m.sr, meta);
    }
  }
  return { added, replaced, vers };
}

/* ---------- Generador de historias al azar ---------- */
const pickOne = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const RT = {
  quien: [
    ['mi vecino Andrés', 'o'],
    ['la abuela Carmen', 'a'],
    ['mi primo Javier', 'o'],
    ['mi amiga Lucía', 'a'],
    ['el panadero del barrio', 'o'],
    ['la profesora de música', 'a'],
    ['mi hermano pequeño', 'o'],
    ['nuestra vecina Rosa', 'a'],
    ['el cartero', 'o'],
    ['mi tía Pilar', 'a']
  ] as [string, string][],
  cuando: [
    'Ayer por la tarde',
    'El sábado pasado',
    'Esta mañana',
    'Hace unos días',
    'El domingo temprano',
    'Anoche, después de cenar',
    'El lunes, al salir del trabajo'
  ],
  plan: [
    ['fue al mercado', 'porque necesitaba fruta y verdura para toda la semana', ['compró tomates, naranjas y un melón enorme', 'se encontró con un amigo del colegio al que no veía desde hacía años', 'probó un queso curado que le encantó']],
    ['fue a la playa', 'porque hacía un día precioso', ['dio un paseo largo por la orilla', 'se bañó aunque el agua estaba bastante fría', 'vio unos barcos de pesca volviendo al puerto']],
    ['fue al pueblo de sus padres', 'porque había fiestas', ['bailó en la plaza hasta muy tarde', 'comió una paella riquísima con toda la familia', 'vio los fuegos artificiales desde el puente']],
    ['fue a la biblioteca', 'porque quería buscar un libro de cocina', ['encontró una novela antigua de aventuras', 'estuvo leyendo un buen rato junto a la ventana', 'se apuntó a un club de lectura']],
    ['salió a dar una vuelta por el parque', 'porque quería despejarse un poco', ['vio a unos niños jugando al fútbol', 'dio de comer a los patos del estanque', 'se sentó en un banco a escuchar a los pájaros']],
    ['fue al cine', 'porque estrenaban una película muy esperada', ['se rio muchísimo con los actores', 'compró palomitas y un refresco', 'se encontró a unos vecinos en la fila de atrás']],
    ['subió a la sierra', 'porque le apetecía caminar por el monte', ['vio un ciervo entre los pinos', 'bebió agua fresca de una fuente', 'hizo muchas fotos del valle desde arriba']]
  ] as [string, string, string[]][],
  giro: [
    ['De repente empezó a llover con fuerza,', 'así que se refugió en una cafetería y pidió un chocolate caliente.'],
    ['Por la tarde se levantó un viento muy frío,', 'así que decidió volver a casa antes de lo previsto.'],
    ['Al rato se dio cuenta de que había perdido las llaves,', 'pero un señor muy amable las encontró en el suelo.'],
    ['Como hacía mucho calor,', 'se compró un helado de limón y buscó una sombra.'],
    ['Cuando ya se iba, sonó el teléfono,', 'y era su madre preguntando a qué hora volvería.'],
    ['En el camino de vuelta se cruzó con un perro perdido,', 'y lo acompañó hasta que apareció su dueño.']
  ] as [string, string][],
  final: [
    'Al llegar a casa se lo contó todo a su familia',
    'Fue un día tranquilo, pero muy bonito',
    'Dice que el próximo fin de semana quiere repetir',
    'Esa noche se fue a dormir muy cansad{g}, pero feliz',
    'Todavía se acuerda de ese día con una sonrisa'
  ],
  pregunta: [
    'Luego me llamó y me preguntó: ¿te apetece venir conmigo la próxima vez?',
    'Al día siguiente me dijo: ¿por qué no vienes tú también?',
    'Y yo me pregunto: ¿cuándo me invitará a mí?',
    ''
  ]
};

export function generateRandomStory(): string {
  const [q, g] = pickOne(RT.quien), [va, porque, cosas] = pickOne(RT.plan);
  const a = cosas.slice().sort(() => Math.random() - 0.5);
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const giro = pickOne(RT.giro);
  const fr = [
    pickOne(RT.cuando) + ', ' + q + ' ' + va + ' ' + porque + '.',
    'Allí ' + a[0] + ' y después ' + a[1] + '.',
    giro[0] + ' ' + giro[1],
    pickOne(RT.final).replace('{g}', g) + '.',
    pickOne(RT.pregunta)
  ];
  return fr.filter(Boolean).map(cap).join(' ');
}

export function coverageOfText(t: string): number {
  const syl = parseText(t).flatMap(w => w.syl);
  return syl.length ? syl.filter(k => clips.has(k)).length / syl.length : 0;
}

export function getBestRandomStory(): { text: string; coverage: number } {
  const c = Array.from({ length: 30 }, generateRandomStory)
    .map(t => ({ text: t, coverage: coverageOfText(t) }))
    .sort((x, y) => y.coverage - x.coverage);
  return c[Math.floor(Math.random() * Math.min(5, c.length))] || c[0];
}

/* Base issues for review */
const issueCache = new WeakMap<SyllableTake, string[]>();
export function baseIssues(t: SyllableTake): string[] {
  if (issueCache.has(t)) return issueCache.get(t)!;
  const d = t.data, out: string[] = [], dur = d.length / t.sr;
  if (dur < 0.07) out.push('muy corta');
  else if (dur > 0.7) out.push('muy larga');
  let pk = 0;
  for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
  let flat = 0;
  const lim = pk * 0.995;
  for (let i = 1; i < d.length; i++) if (Math.abs(d[i]) >= lim && Math.abs(d[i - 1]) >= lim) flat++;
  if (pk > 0 && flat > 6) out.push('saturada');
  if (t.meta && t.meta.dud) out.push('corte dudoso');
  issueCache.set(t, out);
  return out;
}

export function issuesOfTake(t: SyllableTake, medF0: number): string[] {
  const out = baseIssues(t).slice(), f = f0Of(t);
  if (f && medF0 && Math.abs(Math.log2(f / medF0)) > 0.45) {
    out.push(f > medF0 ? 'tono muy agudo' : 'tono muy grave');
  }
  return out;
}
