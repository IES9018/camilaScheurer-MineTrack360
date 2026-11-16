import { useEffect, useState } from 'react';
import { useAuthStore } from './authStore';
import { WARNING_BEFORE_MS, tokenExpiry } from './sessionExpiry';

/**
 * Avisa antes de que venza el token y cierra la sesión al vencer (ADR-006).
 * No hay refresh token: la forma de seguir es iniciar sesión de nuevo.
 */
export function SessionExpiryNotice() {
  const token = useAuthStore((state) => state.session?.token);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [warnedToken, setWarnedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const expiry = tokenExpiry(token);
    if (expiry === null) return;

    const untilExpiry = Math.max(0, expiry - Date.now());
    const untilWarning = Math.max(0, untilExpiry - WARNING_BEFORE_MS);
    const warnTimer = setTimeout(() => setWarnedToken(token), untilWarning);
    const expireTimer = setTimeout(clearSession, untilExpiry);
    return () => {
      clearTimeout(warnTimer);
      clearTimeout(expireTimer);
    };
  }, [token, clearSession]);

  if (!token || warnedToken !== token) return null;

  return (
    <div
      role="alert"
      className="border-b border-line bg-surface px-4 py-2 text-center"
    >
      <span>Tu sesión vence en pocos minutos. </span>
      <button
        type="button"
        onClick={clearSession}
        className="rounded border border-line px-3 py-1 font-medium hover:bg-page"
      >
        Volver a iniciar sesión
      </button>
    </div>
  );
}
