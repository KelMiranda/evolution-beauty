import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { server } from '../setup';
import { RegistroPage } from '@/pages/RegistroPage';

// Renders the router's current location so the test can assert that the
// redirect navigated to the validated target. With `MemoryRouter` the
// `window.location.hash` is NOT mutated (only the in-memory history
// stack is), so we observe via `useLocation` instead.
function LocationSpy({ testId = 'location-spy' }: { testId?: string }) {
  const location = useLocation();
  return <div data-testid={testId}>{location.pathname}{location.search}</div>;
}

// Capture the navigation destination so we can assert that the SPA landed on
// the validated redirect target. With HashRouter, react-router-dom's
// `useNavigate` rewrites `window.location.hash`; the test inspects that
// after a successful submission.
let lastCreatePayload: Record<string, unknown> | null = null;

function renderRegistro(initialPath = '/registro') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <RegistroPage />
      <LocationSpy />
    </MemoryRouter>,
  );
}

function findSelectByName(name: string): HTMLSelectElement | undefined {
  return (screen.getAllByRole('combobox') as HTMLSelectElement[]).find(
    (el) => el.name === name,
  );
}

async function fillFullFlowAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  options: { funcion: 'Participante' | 'Facilitador' } = { funcion: 'Participante' },
) {
  await user.type(screen.getByLabelText(/nombre completo/i), 'Ana Participante');
  await user.type(screen.getByLabelText(/documento|dui/i), '12345678-9');
  await user.type(screen.getByLabelText(/fecha de nacimiento/i), '1995-05-20');
  const generoSelect = findSelectByName('genero') as HTMLSelectElement;
  await user.selectOptions(generoSelect, 'Femenino');
  const funcionSelect = findSelectByName('rol-en-acoes') as HTMLSelectElement;
  await user.selectOptions(funcionSelect, options.funcion);
  await user.click(screen.getByRole('button', { name: /^siguiente$/i }));

  await screen.findByLabelText(/^celular$/i);
  await user.type(screen.getByLabelText(/^celular$/i), '7000-0000');
  await user.type(screen.getByLabelText(/^correo$/i), 'ana.participante@example.com');
  await user.type(screen.getByLabelText(/^direcci[oó]n$/i), 'Colonia Escalón');

  const departamento = (await screen.findAllByRole('combobox')).find(
    (el) => (el as HTMLSelectElement).name === 'departamento',
  ) as HTMLSelectElement;
  await user.selectOptions(departamento, 'San Salvador');

  const municipio = await waitFor(() => {
    const sel = (screen.getAllByRole('combobox') as HTMLSelectElement[]).find(
      (el) => el.name === 'municipio',
    ) as HTMLSelectElement;
    expect(sel.options.length).toBeGreaterThan(1);
    return sel;
  });
  const firstMunicipio = Array.from(municipio.options).map((o) => o.value).find((v) => v);
  await user.selectOptions(municipio, firstMunicipio!);
  await user.click(screen.getByRole('button', { name: /^siguiente$/i }));

  if (options.funcion === 'Facilitador') {
    const courseSelect = screen.getByLabelText(/^curso$/i) as HTMLSelectElement;
    const firstRealCourse = Array.from(courseSelect.options).map((o) => o.value).find((v) => v);
    await user.selectOptions(courseSelect, firstRealCourse!);
    await user.type(screen.getByLabelText(/capacitaci[oó]n/i), 'Programa inicial');
  }

  await user.type(screen.getByLabelText(/entidad/i), 'Test Org');
  await user.click(screen.getByLabelText(/autorizo/i));
  await user.click(screen.getByRole('button', { name: /confirmar registro/i }));
}

