/* Mi Voz · Gestión de usuarios y almacenamiento de preferencias
   Mantiene compatibilidad exacta con users.js para no alterar los datos existentes */

export interface User {
  id: string;
  name: string;
}

const MAIN = 'main';

const LS = {
  get(k: string, d: string): string {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : v;
    } catch {
      return d;
    }
  },
  set(k: string, v: string): void {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
  del(k: string): void {
    try {
      localStorage.removeItem(k);
    } catch {}
  }
};

export function listUsers(): User[] {
  let l: User[] | null = null;
  try {
    l = JSON.parse(LS.get('mivoz-users', 'null'));
  } catch {}
  if (!Array.isArray(l) || !l.some(u => u && u.id === MAIN)) {
    l = [{ id: MAIN, name: 'Rober' }].concat(
      Array.isArray(l) ? l.filter(u => u && u.id && u.id !== MAIN) : []
    );
  }
  return l;
}

export function saveUsersList(l: User[]): void {
  LS.set('mivoz-users', JSON.stringify(l));
}

export function currentUid(): string {
  const id = LS.get('mivoz-user', MAIN);
  return listUsers().some(u => u.id === id) ? id : MAIN;
}

export function currentUser(): User {
  return listUsers().find(u => u.id === currentUid()) || { id: MAIN, name: 'Rober' };
}

export function dbName(base: string, id?: string): string {
  const targetId = id || currentUid();
  return targetId === MAIN ? base : base + '--' + targetId;
}

export function userKey(k: string, id?: string): string {
  const targetId = id || currentUid();
  return targetId === MAIN ? k : k + '@' + targetId;
}

export function switchUser(id: string): void {
  LS.set('mivoz-user', id);
}

export function addUser(name: string): string {
  const l = listUsers();
  const id = 'u' + Date.now().toString(36);
  l.push({ id, name: cleanUserName(name) });
  saveUsersList(l);
  return id;
}

export function renameUser(id: string, name: string): void {
  const l = listUsers();
  const u = l.find(x => x.id === id);
  if (u) {
    u.name = cleanUserName(name);
    saveUsersList(l);
  }
}

export function removeUser(id: string): void {
  if (id === MAIN) return;
  ['silabas-con-mi-voz', 'ingles-en-voz-alta'].forEach(b => {
    try {
      indexedDB.deleteDatabase(dbName(b, id));
    } catch {}
  });
  try {
    Object.keys(localStorage)
      .filter(k => k.endsWith('@' + id))
      .forEach(k => LS.del(k));
  } catch {}
  saveUsersList(listUsers().filter(u => u.id !== id));
}

export function cleanUserName(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, 24);
}

export const DAY = 864e5;

export function markChanged(page: 'silabas' | 'ingles'): void {
  LS.set(userKey('mvbk-chg-' + page), String(Date.now()));
}

export function markBackedUp(page: 'silabas' | 'ingles'): void {
  LS.set(userKey('mvbk-last-' + page), String(Date.now()));
  LS.del(userKey('mvbk-snooze-' + page));
}

export function snoozeBackup(page: 'silabas' | 'ingles'): void {
  LS.set(userKey('mvbk-snooze-' + page), String(Date.now() + DAY));
}

export interface BackupStatus {
  shouldNag: boolean;
  message: string;
  days: number;
}

export function checkBackupReminder(
  page: 'silabas' | 'ingles',
  count: number,
  what: string,
  minCount = 1,
  days = 7
): BackupStatus {
  if (count < minCount) return { shouldNag: false, message: '', days: 0 };
  const now = Date.now();
  const last = +(LS.get(userKey('mvbk-last-' + page), '0') || 0);
  const chg = +(LS.get(userKey('mvbk-chg-' + page), '0') || 0);
  const snooze = +(LS.get(userKey('mvbk-snooze-' + page), '0') || 0);

  if (snooze > now) return { shouldNag: false, message: '', days: 0 };
  if (last && chg <= last) return { shouldNag: false, message: '', days: 0 };
  const d = Math.floor((now - last) / DAY);
  if (last && d < days) return { shouldNag: false, message: '', days: 0 };

  const uName = currentUser().name;
  const msg = last
    ? `Hace ${d} días que no guardas copia de ${count} ${what} de ${uName}. Si se borran los datos del navegador, se perderían.`
    : `Todavía no has hecho ninguna copia de ${count} ${what} de ${uName}. Si se borran los datos del navegador, se perderían.`;

  return { shouldNag: true, message: msg, days: d };
}
