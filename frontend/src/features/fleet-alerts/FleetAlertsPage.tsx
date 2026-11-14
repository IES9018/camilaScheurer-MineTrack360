import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';

/** Pantalla P1 (RF-05). Se implementa en el PR siguiente. */
export function FleetAlertsPage() {
  useDocumentTitle('Alertas de mantenimiento');
  return (
    <section>
      <h1 className="text-2xl font-bold">Alertas de mantenimiento</h1>
      <p className="mt-2 text-ink-muted">
        Pantalla P1 (RF-05): se construye en el próximo PR, sobre{' '}
        <code>GET /api/v1/maintenance/alerts</code>.
      </p>
    </section>
  );
}
