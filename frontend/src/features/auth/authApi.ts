import { apiFetch } from '../../shared/api/client';
import type { Session, SessionUser } from './authStore';

interface LoginResponse {
  accessToken: string;
  user: SessionUser;
}

/** POST /api/v1/auth/login (RF-01). */
export async function login(email: string, password: string): Promise<Session> {
  const response = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return { token: response.accessToken, user: response.user };
}
