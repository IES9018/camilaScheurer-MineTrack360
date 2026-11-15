import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../features/auth/LoginPage';
import { RequireAuth, RequireRole } from '../features/auth/RequireAuth';
import { useAuthStore } from '../features/auth/authStore';
import { homePathFor, rolesFor } from '../features/auth/roles';
import { FleetAlertsPage } from '../features/fleet-alerts/FleetAlertsPage';
import { ShiftsPage } from '../features/shifts/ShiftsPage';
import { useDocumentTitle } from '../shared/hooks/useDocumentTitle';
import { AppLayout } from '../shared/ui/AppLayout';

/** Entrada: lleva a la primera sección habilitada para el rol. */
function Home() {
  useDocumentTitle('Inicio');
  const role = useAuthStore((state) => state.session?.user.role);
  const path = role ? homePathFor(role) : null;
  if (path) return <Navigate to={path} replace />;
  return (
    <section>
      <h1 className="text-2xl font-bold">Sin secciones disponibles</h1>
      <p className="mt-2">Tu rol todavía no tiene pantallas habilitadas.</p>
    </section>
  );
}

function NotFound() {
  useDocumentTitle('No encontrada');
  return (
    <section>
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <p className="mt-2">La dirección no existe en MineTrack360.</p>
    </section>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route element={<RequireRole allowed={rolesFor('alerts')} />}>
            <Route path="/alertas" element={<FleetAlertsPage />} />
          </Route>
          <Route
            element={
              <RequireRole
                allowed={rolesFor('shifts')}
                deniedMessage="Permisos insuficientes para asignar turnos."
              />
            }
          >
            <Route path="/turnos" element={<ShiftsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
