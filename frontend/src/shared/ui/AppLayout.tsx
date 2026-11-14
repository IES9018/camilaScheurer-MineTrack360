import { NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/authStore';
import { sectionsFor } from '../../features/auth/roles';

const ROLE_LABEL = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  mantenimiento: 'Mantenimiento',
  hse: 'HSE',
  lectura: 'Lectura',
} as const;

/** Estructura común: enlace para saltar al contenido, navegación por rol y salida. */
export function AppLayout() {
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);
  if (!session) return null;
  const { user } = session;

  return (
    <div className="min-h-screen">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-surface focus:px-3 focus:py-2"
      >
        Ir al contenido
      </a>

      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="text-lg font-bold">MineTrack360</span>

          <nav aria-label="Principal" className="flex flex-1 gap-4">
            {sectionsFor(user.role).map((section) => (
              <NavLink
                key={section.id}
                to={section.path}
                className={({ isActive }) =>
                  isActive
                    ? 'font-bold underline underline-offset-4'
                    : 'hover:underline'
                }
              >
                {section.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-ink-muted">
              {user.fullName} · {ROLE_LABEL[user.role]}
            </span>
            <button
              type="button"
              onClick={clearSession}
              className="rounded border border-line px-3 py-1 font-medium hover:bg-page"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto max-w-6xl px-4 py-6"
      >
        <Outlet />
      </main>
    </div>
  );
}
