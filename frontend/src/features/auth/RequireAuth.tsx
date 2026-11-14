import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import { useAuthStore, type Role } from './authStore';

/** Deja pasar solo con sesión abierta; si no, manda al login y vuelve después. */
export function RequireAuth() {
  const session = useAuthStore((state) => state.session);
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

function Forbidden() {
  useDocumentTitle('Sin permiso');
  return (
    <section>
      <h1 className="text-2xl font-bold">Sin permiso</h1>
      <p role="alert" className="mt-2">
        No tenés permiso para ver esta sección.
      </p>
    </section>
  );
}

/** Muestra la sección solo a los roles indicados (la API valida igual). */
export function RequireRole({ allowed }: { allowed: readonly Role[] }) {
  const role = useAuthStore((state) => state.session?.user.role);
  if (!role || !allowed.includes(role)) return <Forbidden />;
  return <Outlet />;
}
