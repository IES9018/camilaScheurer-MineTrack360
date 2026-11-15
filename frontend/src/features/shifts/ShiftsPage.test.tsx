import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../auth/authStore';
import type { ShiftAvailability } from './shiftsApi';
import { ShiftsPage } from './ShiftsPage';

const AVAILABILITY: ShiftAvailability = {
  date: '2026-11-13',
  shift: 'MORNING',
  vehicles: [
    {
      vehicleId: 21,
      internalCode: 'CAM-021',
      vehicleTypeName: 'Camión',
      available: true,
      reason: null,
      assignedTo: null,
    },
    {
      vehicleId: 14,
      internalCode: 'CAM-014',
      vehicleTypeName: 'Camión',
      available: false,
      reason: 'CRITICAL_ALERT',
      assignedTo: null,
    },
    {
      vehicleId: 9,
      internalCode: 'CAM-009',
      vehicleTypeName: 'Camión',
      available: false,
      reason: 'ALREADY_ASSIGNED',
      assignedTo: 'Luis Gómez',
    },
  ],
  operators: [
    {
      operatorId: 5,
      fullName: 'Juan Pérez',
      employeeCode: 'OP-0001',
      available: true,
      reason: null,
      assignedTo: null,
    },
    {
      operatorId: 6,
      fullName: 'Luis Gómez',
      employeeCode: 'OP-0002',
      available: false,
      reason: 'ALREADY_ASSIGNED',
      assignedTo: 'CAM-009',
    },
  ],
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const CREATED = {
  id: 77,
  vehicleId: 21,
  operatorId: 5,
  date: '2026-11-13',
  shift: 'MORNING',
  status: 'ASSIGNED',
};

describe('ShiftsPage', () => {
  const fetchMock = vi.fn<typeof fetch>();

  const calls = (method: string) =>
    fetchMock.mock.calls.filter(
      ([, init]) => (init?.method ?? 'GET') === method,
    );

  async function pickVehicleAndOperator() {
    await userEvent.click(
      await screen.findByRole('radio', { name: /CAM-021/ }),
    );
    await userEvent.click(screen.getByRole('radio', { name: /Juan Pérez/ }));
  }

  beforeEach(() => {
    useAuthStore.setState({
      session: {
        token: 't',
        user: { id: 1, fullName: 'Ana', email: 'a@x.com', role: 'supervisor' },
      },
    });
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation((input, init) => {
      const url = String(input);
      if (init?.method === 'POST') return Promise.resolve(json(201, CREATED));
      if (init?.method === 'PATCH')
        return Promise.resolve(json(200, { ...CREATED, status: 'CANCELLED' }));
      if (url.includes('/shifts/availability'))
        return Promise.resolve(json(200, AVAILABILITY));
      return Promise.reject(new Error(`URL inesperada: ${url}`));
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('muestra "Cargando" y luego vehículos y operadores con su estado y motivo', async () => {
    render(<ShiftsPage />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Cargando disponibilidad…',
    );
    expect(await screen.findByRole('radio', { name: /CAM-021/ })).toBeEnabled();
    expect(screen.getByRole('radio', { name: /CAM-014/ })).toBeDisabled();
    expect(
      screen.getByText(/alerta crítica de mantenimiento/),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^CAM-009/ })).toBeDisabled();
    expect(screen.getByText(/ya asignado a Luis Gómez/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Luis Gómez/ })).toBeDisabled();
    expect(screen.getByText(/ya asignado a CAM-009/)).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(
      /^\/api\/v1\/shifts\/availability\?date=\d{4}-\d{2}-\d{2}&shift=MORNING$/,
    );
  });

  it('Confirmar queda deshabilitado hasta elegir vehículo y operador', async () => {
    render(<ShiftsPage />);
    const confirm = await screen.findByRole('button', {
      name: 'Confirmar asignación',
    });
    expect(confirm).toBeDisabled();

    await userEvent.click(screen.getByRole('radio', { name: /CAM-021/ }));
    expect(confirm).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: /Juan Pérez/ }));

    expect(confirm).toBeEnabled();
    expect(screen.getByText(/CAM-021 · Juan Pérez/)).toBeInTheDocument();
  });

  it('al cambiar el turno vuelve a pedir la disponibilidad de ese turno', async () => {
    render(<ShiftsPage />);
    await screen.findByRole('radio', { name: /CAM-021/ });

    await userEvent.click(screen.getByRole('radio', { name: 'Tarde' }));

    await screen.findByRole('radio', { name: /CAM-021/ });
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain(
      'shift=AFTERNOON',
    );
  });

  it('confirma: envía el cuerpo correcto, avisa el éxito y limpia la selección', async () => {
    render(<ShiftsPage />);
    await pickVehicleAndOperator();

    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar asignación' }),
    );

    expect(
      await screen.findByText(
        /Asignado: CAM-021 a Juan Pérez, turno Mañana del/,
      ),
    ).toBeInTheDocument();
    const [url, init] = calls('POST')[0];
    expect(url).toBe('/api/v1/shifts/assignments');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      vehicleId: 21,
      operatorId: 5,
      shift: 'MORNING',
    });
    expect(
      screen.getByRole('button', { name: 'Confirmar asignación' }),
    ).toBeDisabled();
  });

  it('Enter dentro del formulario también confirma', async () => {
    render(<ShiftsPage />);
    await pickVehicleAndOperator();

    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText(/Asignado: CAM-021/)).toBeInTheDocument();
  });

  it('Deshacer cancela la asignación creada', async () => {
    render(<ShiftsPage />);
    await pickVehicleAndOperator();
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar asignación' }),
    );

    await userEvent.click(
      await screen.findByRole('button', { name: 'Deshacer' }),
    );

    expect(await screen.findByText('Asignación deshecha.')).toBeInTheDocument();
    expect(calls('PATCH')[0][0]).toBe('/api/v1/shifts/assignments/77/cancel');
  });

  it('Esc y Cancelar descartan la selección', async () => {
    render(<ShiftsPage />);
    await pickVehicleAndOperator();

    await userEvent.keyboard('{Escape}');

    expect(screen.getByRole('radio', { name: /CAM-021/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Juan Pérez/ })).not.toBeChecked();
  });

  it('con 409 (lista vieja) muestra el motivo del servidor y refresca la lista', async () => {
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === 'POST')
        return Promise.resolve(
          json(409, {
            message: 'El vehículo CAM-021 ya está asignado a ese turno',
          }),
        );
      return Promise.resolve(json(200, AVAILABILITY));
    });
    render(<ShiftsPage />);
    await pickVehicleAndOperator();
    const before = fetchMock.mock.calls.length;

    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar asignación' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El vehículo CAM-021 ya está asignado a ese turno. Elegí otra opción.',
    );
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls.length).toBeGreaterThan(before + 1),
    );
  });

  it('con 403 al guardar avisa "Permisos insuficientes"', async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        init?.method === 'POST'
          ? json(403, { message: 'Forbidden' })
          : json(200, AVAILABILITY),
      ),
    );
    render(<ShiftsPage />);
    await pickVehicleAndOperator();

    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar asignación' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Permisos insuficientes para asignar turnos.',
    );
  });

  it('si falla la red al guardar conserva lo elegido y permite reintentar', async () => {
    let first = true;
    fetchMock.mockImplementation((_input, init) => {
      if (init?.method === 'POST') {
        if (first) {
          first = false;
          return Promise.reject(new TypeError('Failed to fetch'));
        }
        return Promise.resolve(json(201, CREATED));
      }
      return Promise.resolve(json(200, AVAILABILITY));
    });
    render(<ShiftsPage />);
    await pickVehicleAndOperator();

    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar asignación' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo guardar. No se perdió lo que elegiste.',
    );
    expect(screen.getByRole('radio', { name: /CAM-021/ })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(/Asignado: CAM-021/)).toBeInTheDocument();
  });

  it('con 403 al cargar la disponibilidad muestra "Permisos insuficientes" y no el formulario', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(json(403, { message: 'Forbidden' })),
    );
    render(<ShiftsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Permisos insuficientes para asignar turnos.',
    );
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('si falla la carga ofrece Reintentar y se recupera', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    render(<ShiftsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cargar la disponibilidad',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('radio', { name: /CAM-021/ }),
    ).toBeInTheDocument();
  });

  it('sin vehículos ni operadores lo dice en lugar de mostrar listas vacías', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        json(200, { ...AVAILABILITY, vehicles: [], operators: [] }),
      ),
    );
    render(<ShiftsPage />);

    expect(
      await screen.findByText('No hay vehículos cargados.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('No hay operadores activos cargados.'),
    ).toBeInTheDocument();
  });
});
