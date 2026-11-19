import { describe, expect, it } from 'vitest';
import { ApiError } from './client';
import { loadFailure, loadFailureText } from './loadFailure';

describe('loadFailure', () => {
  it('403 es falta de permisos', () => {
    expect(loadFailure(new ApiError(403, 'Forbidden'))).toBe('forbidden');
  });

  it.each([400, 404, 500, 503])(
    'una respuesta %i es un error del servidor, no de conexión',
    (status) => {
      expect(loadFailure(new ApiError(status, 'x'))).toBe('server');
    },
  );

  it('si no hubo respuesta es un problema de red', () => {
    expect(loadFailure(new TypeError('Failed to fetch'))).toBe('network');
  });
});

describe('loadFailureText', () => {
  it('solo pide revisar la conexión cuando no hubo respuesta', () => {
    expect(loadFailureText('network', 'las alertas')).toContain(
      'Revisá la conexión',
    );
    expect(loadFailureText('server', 'las alertas')).not.toContain('conexión');
    expect(loadFailureText('server', 'las alertas')).toContain(
      'avisá al administrador',
    );
  });
});
