import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';

/** Pantalla P2 (RF-07). Se implementa en un PR posterior. */
export function ShiftsPage() {
  useDocumentTitle('Turnos');
  return (
    <section>
      <h1 className="text-2xl font-bold">Asignación de turno</h1>
      <p className="mt-2 text-ink-muted">
        Pantalla P2 (RF-07): se construye después de P1, sobre{' '}
        <code>/api/v1/shifts</code>.
      </p>
    </section>
  );
}