describe('RegistroPage ?redirect= handling', () => {
  beforeEach(() => {
    lastCreatePayload = null;
    server.use(
      http.get('/api/courses', () =>
        HttpResponse.json({
          data: [
            {
              id: 9,
              name: 'Colorimetría Profesional',
              description: 'desc',
              category: 'belleza',
              level: 'beginner',
              instructor: 'Inst',
              instructor_bio: null,
              price: 0,
              price_original: null,
              image: null,
              fecha_inicio: '2024-01-01',
              fecha_fin: '2024-03-01',
              horario: 'Mon 9-11',
              ubicacion: 'Online',
              lat: null,
              lng: null,
              cupo_maximo: 20,
              inscritos: 5,
              estado: 'published',
              tags: null,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          ],
        }),
      ),
      http.post('/api/public/participants', async ({ request }) => {
        lastCreatePayload = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            data: {
              id: 42,
              participant_code: 'P-TEST-001',
              full_name: 'Ana Participante',
              document_number: '12345678-9',
              birth_date: '1995-05-20',
              gender: 'Femenino',
              phone_country: 'El Salvador',
              phone_dial_code: '+503',
              phone_number: '7000-0000',
              phone: '+503 7000-0000',
              email: 'ana.participante@example.com',
              address: 'Colonia Escalón',
              municipality: 'San Salvador',
              department: 'San Salvador',
              district: '',
              organization: 'Test Org',
              role_function: 'Participante',
              education_level: '',
              program: '',
              status: 'Pendiente',
              lifecycle_state: 'pending',
              deleted_at: null,
              deleted_by: null,
              notes: '',
              consent: true,
              created_by: 1,
              updated_by: 1,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '4-01-01T00:00:00Z',
            },
          },
          { status: 201 },
        );
      }),
    );
  });

  it('falls back to the success page when no ?redirect= is present', async () => {
    renderRegistro('/registro');
    const user = userEvent.setup();
    await fillFullFlowAndSubmit(user);

    await waitFor(() => {
      expect(lastCreatePayload).not.toBeNull();
    });

    // Success page renders the registration code; no navigation occurred.
    expect(
      await screen.findByRole('heading', { name: /registro exitoso/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('P-TEST-001')).toBeInTheDocument();
    // No hash-based navigation — the URL stays on /registro (MemoryRouter
    // keeps the original entry; we use the success card as the assertion).
  });

  it('navigates to the validated ?redirect= target after a successful submission', async () => {
    renderRegistro('/registro?redirect=%2Fcursos%2F9%3Ftoken%3DXYZ');
    const user = userEvent.setup();
    await fillFullFlowAndSubmit(user);

    await waitFor(() => {
      expect(lastCreatePayload).not.toBeNull();
    });

    // With HashRouter, `navigate('/cursos/9?token=XYZ')` rewrites the
    // location hash to `#/cursos/9?token=XYZ`. The MemoryRouter tracks the
    // entry changes; we observe via `useLocation` because the test
    // environment does not mutate `window.location.hash`.
    await waitFor(() => {
      expect(screen.getByTestId('location-spy').textContent).toBe('/cursos/9?token=XYZ');
    });
  });

  it('falls back to the success page when ?redirect=//evil.com is rejected', async () => {
    renderRegistro('/registro?redirect=%2F%2Fevil.com');
    const user = userEvent.setup();
    await fillFullFlowAndSubmit(user);

    await waitFor(() => {
      expect(lastCreatePayload).not.toBeNull();
    });

    // Protocol-relative URL is rejected; the success page stays and the
    // SPA never lands on the `//evil.com` path.
    expect(
      await screen.findByRole('heading', { name: /registro exitoso/i }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location-spy').textContent).toMatch(/^\/registro/);
  });

  it('falls back to the success page when ?redirect=http://evil.com is rejected', async () => {
    renderRegistro('/registro?redirect=http%3A%2F%2Fevil.com');
    const user = userEvent.setup();
    await fillFullFlowAndSubmit(user);

    await waitFor(() => {
      expect(lastCreatePayload).not.toBeNull();
    });

    expect(
      await screen.findByRole('heading', { name: /registro exitoso/i }),
    ).toBeInTheDocument();
    // The pathname is still `/registro` — no navigation to evil.com.
    expect(screen.getByTestId('location-spy').textContent).toMatch(/^\/registro/);
  });

  it('falls back to the success page when ?redirect=javascript:alert(1) is rejected', async () => {
    renderRegistro('/registro?redirect=javascript%3Aalert(1)');
    const user = userEvent.setup();
    await fillFullFlowAndSubmit(user);

    await waitFor(() => {
      expect(lastCreatePayload).not.toBeNull();
    });

    expect(
      await screen.findByRole('heading', { name: /registro exitoso/i }),
    ).toBeInTheDocument();
    // No `javascript:` scheme made it through as the target.
    expect(screen.getByTestId('location-spy').textContent).toMatch(/^\/registro/);
  });

  it('does NOT navigate when the registration submission fails', async () => {
    // Override the participant endpoint to return 500 instead of 201.
    server.use(
      http.post('/api/public/participants', () =>
        new HttpResponse(JSON.stringify({ error: 'boom' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    renderRegistro('/registro?redirect=%2Fcursos%2F9%3Ftoken%3DXYZ');
    const user = userEvent.setup();
    await fillFullFlowAndSubmit(user);

    // Wait for the form to settle on the failure path — success card never
    // renders because the API returned 500, and no navigation occurs.
    await waitFor(() => {
      expect(screen.queryByText('P-TEST-001')).not.toBeInTheDocument();
    });
    // Pathname is still /registro because the API error short-circuited
    // before the safeRedirect navigation branch ran.
    expect(screen.getByTestId('location-spy').textContent).toMatch(/^\/registro/);
  });
});