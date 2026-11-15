import type { AlertStatus, FleetAlert } from './alertsApi';

export type StatusFilter = 'ALL' | AlertStatus;
export type SortKey = 'criticality' | 'vehicle';

interface StatusMeta {
  label: string;
  /** Ícono decorativo: el estado nunca se comunica solo con color (RF-12). */
  icon: string;
  /** Clases de color con contraste AA verificado (styles.css). */
  badgeClass: string;
}

export const STATUS_META: Record<AlertStatus, StatusMeta> = {
  CRITICAL: {
    label: 'Crítico',
    icon: '⛔',
    badgeClass: 'bg-status-crit-bg text-status-crit-on-bg',
  },
  WARNING: {
    label: 'Advertencia',
    icon: '⚠',
    badgeClass: 'bg-status-warn-bg text-status-warn',
  },
  NO_THRESHOLD: {
    label: 'Sin umbral',
    icon: 'ℹ',
    badgeClass: 'bg-page text-ink',
  },
  OK: {
    label: 'OK',
    icon: '✔',
    badgeClass: 'bg-status-ok-bg text-status-ok',
  },
};

/** Mismo orden que el backend: lo más urgente primero. */
const RANK: Record<AlertStatus, number> = {
  CRITICAL: 0,
  WARNING: 1,
  NO_THRESHOLD: 2,
  OK: 3,
};

export const FILTER_OPTIONS: ReadonlyArray<{
  value: StatusFilter;
  label: string;
}> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'CRITICAL', label: 'Crítico' },
  { value: 'WARNING', label: 'Advertencia' },
  { value: 'NO_THRESHOLD', label: 'Sin umbral' },
  { value: 'OK', label: 'OK' },
];

export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: 'criticality', label: 'Criticidad' },
  { value: 'vehicle', label: 'Vehículo' },
];

export function filterAlerts(
  alerts: readonly FleetAlert[],
  filter: StatusFilter,
): FleetAlert[] {
  return filter === 'ALL'
    ? [...alerts]
    : alerts.filter((a) => a.status === filter);
}

const byCode = (a: FleetAlert, b: FleetAlert) =>
  a.internalCode.localeCompare(b.internalCode, 'es', { numeric: true });

export function sortAlerts(
  alerts: readonly FleetAlert[],
  key: SortKey,
): FleetAlert[] {
  const copy = [...alerts];
  if (key === 'vehicle') return copy.sort(byCode);
  return copy.sort(
    (a, b) =>
      RANK[a.status] - RANK[b.status] ||
      (b.ratio ?? -1) - (a.ratio ?? -1) ||
      byCode(a, b),
  );
}

export type Summary = Record<AlertStatus, number>;

export function summarize(alerts: readonly FleetAlert[]): Summary {
  const summary: Summary = { CRITICAL: 0, WARNING: 0, NO_THRESHOLD: 0, OK: 0 };
  for (const alert of alerts) summary[alert.status] += 1;
  return summary;
}

/** Horas con hasta un decimal y coma decimal (es-AR). */
export const formatHours = (hours: number): string =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(hours);

/**
 * Porcentaje del intervalo consumido, redondeado hacia abajo: así una
 * ADVERTENCIA (< 100 %) nunca se muestra como "100 %".
 */
export const formatPercent = (ratio: number | null): string =>
  ratio === null ? '—' : `${Math.floor(ratio * 100 + 1e-9)} %`;

/** Mensaje en lenguaje del usuario para el panel de detalle (H-P1-05). */
export function detailMessage(alert: FleetAlert): string {
  const { status, intervalHours, hoursSinceService } = alert;
  if (status === 'NO_THRESHOLD' || intervalHours === null) {
    return 'Este tipo de vehículo todavía no tiene un intervalo de mantenimiento configurado.';
  }
  const diff = hoursSinceService - intervalHours;
  if (status === 'CRITICAL') {
    return diff > 0
      ? `Superó el intervalo por ${formatHours(diff)} h. Programar service.`
      : 'Alcanzó el intervalo. Programar service.';
  }
  const remaining = formatHours(intervalHours - hoursSinceService);
  return status === 'WARNING'
    ? `Faltan ${remaining} h para el intervalo. Planificar service.`
    : `Faltan ${remaining} h para el próximo service.`;
}
