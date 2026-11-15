import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, type Session } from '../../features/auth/authStore';
import { ApiError, apiFetch } from './client';

const session: Session = {
  token: 'abc123',
  user: { id: 1, fullName: 'Ana', email: 'ana@x.com', role: 'admin' },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('apiFetch', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    useAuthStore.setState({ session: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('llama a /api/v1 y devuelve el JSON', async () => {
    fetchMock.mockResolvedValue(json([{ id: 1 }]));

    await expect(apiFetch('/vehicles')).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/vehicles',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('envía el token de la sesión en Authorization', async () => {
    useAuthStore.setState({ session });
    fetchMock.mockResolvedValue(json({}));

    await apiFetch('/auth/me');

    const init = fetchMock.mock.calls[0]?.[1];
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer abc123',
    );
  });

  it('no envía Authorization sin sesión', async () => {
    fetchMock.mockResolvedValue(json({}));

    await apiFetch('/auth/login', {
      method: 'POST',
      body: { email: 'a', password: 'b' },
    });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(
      (init?.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe(
      'application/json',
    );
    expect(init?.body).toBe(JSON.stringify({ email: 'a', password: 'b' }));
  });

  it('lanza ApiError con el mensaje del backend', async () => {
    fetchMock.mockResolvedValue(
      json({ message: 'Credenciales inválidas', statusCode: 401 }, 401),
    );

    await expect(apiFetch('/auth/login')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Credenciales inválidas',
    });
  });

  it('une los mensajes de validación cuando el backend devuelve una lista', async () => {
    fetchMock.mockResolvedValue(
      json({ message: ['date inválida', 'shift inválido'] }, 400),
    );

    await expect(apiFetch('/shifts')).rejects.toThrow(
      'date inválida. shift inválido',
    );
  });

  it('usa el texto de estado si la respuesta de error no es JSON', async () => {
    fetchMock.mockResolvedValue(
      new Response('Bad gateway', { status: 502, statusText: 'Bad Gateway' }),
    );

    await expect(apiFetch('/x')).rejects.toMatchObject({
      status: 502,
      message: 'Bad Gateway',
    });
  });

  it('cierra la sesión si el backend responde 401 con una sesión abierta', async () => {
    useAuthStore.setState({ session });
    fetchMock.mockResolvedValue(json({ message: 'Token vencido' }, 401));

    await expect(apiFetch('/vehicles')).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('no toca la sesión ante un 403', async () => {
    useAuthStore.setState({ session });
    fetchMock.mockResolvedValue(
      json({ message: 'Permisos insuficientes' }, 403),
    );

    await expect(apiFetch('/vehicles')).rejects.toMatchObject({ status: 403 });
    expect(useAuthStore.getState().session).toEqual(session);
  });

  it('devuelve undefined ante un 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiFetch('/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
