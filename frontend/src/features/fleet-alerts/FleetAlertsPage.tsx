import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ApiError } from '../../shared/api/client';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import { fetchFleetAlerts, type FleetAlert } from './alertsApi';
import {
  FILTER_OPTIONS,
  SORT_OPTIONS,
  STATUS_META,
  detailMessage,
  filterAlerts,
  formatHours,
  formatPercent,
  sortAlerts,
  summarize,
  type SortKey,
  type StatusFilter,
} from './alertsModel';

type Failure = 'forbidden' | 'network';

const timeOf = (date: Date) =>
  date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

function StatusBadge({ status }: { status: FleetAlert['status'] }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold ${meta.badgeClass}`}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}

/** Pantalla P1 (RF-05, HU-02): estado de la flota y alertas de mantenimiento. */
export function FleetAlertsPage() {
  useDocumentTitle('Alertas de mantenimiento');

  const [alerts, setAlerts] = useState<FleetAlert[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [sort, setSort] = useState<SortKey>('criticality');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [attempt, setAttempt] = useState(0);

  const detailRef = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const filterId = useId();
  const sortId = useId();

  // Cada cambio de `attempt` (primera carga, Recargar, Reintentar) vuelve a pedir
  // los datos. `loading` parte en true y reload() lo reactiva antes de pedir.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchFleetAlerts();
        if (cancelled) return;
        setAlerts(data);
        setUpdatedAt(new Date());
        setFailure(null);
      } catch (error) {
        if (cancelled) return;
        setFailure(
          error instanceof ApiError && error.status === 403
            ? 'forbidden'
            : 'network',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  const visible = useMemo(
    () => sortAlerts(filterAlerts(alerts ?? [], filter), sort),
    [alerts, filter, sort],
  );
  const summary = useMemo(() => summarize(alerts ?? []), [alerts]);
  const selected = alerts?.find((a) => a.vehicleId === selectedId) ?? null;

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    opener.current?.focus();
  }, []);

  // Esc cierra el detalle y devuelve el foco a la fila que lo abrió
  useEffect(() => {
    if (selectedId === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDetail();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedId, closeDetail]);

  // Al abrir el detalle, el foco pasa al panel para que el lector de pantalla lo anuncie
  useEffect(() => {
    if (selected) detailRef.current?.focus();
  }, [selected]);

  const heading = (
    <h1 className="text-2xl font-bold">Alertas de mantenimiento</h1>
  );

  if (failure === 'forbidden') {
    return (
      <section>
        {heading}
        <p
          role="alert"
          className="mt-4 rounded border border-line bg-surface p-4"
        >
          No tenés permiso para ver esta sección.
        </p>
      </section>
    );
  }

  if (alerts === null) {
    return (
      <section>
        {heading}
        {failure === 'network' ? (
          <div
            role="alert"
            className="mt-4 rounded border border-line bg-surface p-4"
          >
            <p>No se pudieron cargar las alertas. Revisá la conexión.</p>
            <button
              type="button"
              onClick={() => reload()}
              className="mt-3 rounded bg-brand px-3 py-1 font-medium text-white hover:bg-brand-strong"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <p role="status" className="mt-4 text-ink-muted">
            Cargando alertas…
          </p>
        )}
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {heading}
        <p role="status" className="text-ink-muted">
          {loading
            ? 'Actualizando…'
            : `Actualizado: ${updatedAt ? timeOf(updatedAt) : ''}`}{' '}
          <button
            type="button"
            onClick={() => reload()}
            disabled={loading}
            className="ml-2 rounded border border-line bg-surface px-3 py-1 font-medium text-ink hover:bg-page disabled:opacity-60"
          >
            Recargar
          </button>
        </p>
      </div>

      {failure === 'network' && (
        <div
          role="alert"
          className="mt-4 rounded border border-status-crit bg-status-crit-bg p-3 text-status-crit-on-bg"
        >
          No se pudo actualizar. Se muestran datos de las{' '}
          {updatedAt ? timeOf(updatedAt) : '—'}.{' '}
          <button
            type="button"
            onClick={() => reload()}
            className="font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {alerts.length === 0 ? (
        <p className="mt-6 rounded border border-line bg-surface p-4">
          No hay vehículos cargados.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor={filterId} className="block font-medium">
                Filtro
              </label>
              <select
                id={filterId}
                value={filter}
                onChange={(e) => setFilter(e.target.value as StatusFilter)}
                className="rounded border border-line bg-surface px-2 py-1"
              >
                {FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={sortId} className="block font-medium">
                Ordenar por
              </label>
              <select
                id={sortId}
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded border border-line bg-surface px-2 py-1"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="ml-auto" aria-label="Resumen">
              Resumen: {summary.CRITICAL} crítico · {summary.WARNING}{' '}
              advertencia · {summary.NO_THRESHOLD} sin umbral · {summary.OK} OK
            </p>
          </div>

          <div className="mt-4 overflow-x-auto rounded border border-line bg-surface">
            <table className="w-full text-left">
              <caption className="sr-only">
                Estado de mantenimiento de cada vehículo de la flota
              </caption>
              <thead className="border-b border-line">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    Estado
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Vehículo
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Tipo
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Horas desde service
                  </th>
                  <th scope="col" className="px-3 py-2">
                    % del intervalo
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4">
                      Ningún vehículo coincide con el filtro.
                    </td>
                  </tr>
                ) : (
                  visible.map((a) => (
                    <tr
                      key={a.vehicleId}
                      className={
                        a.vehicleId === selectedId
                          ? 'border-b border-line bg-page'
                          : 'border-b border-line'
                      }
                    >
                      <td className="px-3 py-2">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          aria-expanded={a.vehicleId === selectedId}
                          onClick={(e) => {
                            opener.current = e.currentTarget;
                            setSelectedId(a.vehicleId);
                          }}
                          className="font-semibold text-brand underline"
                        >
                          {a.internalCode}
                        </button>
                      </td>
                      <td className="px-3 py-2">{a.vehicleTypeName}</td>
                      <td className="px-3 py-2">
                        {formatHours(a.hoursSinceService)}
                        {a.intervalHours !== null &&
                          ` / ${formatHours(a.intervalHours)}`}{' '}
                        h
                      </td>
                      <td className="px-3 py-2">{formatPercent(a.ratio)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-ink-muted">
            Seleccioná un vehículo (Enter o clic) para ver el detalle. Esc lo
            cierra.
          </p>
        </>
      )}

      {selected && (
        <section
          ref={detailRef}
          tabIndex={-1}
          aria-labelledby="detalle-titulo"
          className="mt-4 rounded border border-line bg-surface p-4"
        >
          <h2 id="detalle-titulo" className="text-lg font-bold">
            {selected.internalCode} · {selected.vehicleTypeName}
          </h2>
          <p className="mt-2">
            Estado: <StatusBadge status={selected.status} />
          </p>
          <p className="mt-2">
            Horas desde el último service:{' '}
            {formatHours(selected.hoursSinceService)} h
            {selected.intervalHours !== null &&
              ` (intervalo: ${formatHours(selected.intervalHours)} h)`}
          </p>
          <p className="mt-2">{detailMessage(selected)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled
              aria-describedby="rf06-nota"
              className="rounded border border-line px-3 py-1 opacity-60"
            >
              Registrar intervención
            </button>
            <span id="rf06-nota" className="text-ink-muted">
              Disponible cuando exista el registro de intervenciones (RF-06).
            </span>
            <button
              type="button"
              onClick={closeDetail}
              className="ml-auto rounded border border-line px-3 py-1 font-medium hover:bg-page"
            >
              Cerrar (Esc)
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
