import { create } from 'zustand';

export const ROLES = [
  'admin',
  'supervisor',
  'mantenimiento',
  'hse',
  'lectura',
] as const;
/** Mismos roles que el backend (RF-02). */
export type Role = (typeof ROLES)[number];

export interface SessionUser {
  id: number;
  fullName: string;
  email: string;
  role: Role;
}

export interface Session {
  token: string;
  user: SessionUser;
}

export const SESSION_STORAGE_KEY = 'minetrack360.session';

const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);

function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) return false;
  const { token, user } = value as { token?: unknown; user?: unknown };
  if (typeof token !== 'string' || token === '') return false;
  if (typeof user !== 'object' || user === null) return false;
  const u = user as Record<string, unknown>;
  return (
    typeof u.id === 'number' &&
    typeof u.fullName === 'string' &&
    typeof u.email === 'string' &&
    isRole(u.role)
  );
}

/**
 * Lee la sesión guardada en sessionStorage. Devuelve null si no hay nada, si
 * el contenido está dañado o si el navegador no permite usar el almacenamiento.
 */
export function readStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: Session | null): void {
  try {
    if (session) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {
    // Sin almacenamiento disponible: la sesión vive solo en memoria
  }
}

interface AuthState {
  session: Session | null;
  setSession: (session: Session) => void;
  clearSession: () => void;
}

/**
 * Estado de sesión (Zustand). El token se guarda en sessionStorage: sobrevive
 * a recargar la pestaña y se borra al cerrarla. El rol que se muestra acá solo
 * sirve para armar la interfaz; la autorización real la hace el backend.
 */
export const useAuthStore = create<AuthState>((set) => ({
  session: readStoredSession(),
  setSession: (session) => {
    writeStoredSession(session);
    set({ session });
  },
  clearSession: () => {
    writeStoredSession(null);
    set({ session: null });
  },
}));
