import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';

// Captures the callbacks the Turnstile widget exposes so individual tests
// can simulate the user solving the challenge.
const turnstileCallbacks: {
  onToken?: (token: string) => void;
  onError?: (error: string) => void;
  onUnavailable?: () => void;
} = {};

vi.mock('@/components/Turnstile', () => ({
  Turnstile: ({ onToken, onError, onUnavailable }: {
    onToken: (token: string) => void;
    onError?: (error: string) => void;
    onUnavailable?: () => void;
  }) => {
    turnstileCallbacks.onToken = onToken;
    turnstileCallbacks.onError = onError;
    turnstileCallbacks.onUnavailable = onUnavailable;
    return <div data-testid="turnstile-widget" data-mock="true" />;
  },
}));

// Rewired from the deleted Astro login page to the active React SPA equivalent.
// Imported AFTER the mock so the component reads the mocked Turnstile.
const { LoginPage } = await import('@/pages/LoginPage');

beforeEach(() => {
  server.use(http.get('/api/me', () => new HttpResponse(null, { status: 401 })));
  turnstileCallbacks.onToken = undefined;
  turnstileCallbacks.onError = undefined;
  turnstileCallbacks.onUnavailable = undefined;
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
      // The page always forwards `turnstileToken` (empty string when no
      // widget is configured) so the backend can no-op verification
      // consistently in dev mode.
      expect(submittedCredentials).toMatchObject({
        email: 'admin@acoes.local',
        password: 'Admin1234!',
        turnstileToken: '',
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

  it('does NOT render a credentials hint at the bottom of the form', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // The previous implementation exposed the production admin credentials
    // (admin@acoes.local / Admin1234!) in a small caption under the form.
    // Removing it keeps the form prefilled (dev convenience) without
    // revealing the password to anyone viewing the page.
    expect(screen.queryByText(/admin@acoes\.local/i)).toBeNull();
    expect(screen.queryByText(/Admin1234!/)).toBeNull();
  });
});

// ─── Turnstile gating ────────────────────────────────────────────────────────

describe('LoginPage Turnstile integration', () => {
  // The widget reads `import.meta.env.VITE_TURNSTILE_SITEKEY` at module load.
  // Vitest's `vi.stubEnv` mutates the env shim that Vite exposes via
  // `import.meta.env`, so we set the sitekey before importing the page
  // and reset modules between describes to refresh the cached value.
  type ReloadableModule = {
    LoginPage: typeof LoginPage;
  };

  async function loadWithSiteKey(sitekey: string): Promise<ReloadableModule['LoginPage']> {
    vi.stubEnv('VITE_TURNSTILE_SITEKEY', sitekey);
    vi.resetModules();
    // Re-import the page so its top-level `import.meta.env` read picks
    // up the new sitekey value.
    const mod = (await import('@/pages/LoginPage?env')) as unknown as ReloadableModule;
    return mod.LoginPage;
  }

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('does not render the Turnstile widget when the sitekey is empty', async () => {
    const Page = await loadWithSiteKey('');
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('turnstile-widget')).toBeNull();
  });

  it('renders the Turnstile widget when a sitekey is configured', async () => {
    const Page = await loadWithSiteKey('1x00000000000000000000AA');
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>
    );
    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument();
  });

  it('blocks submit when the sitekey is configured but no token has been issued', async () => {
    const Page = await loadWithSiteKey('1x00000000000000000000AA');
    const user = userEvent.setup();
    let submitCount = 0;

    server.use(
      http.post('/api/login', () => {
        submitCount += 1;
        return HttpResponse.json({
          user: {
            id: 1,
            email: 'admin@acoes.local',
            full_name: 'Admin',
            role: 'admin',
            active: true,
          },
          redirectTo: '/dashboard',
        });
      })
    );

    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(
      await screen.findByText(/por favor completá la verificación de seguridad/i),
    ).toBeInTheDocument();
    expect(submitCount).toBe(0);
  });

  it('allows submit when the Turnstile widget emits a token', async () => {
    const Page = await loadWithSiteKey('1x00000000000000000000AA');
    const user = userEvent.setup();
    let submitted: unknown = null;

    server.use(
      http.post('/api/login', async ({ request }) => {
        submitted = await request.json();
        return HttpResponse.json({
          user: {
            id: 1,
            email: 'admin@acoes.local',
            full_name: 'Admin',
            role: 'admin',
            active: true,
          },
          redirectTo: '/dashboard',
        });
      })
    );

    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>
    );

    // The mocked widget captured `onToken` on render — simulate the
    // user solving the challenge.
    expect(turnstileCallbacks.onToken).toBeDefined();
    act(() => {
      turnstileCallbacks.onToken!('mocked-turnstile-token');
    });

    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(submitted).toMatchObject({
        email: 'admin@acoes.local',
        password: 'Admin1234!',
        turnstileToken: 'mocked-turnstile-token',
      });
    });
  });
});