import { useAuthStore } from '../../features/auth/authStore';

const API_BASE = '/api/v1';

/** Error de una respuesta HTTP no exitosa del backend. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** El backend responde { message: string | string[] } (NestJS). */
async function errorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('. ');
  } catch {
    // La respuesta no era JSON
  }
  return response.statusText || `Error ${response.status}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Llamada a la API con el token de la sesión. Si el backend responde 401 con
 * una sesión abierta (token vencido o inválido), la sesión se cierra para que
 * la interfaz vuelva al login.
 */
export async function apiFetch<T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  const token = useAuthStore.getState().session?.token;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401 && token) {
      useAuthStore.getState().clearSession();
    }
    throw new ApiError(response.status, await errorMessage(response));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
