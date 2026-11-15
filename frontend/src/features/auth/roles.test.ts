import { describe, expect, it } from 'vitest';
import { ROLES } from './authStore';
import { canAccess, homePathFor, sectionsFor } from './roles';

describe('permisos de sección por rol', () => {
  it.each([
    ['admin', true, true],
    ['supervisor', true, true],
    ['mantenimiento', true, false],
    ['hse', false, false],
    ['lectura', false, false],
  ] as const)('%s: alertas=%s, turnos=%s', (role, alerts, shifts) => {
    expect(canAccess(role, 'alerts')).toBe(alerts);
    expect(canAccess(role, 'shifts')).toBe(shifts);
  });

  it('cubre los cinco roles de RF-02', () => {
    expect(ROLES).toHaveLength(5);
  });

  it('el rol mantenimiento no ve Turnos (HU-07 del informe PP2)', () => {
    expect(sectionsFor('mantenimiento').map((s) => s.path)).toEqual([
      '/alertas',
    ]);
  });

  it('la página de inicio es la primera sección habilitada, o ninguna', () => {
    expect(homePathFor('supervisor')).toBe('/alertas');
    expect(homePathFor('hse')).toBeNull();
  });
});
