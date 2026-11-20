import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/authStore';
import type { FleetAlert } from './alertsApi';
import { FleetAlertsPage } from './FleetAlertsPage';

const alert = (over: Partial<FleetAlert>): FleetAlert => ({
  vehicleId: 1,
  internalCode: 'CAM-014',
  vehicleTypeName: 'Camión',
  vehicleStatus: 'ACTIVE',
  totalEngineHours: 1005,
  lastServiceHours: 500,
  hoursSinceService: 505,
  intervalHours: 500,
  ratio: 1.01,
  status: 'CRITICAL',
  ...over,
});

const DATA: FleetAlert[] = [
  alert({
    vehicleId: 3,
    internalCode: 'CAM-021',
    status: 'OK',
    ratio: 0.24,
    hoursSinceService: 120,
  }),
  alert({ vehicleId: 1 }),
  alert({
    vehicleId: 2,
    internalCode: 'CAM-007',
    status: 'WARNING',
    ratio: 0.92,
    hoursSinceService: 460,
  }),
];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('FleetAlertsPage', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    useAuthStore.setState({
      session: {
        token: 't',
        user: { id: 1, fullName: 'Ana', email: 'a@x.com', role: 'supervisor' },
      },
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('muestra "Cargando" y luego la tabla ordenada por criticidad con ícono y texto', async () => {
    fetchMock.mockResolvedValue(json(200, DATA));
    render(<FleetAlertsPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando alertas…');
    const rows = await screen.findAllByRole('row');

    // fila 0 = encabezado
    expect(within(rows[1]).getByText('Crítico')).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent('CAM-014');
    expect(rows[1]).toHaveTextContent('505 / 500 h');
    expect(rows[1]).toHaveTextContent('101 %');
    expect(rows[2]).toHaveTextContent('Advertencia');
    expect(rows[3]).toHaveTextContent('OK');
    expect(screen.getByLabelText('Resumen')).toHaveTextContent(
      '1 crítico · 1 advertencia · 0 sin umbral · 1 OK',
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/maintenance/alerts');
  });

  it('el filtro deja solo los vehículos del estado elegido', async () => {
    fetchMock.mockResolvedValue(json(200, DATA));
    render(<FleetAlertsPage />);
    await screen.findAllByRole('row');

    await userEvent.selectOptions(
      screen.getByLabelText('Filtro'),
      'Advertencia',
    );

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('CAM-007');
  });

  it('si el filtro no coincide con nada lo dice', async () => {
    fetchMock.mockResolvedValue(json(200, DATA));
    render(<FleetAlertsPage />);
    await screen.findAllByRole('row');

    await userEvent.selectOptions(
      screen.getByLabelText('Filtro'),
      'Sin umbral',
    );

    expect(
      screen.getByText('Ningún vehículo coincide con el filtro.'),
    ).toBeInTheDocument();
  });

  it('sin vehículos muestra "No hay vehículos cargados."', async () => {
    fetchMock.mockResolvedValue(json(200, []));
    render(<FleetAlertsPage />);

    expect(
      await screen.findByText('No hay vehículos cargados.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('con 403 muestra "No tenés permiso" y no la tabla', async () => {
    fetchMock.mockResolvedValue(json(403, { message: 'Forbidden' }));
    render(<FleetAlertsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tenés permiso para ver esta sección.',
    );
  });

  it('si falla la primera carga ofrece Reintentar y se recupera', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    fetchMock.mockResolvedValue(json(200, DATA));
    render(<FleetAlertsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor para cargar las alertas. Revisá la conexión.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('con un error 500 culpa al servidor y no a la conexión', async () => {
    fetchMock.mockResolvedValue(json(500, { message: 'Internal error' }));
    render(<FleetAlertsPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('El servidor no pudo cargar las alertas');
    expect(alert).not.toHaveTextContent('conexión');
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('si falla una recarga conserva los datos anteriores y avisa', async () => {
    fetchMock.mockResolvedValueOnce(json(200, DATA));
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<FleetAlertsPage />);
    await screen.findByRole('table');

    await userEvent.click(screen.getByRole('button', { name: 'Recargar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo actualizar. Se muestran datos de las',
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('con 401 la sesión se cierra (token vencido)', async () => {
    fetchMock.mockResolvedValue(json(401, { message: 'Unauthorized' }));
    render(<FleetAlertsPage />);

    await screen.findByRole('alert');

    expect(useAuthStore.getState().session).toBeNull();
  });

  it('Enter en un vehículo abre el detalle y Esc lo cierra devolviendo el foco', async () => {
    fetchMock.mockResolvedValue(json(200, DATA));
    render(<FleetAlertsPage />);
    const button = await screen.findByRole('button', { name: 'CAM-014' });

    button.focus();
    await userEvent.keyboard('{Enter}');

    const detail = screen.getByRole('region', { name: /CAM-014 · Camión/ });
    expect(detail).toHaveTextContent(
      'Superó el intervalo por 5 h. Programar service.',
    );
    expect(detail).toHaveFocus();
    expect(
      screen.getByRole('button', { name: 'Registrar intervención' }),
    ).toBeDisabled();

    await userEvent.keyboard('{Escape}');

    expect(
      screen.queryByRole('region', { name: /CAM-014/ }),
    ).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });
});
