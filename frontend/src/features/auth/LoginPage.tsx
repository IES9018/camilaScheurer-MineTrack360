import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../../shared/api/client';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import { login } from './authApi';
import { useAuthStore } from './authStore';

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401)
      return 'El email o la contraseña no son correctos.';
    if (error.status === 429) {
      return 'Hiciste demasiados intentos. Esperá un minuto y volvé a probar.';
    }
    if (error.status === 400)
      return 'Revisá que el email y la contraseña estén completos.';
    return 'El servidor respondió con un error. Probá de nuevo en unos minutos.';
  }
  return 'No se pudo conectar con el servidor. Revisá tu conexión.';
}

/** Inicio de sesión (RF-01). */
export function LoginPage() {
  useDocumentTitle('Iniciar sesión');
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const destination = (location.state as { from?: string } | null)?.from ?? '/';
  if (session) return <Navigate to={destination} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setSession(await login(email.trim(), password));
      void navigate(destination, { replace: true });
    } catch (caught) {
      setError(messageFor(caught));
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6">
        <h1 className="text-2xl font-bold">MineTrack360</h1>
        <p className="mt-1 text-ink-muted">Iniciá sesión para continuar.</p>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-6 space-y-4"
        >
          <div>
            <label htmlFor="email" className="block font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded border border-line px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="block font-medium">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded border border-line px-3 py-2"
            />
          </div>

          {error && (
            <p role="alert" className="font-medium text-status-crit">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-brand px-4 py-2 font-semibold text-surface hover:bg-brand-strong disabled:opacity-70"
          >
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  );
}
