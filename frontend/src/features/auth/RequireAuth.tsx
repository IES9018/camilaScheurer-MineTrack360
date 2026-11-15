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

const DEFAULT_DENIED = 'No tenés permiso para ver esta sección.';

function Forbidden({ message }: { message: string }) {
  useDocumentTitle('Sin permiso');
  return (
    <section>
      <h1 className="text-2xl font-bold">Sin permiso</h1>
      <p role="alert" className="mt-2">
        {message}
      </p>
    </section>
  );
}

/**
 * Muestra la sección solo a los roles indicados (la API valida igual).
 * `deniedMessage` permite el texto propio de cada pantalla (wireframes P1 y P2).
 */
export function RequireRole({
  allowed,
  deniedMessage = DEFAULT_DENIED,
}: {
  allowed: readonly Role[];
  deniedMessage?: string;
}) {
  const role = useAuthStore((state) => state.session?.user.role);
  if (!role || !allowed.includes(role))
    return <Forbidden message={deniedMessage} />;
  return <Outlet />;
}
