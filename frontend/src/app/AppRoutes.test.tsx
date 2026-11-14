import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAuthStore,
  type Role,
  type Session,
} from '../features/auth/authStore';
import { AppRoutes } from './AppRoutes';

const sessionFor = (role: Role): Session => ({
  token: 'token',
  user: { id: 1, fullName: 'Ana Gómez', email: 'ana@x.com', role },
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

const loginResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('rutas y permisos', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null });
  });

  it('sin sesión, una ruta protegida lleva al login', () => {
    renderAt('/alertas');

    expect(
      screen.getByRole('heading', { name: 'MineTrack360' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('el supervisor entra a Alertas desde la raíz y ve las dos secciones', () => {
    useAuthStore.setState({ session: sessionFor('supervisor') });

    renderAt('/');

    expect(
      screen.getByRole('heading', { name: 'Alertas de mantenimiento' }),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(nav).toHaveTextContent('Alertas de mantenimiento');
    expect(nav).toHaveTextContent('Turnos');
  });

  it('mantenimiento no ve el enlace a Turnos y recibe "sin permiso" si entra por la URL', () => {
    useAuthStore.setState({ session: sessionFor('mantenimiento') });

    renderAt('/turnos');

    expect(
      screen.getByRole('navigation', { name: 'Principal' }),
    ).not.toHaveTextContent('Turnos');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No tenés permiso para ver esta sección.',
    );
  });

  it('un rol sin secciones (hse) ve un aviso en vez de una pantalla vacía', () => {
    useAuthStore.setState({ session: sessionFor('hse') });

    renderAt('/');

    expect(
      screen.getByRole('heading', { name: 'Sin secciones disponibles' }),
    ).toBeInTheDocument();
  });

  it('una dirección inexistente muestra "Página no encontrada"', () => {
    useAuthStore.setState({ session: sessionFor('admin') });

    renderAt('/no-existe');

    expect(
      screen.getByRole('heading', { name: 'Página no encontrada' }),
    ).toBeInTheDocument();
  });

  it('el enlace de la sección actual queda marcado con aria-current', () => {
    useAuthStore.setState({ session: sessionFor('admin') });

    renderAt('/turnos');

    expect(screen.getByRole('link', { name: 'Turnos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('ofrece un enlace para saltar al contenido', () => {
    useAuthStore.setState({ session: sessionFor('admin') });

    renderAt('/alertas');

    expect(
      screen.getByRole('link', { name: 'Ir al contenido' }),
    ).toHaveAttribute('href', '#contenido');
  });

  it('Cerrar sesión borra la sesión y vuelve al login', async () => {
    useAuthStore.setState({ session: sessionFor('admin') });
    renderAt('/alertas');

    await userEvent.click(
      screen.getByRole('button', { name: 'Cerrar sesión' }),
    );

    expect(useAuthStore.getState().session).toBeNull();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  describe('pantalla de login', () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
      vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      fetchMock.mockReset();
    });

    async function submit(email = 'ana@x.com', password = 'ClaveSegura1') {
      await userEvent.type(screen.getByLabelText('Email'), email);
      await userEvent.type(screen.getByLabelText('Contraseña'), password);
      await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    }

    it('con credenciales válidas guarda la sesión y entra a la primera sección', async () => {
      fetchMock.mockResolvedValue(
        loginResponse(200, {
          accessToken: 'jwt',
          user: sessionFor('supervisor').user,
        }),
      );
      renderAt('/login');

      await submit();

      expect(
        await screen.findByRole('heading', {
          name: 'Alertas de mantenimiento',
        }),
      ).toBeInTheDocument();
      expect(useAuthStore.getState().session?.token).toBe('jwt');
      const init = fetchMock.mock.calls[0]?.[1];
      expect(init?.body).toBe(
        JSON.stringify({ email: 'ana@x.com', password: 'ClaveSegura1' }),
      );
    });

    it.each([
      [401, /no son correctos/],
      [429, /demasiados intentos/],
      [400, /completos/],
      [500, /error/],
    ])(
      'con respuesta %d muestra un aviso comprensible',
      async (status, expected) => {
        fetchMock.mockResolvedValue(loginResponse(status, { message: 'x' }));
        renderAt('/login');

        await submit();

        expect(await screen.findByRole('alert')).toHaveTextContent(expected);
        expect(useAuthStore.getState().session).toBeNull();
      },
    );

    it('si no hay conexión avisa que no se pudo conectar', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      renderAt('/login');

      await submit();

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No se pudo conectar',
      );
    });

    it('con una sesión abierta, /login redirige adentro', () => {
      useAuthStore.setState({ session: sessionFor('admin') });

      renderAt('/login');

      expect(
        screen.getByRole('heading', { name: 'Alertas de mantenimiento' }),
      ).toBeInTheDocument();
    });

    it('los campos tienen etiqueta y son obligatorios', () => {
      renderAt('/login');

      expect(screen.getByLabelText('Email')).toBeRequired();
      expect(screen.getByLabelText('Contraseña')).toBeRequired();
    });
  });
});
