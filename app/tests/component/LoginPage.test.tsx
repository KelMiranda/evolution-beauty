import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
// Rewired from the deleted Astro login page to the active React SPA equivalent.
import { LoginPage } from '@/pages/LoginPage';

beforeEach(() => {
  server.use(http.get('/api/me', () => new HttpResponse(null, { status: 401 })));
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
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('starts with the documented local admin credentials', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/correo/i)).toHaveValue('admin@acoes.local');
    expect(screen.getByLabelText(/contraseña/i)).toHaveValue('Admin1234!');
  });

  it('calls login API with credentials', async () => {
    const user = userEvent.setup();
    let submittedCredentials: unknown;

    server.use(
      http.post('/api/login', async ({ request }) => {
        submittedCredentials = await request.json();
        return HttpResponse.json({
          user: {
            id: 1,
            email: 'admin@acoes.local',
            full_name: 'Admin User',
            role: 'admin',
            active: true,
          },
          redirectTo: '/dashboard',
        });
      })
    );

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(submittedCredentials).toEqual({
        email: 'admin@acoes.local',
        password: 'Admin1234!',
      });
    });
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

    const emailInput = screen.getByLabelText(/correo/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    await user.clear(emailInput);
    await user.clear(passwordInput);
    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

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
