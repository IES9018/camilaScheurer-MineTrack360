import type { Role } from './authStore';

export type Section = 'alerts' | 'shifts';

/**
 * Qué roles ven cada sección. Es un espejo de los permisos del backend
 * (`@Roles(...)` en maintenance y shifts) pensado solo para ocultar enlaces:
 * si difiere, el que manda es el backend, que responde 403.
 */
const ACCESS: Record<Section, readonly Role[]> = {
  alerts: ['admin', 'supervisor', 'mantenimiento'],
  shifts: ['admin', 'supervisor'],
};

export interface SectionLink {
  id: Section;
  path: string;
  label: string;
}

export const SECTIONS: readonly SectionLink[] = [
  { id: 'alerts', path: '/alertas', label: 'Alertas de mantenimiento' },
  { id: 'shifts', path: '/turnos', label: 'Turnos' },
];

/** Roles habilitados para una sección. */
export const rolesFor = (section: Section): readonly Role[] => ACCESS[section];

export const canAccess = (role: Role, section: Section): boolean =>
  ACCESS[section].includes(role);

export const sectionsFor = (role: Role): SectionLink[] =>
  SECTIONS.filter((section) => canAccess(role, section.id));

/** Primera sección habilitada para el rol, o null si no tiene ninguna. */
export const homePathFor = (role: Role): string | null =>
  sectionsFor(role)[0]?.path ?? null;
