import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { ApiError } from '../../shared/api/client';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import {
  cancelAssignment,
  createAssignment,
  fetchAvailability,
  type ShiftAvailability,
  type ShiftType,
} from './shiftsApi';
import {
  SHIFT_OPTIONS,
  operatorStatusText,
  shiftLabel,
  shortDate,
  successText,
  todayIso,
  vehicleBlockText,
} from './shiftsModel';

type LoadResult =
  | { key: string; data: ShiftAvailability }
  | { key: string; failure: 'forbidden' | 'network' };

interface Feedback {
  kind: 'success' | 'error' | 'info';
  text: string;
  /** Asignación que se puede deshacer (solo tras un éxito). */
  undoId?: number;
  /** El error permite reintentar la misma confirmación. */
  retry?: boolean;
}

const PERMISSION_TEXT = 'Permisos insuficientes para asignar turnos.';

/** Pantalla P2 (RF-07, HU-04): asignación de un vehículo y un operador a un turno. */
export function ShiftsPage() {
  useDocumentTitle('Turnos');

  const [date, setDate] = useState(() => todayIso());
  const [shift, setShift] = useState<ShiftType>('MORNING');
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [operatorId, setOperatorId] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LoadResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const key = `${date}|${shift}|${attempt}`;

  // Pide la disponibilidad cada vez que cambia la fecha, el turno o `attempt`.
  // "Cargando" se deduce de que el resultado guardado es de otra clave.
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    void fetchAvailability(date, shift).then(
      (data) => {
        if (!cancelled) setResult({ key, data });
      },
      (error: unknown) => {
        if (cancelled) return;
        setResult({
          key,
          failure:
            error instanceof ApiError && error.status === 403
              ? 'forbidden'
              : 'network',
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [date, shift, key]);

  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  const loading = date !== '' && result?.key !== key;
  const data =
    result && 'data' in result && result.key === key ? result.data : null;
  const failure =
    result && 'failure' in result && result.key === key ? result.failure : null;

  // Una elección que dejó de estar disponible (cambió el turno o la lista) no cuenta
  const vehicle = useMemo(
    () =>
      data?.vehicles.find((v) => v.vehicleId === vehicleId && v.available) ??
      null,
    [data, vehicleId],
  );
  const operator = useMemo(
    () =>
      data?.operators.find((o) => o.operatorId === operatorId && o.available) ??
      null,
    [data, operatorId],
  );

  const clearSelection = useCallback(() => {
    setVehicleId(null);
    setOperatorId(null);
  }, []);

  // Esc cancela la selección en curso (misma acción que el botón Cancelar)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clearSelection();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [clearSelection]);

  async function confirm() {
    if (!vehicle || !operator || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const created = await createAssignment({
        vehicleId: vehicle.vehicleId,
        operatorId: operator.operatorId,
        date,
        shift,
      });
      setFeedback({
        kind: 'success',
        text: successText({
          vehicle: vehicle.internalCode,
          operator: operator.fullName,
          shift,
          date,
        }),
        undoId: created.id,
      });
      clearSelection();
      refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setFeedback({ kind: 'error', text: PERMISSION_TEXT });
      } else if (error instanceof ApiError && error.status === 409) {
        // La lista estaba vieja: se muestra el motivo del servidor y se refresca
        setFeedback({
          kind: 'error',
          text: `${error.message}. Elegí otra opción.`,
        });
        refresh();
      } else if (error instanceof ApiError && error.status !== 401) {
        setFeedback({ kind: 'error', text: error.message });
      } else if (!(error instanceof ApiError)) {
        setFeedback({
          kind: 'error',
          text: 'No se pudo guardar. No se perdió lo que elegiste.',
          retry: true,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function undo(id: number) {
    setFeedback(null);
    try {
      await cancelAssignment(id);
      setFeedback({ kind: 'info', text: 'Asignación deshecha.' });
    } catch (error) {
      setFeedback({
        kind: 'error',
        text:
          error instanceof ApiError && error.status === 409
            ? 'Esa asignación ya estaba cancelada.'
            : 'No se pudo deshacer. Probá de nuevo.',
      });
    }
    refresh();
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void confirm();
  };

  const heading = <h1 className="text-2xl font-bold">Asignación de turno</h1>;

  if (failure === 'forbidden') {
    return (
      <section>
        {heading}
        <p
          role="alert"
          className="mt-4 rounded border border-line bg-surface p-4"
        >
          {PERMISSION_TEXT}
        </p>
      </section>
    );
  }

  return (
    <section>
      {heading}
      <form onSubmit={onSubmit} className="mt-4">
        <div className="flex flex-wrap items-end gap-6 max-md:flex-col max-md:items-stretch max-md:gap-3">
          <div>
            <label htmlFor="fecha" className="block font-medium">
              Fecha
            </label>
            <input
              id="fecha"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded border border-line bg-surface px-2 py-1 max-md:min-h-12 max-md:w-full"
            />
          </div>
          <fieldset>
            <legend className="font-medium">Turno</legend>
            <div className="flex gap-4 max-md:flex-col max-md:gap-0">
              {SHIFT_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className="flex items-center gap-1 max-md:min-h-12 max-md:gap-3"
                >
                  <input
                    type="radio"
                    name="turno"
                    className="max-md:size-5"
                    value={o.value}
                    checked={shift === o.value}
                    onChange={() => setShift(o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {date === '' && (
          <p role="alert" className="mt-4 text-status-crit">
            Elegí una fecha para ver la disponibilidad.
          </p>
        )}
        {loading && (
          <p role="status" className="mt-4 text-ink-muted">
            Cargando disponibilidad…
          </p>
        )}
        {failure === 'network' && (
          <div
            role="alert"
            className="mt-4 rounded border border-line bg-surface p-4"
          >
            <p>No se pudo cargar la disponibilidad. Revisá la conexión.</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-3 rounded bg-brand px-3 py-1 font-medium text-white hover:bg-brand-strong max-md:min-h-12"
            >
              Reintentar
            </button>
          </div>
        )}

        {data && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <fieldset className="rounded border border-line bg-surface p-4">
              <legend className="px-1 font-bold">1. Vehículo</legend>
              {data.vehicles.length === 0 ? (
                <p>No hay vehículos cargados.</p>
              ) : (
                <ul className="space-y-2">
                  {data.vehicles.map((v) => {
                    const blocked = vehicleBlockText(v);
                    return (
                      <li key={v.vehicleId}>
                        <label className="flex items-start gap-2 max-md:min-h-12 max-md:gap-3 max-md:py-2">
                          <input
                            type="radio"
                            name="vehiculo"
                            className="mt-1 max-md:size-5"
                            disabled={!v.available}
                            checked={vehicle?.vehicleId === v.vehicleId}
                            onChange={() => setVehicleId(v.vehicleId)}
                          />
                          <span>
                            <span className="font-semibold">
                              {v.internalCode}
                            </span>{' '}
                            <span className="text-ink-muted">
                              {v.vehicleTypeName}
                            </span>
                            <br />
                            {blocked ? (
                              <span className="font-medium text-status-crit-on-bg">
                                <span aria-hidden="true">⛔ </span>
                                {blocked}
                              </span>
                            ) : (
                              <span className="font-medium text-status-ok">
                                <span aria-hidden="true">✔ </span>
                                Disponible
                              </span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>

            <fieldset className="rounded border border-line bg-surface p-4">
              <legend className="px-1 font-bold">2. Operador</legend>
              {data.operators.length === 0 ? (
                <p>No hay operadores activos cargados.</p>
              ) : (
                <ul className="space-y-2">
                  {data.operators.map((o) => (
                    <li key={o.operatorId}>
                      <label className="flex items-start gap-2 max-md:min-h-12 max-md:gap-3 max-md:py-2">
                        <input
                          type="radio"
                          name="operador"
                          className="mt-1 max-md:size-5"
                          disabled={!o.available}
                          checked={operator?.operatorId === o.operatorId}
                          onChange={() => setOperatorId(o.operatorId)}
                        />
                        <span>
                          <span className="font-semibold">{o.fullName}</span>{' '}
                          <span className="text-ink-muted">
                            ({o.employeeCode})
                          </span>
                          <br />
                          <span
                            className={
                              o.available
                                ? 'font-medium text-status-ok'
                                : 'font-medium text-status-crit-on-bg'
                            }
                          >
                            <span aria-hidden="true">
                              {o.available ? '✔ ' : '⛔ '}
                            </span>
                            {operatorStatusText(o)}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          </div>
        )}

        {data && (
          <div className="mt-4 rounded border border-line bg-surface p-4 max-md:sticky max-md:bottom-0 max-md:z-10 max-md:rounded-none">
            <p aria-live="polite">
              <span className="font-bold">Resumen: </span>
              {vehicle && operator
                ? `${vehicle.internalCode} · ${operator.fullName} · ${shortDate(date)} ${shiftLabel(shift)}`
                : 'elegí un vehículo y un operador.'}
            </p>
            <div className="mt-3 flex justify-end gap-3 max-md:[&>button]:flex-1">
              <button
                type="button"
                onClick={clearSelection}
                className="rounded border border-line px-3 py-1 font-medium hover:bg-page max-md:min-h-12"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!vehicle || !operator || saving}
                className="rounded bg-brand px-3 py-1 font-medium text-white hover:bg-brand-strong disabled:opacity-60 max-md:min-h-12"
              >
                {saving ? 'Guardando…' : 'Confirmar asignación'}
              </button>
            </div>
          </div>
        )}
      </form>

      {feedback && (
        <div
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={
            feedback.kind === 'error'
              ? 'mt-4 rounded border border-status-crit bg-status-crit-bg p-3 text-status-crit-on-bg'
              : 'mt-4 rounded border border-line bg-surface p-3'
          }
        >
          {feedback.text}{' '}
          {feedback.undoId !== undefined && (
            <button
              type="button"
              onClick={() => void undo(feedback.undoId as number)}
              className="font-semibold underline max-md:inline-flex max-md:min-h-12 max-md:items-center max-md:px-2"
            >
              Deshacer
            </button>
          )}
          {feedback.retry && (
            <button
              type="button"
              onClick={() => void confirm()}
              className="font-semibold underline max-md:inline-flex max-md:min-h-12 max-md:items-center max-md:px-2"
            >
              Reintentar
            </button>
          )}
        </div>
      )}
    </section>
  );
}
