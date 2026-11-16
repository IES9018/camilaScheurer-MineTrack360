import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionExpiryNotice } from './SessionExpiryNotice';
import { useAuthStore, type Session } from './authStore';
import { WARNING_BEFORE_MS, tokenExpiry } from './sessionExpiry';

const b64url = (value: object) =>
  btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const tokenWithExp = (expSeconds: number) =>
  `${b64url({ alg: 'HS256' })}.${b64url({ exp: expSeconds })}.firma`;

const sessionFor = (token: string): Session => ({
  token,
  user: { id: 1, fullName: 'Ana', email: 'ana@x.com', role: 'supervisor' },
});

describe('tokenExpiry', () => {
  it('lee exp en milisegundos', () => {
    expect(tokenExpiry(tokenWithExp(1000))).toBe(1_000_000);
  });
  it('devuelve null con tokens ilegibles', () => {
    expect(tokenExpiry('abc')).toBeNull();
    expect(tokenExpiry('a.%%%.c')).toBeNull();
    expect(tokenExpiry(`a.${b64url({ sub: 1 })}.c`)).toBeNull();
  });
});

describe('SessionExpiryNotice', () => {
  const t0 = new Date('2026-11-16T10:00:00Z').getTime();
  beforeEach(() => {
    vi.useFakeTimers({ now: t0 });
    useAuthStore.setState({ session: null });
  });
  afterEach(() => vi.useRealTimers());

  const open = (ms: number) =>
    useAuthStore.setState({
      session: sessionFor(tokenWithExp(Math.floor((t0 + ms) / 1000))),
    });

  it('avisa 5 minutos antes y cierra la sesión al vencer', () => {
    open(60 * 60 * 1000);
    render(<SessionExpiryNotice />);
    expect(screen.queryByRole('alert')).toBeNull();

    act(() => vi.advanceTimersByTime(60 * 60 * 1000 - WARNING_BEFORE_MS));
    expect(screen.getByRole('alert')).toHaveTextContent(/vence en pocos/i);
    expect(useAuthStore.getState().session).not.toBeNull();

    act(() => vi.advanceTimersByTime(WARNING_BEFORE_MS));
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('el botón cierra la sesión para volver al login', () => {
    open(WARNING_BEFORE_MS - 1000);
    render(<SessionExpiryNotice />);
    act(() => vi.advanceTimersByTime(0));
    fireEvent.click(
      screen.getByRole('button', { name: /volver a iniciar sesión/i }),
    );
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('un token ya vencido cierra la sesión de inmediato', () => {
    open(-1000);
    render(<SessionExpiryNotice />);
    act(() => vi.advanceTimersByTime(0));
    expect(useAuthStore.getState().session).toBeNull();
  });
});
