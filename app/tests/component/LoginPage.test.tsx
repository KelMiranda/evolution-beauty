import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import LoginPage from '@/pages/login';

// ─── MSW Server Setup ─────────────────────────────────────────────────────────

export const server = setupServer();

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  it('renders login form', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('shows validation error when fields are empty', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(screen.getByText(/por favor completa todos los campos/i)).toBeInTheDocument();
  });

  it('calls login API with credentials', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/login', () =>
        HttpResponse.json({
          user: {
            id: 1,
            email: 'admin@acoes.local',
            full_name: 'Admin User',
            role: 'admin',
            active: true,
          },
          redirectTo: '/dashboard',
        })
      )
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/correo/i), 'admin@acoes.local');
    await user.type(screen.getByLabelText(/contraseña/i), 'Admin1234!');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    // Should not show error
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('shows error on login failure', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('/api/login', () =>
        HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      )
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/correo/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    // Wait for error to appear
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it('has a link to registration page', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /regístrate/i });
    expect(link).toHaveAttribute('href', '/registro');
  });
});
