import { beforeEach, describe, expect, it } from 'vitest';
import {
  SESSION_STORAGE_KEY,
  readStoredSession,
  useAuthStore,
  type Session,
} from './authStore';

const session: Session = {
  token: 'token-de-prueba',
  user: {
    id: 1,
    fullName: 'Ana Gómez',
    email: 'ana@minetrack360.com',
    role: 'supervisor',
  },
};

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null });
  });

  it('setSession guarda la sesión en memoria y en sessionStorage', () => {
    useAuthStore.getState().setSession(session);

    expect(useAuthStore.getState().session).toEqual(session);
    expect(readStoredSession()).toEqual(session);
  });

  it('clearSession borra la sesión de memoria y de sessionStorage', () => {
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().session).toBeNull();
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  describe('readStoredSession', () => {
    it('devuelve null si no hay nada guardado', () => {
      expect(readStoredSession()).toBeNull();
    });

    it.each([
      ['JSON roto', '{no es json'],
      ['sin token', JSON.stringify({ user: session.user })],
      ['token vacío', JSON.stringify({ ...session, token: '' })],
      [
        'rol desconocido',
        JSON.stringify({ ...session, user: { ...session.user, role: 'root' } }),
      ],
      ['usuario incompleto', JSON.stringify({ token: 'x', user: { id: 1 } })],
      ['un texto suelto', JSON.stringify('hola')],
    ])('ignora contenido inválido: %s', (_name, raw) => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, raw);

      expect(readStoredSession()).toBeNull();
    });

    it('devuelve la sesión si el contenido es válido', () => {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));

      expect(readStoredSession()).toEqual(session);
    });
  });
});
