/* Autenticación con Google usando Firebase Auth y gestión de tokens en memoria */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account'
});

// Cache the access token strictly in memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

type AuthListener = (user: FirebaseUser | null, token: string | null) => void;
const listeners = new Set<AuthListener>();

export function subscribeAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  listener(auth.currentUser, cachedAccessToken);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(user: FirebaseUser | null, token: string | null) {
  listeners.forEach(cb => {
    try {
      cb(user, token);
    } catch (e) {
      console.error('Error in auth listener:', e);
    }
  });
}

// Track auth state changes
onAuthStateChanged(auth, async user => {
  if (!user) {
    cachedAccessToken = null;
    notifyListeners(null, null);
  } else if (!cachedAccessToken && !isSigningIn) {
    // Session resumed without cached token in memory; user will need to reconnect to Drive
    notifyListeners(user, null);
  } else {
    notifyListeners(user, cachedAccessToken);
  }
});

export async function loginWithGoogle(): Promise<{ user: FirebaseUser; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Drive.');
    }
    cachedAccessToken = credential.accessToken;
    notifyListeners(result.user, cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error al iniciar sesión con Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

export async function logoutGoogle(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
  notifyListeners(null, null);
}

export function getCachedToken(): string | null {
  return cachedAccessToken;
}

export function getCurrentGoogleUser(): FirebaseUser | null {
  return auth.currentUser;
}
