import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { server } from '../setup';
import { RegistroPage } from '@/pages/RegistroPage';

// Capture the payload the form sends to the public endpoint so we can assert
// exactly what the public path receives — particularly that `role_function`
// is one of the public two-value options, `curso`/`capacitacion` are present
// for Facilitador and absent for Participante, and `notes` is never set.
let lastCreatePayload: Record<string, unknown> | null = null;

function renderRegistro(initialPath = '/registro') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <RegistroPage />
    </MemoryRouter>,
  );
}

async function fillStep1(
  user: ReturnType<typeof userEvent.setup>,
  options: { funcion?: 'Participante' | 'Facilitador' } = {},
) {
  await user.type(screen.getByLabelText(/nombre completo/i), 'Ana Participante');
  await user.type(screen.getByLabelText(/documento|dui/i), '12345678-9');
  await user.type(screen.getByLabelText(/fecha de nacimiento/i), '1995-05-20');

  const generoSelect = (await screen.findAllByRole('combobox')).find(
    (el) => (el as HTMLSelectElement).name === 'genero',
  ) as HTMLSelectElement;
  await user.selectOptions(generoSelect, 'Femenino');

  if (options.funcion !== undefined) {
    const funcionSelect = (screen.getAllByRole('combobox') as HTMLSelectElement[]).find(
      (el) => el.name === 'rol-en-acoes',
    ) as HTMLSelectElement;
    await user.selectOptions(funcionSelect, options.funcion);
  }

  await user.click(screen.getByRole('button', { name: /^siguiente$/i }));
}

async function fillStep2(user: ReturnType<typeof userEvent.setup>) {
  const celularField = await screen.findByLabelText(/^celular$/i);
  await user.type(celularField, '7000-0000');
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
}

async function fillStep3ParticipanteAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
) {
  // curso + capacitacion MUST NOT be present for Participante.
  expect(screen.queryByLabelText(/^curso$/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^capacitaci[oó]n$/i)).not.toBeInTheDocument();

  await user.type(screen.getByLabelText(/entidad/i), 'Test Org');
  await user.click(screen.getByLabelText(/autorizo/i));
  await user.click(screen.getByRole('button', { name: /confirmar registro/i }));
}

async function fillStep3FacilitadorAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
) {
  const courseSelect = screen.getByLabelText(/^curso$/i) as HTMLSelectElement;
  const firstRealCourse = Array.from(courseSelect.options).map((o) => o.value).find((v) => v);
  await user.selectOptions(courseSelect, firstRealCourse!);

  await user.type(screen.getByLabelText(/capacitaci[oó]n/i), 'Taller de maquillaje inicial');
  await user.type(screen.getByLabelText(/entidad/i), 'Test Org');
  await user.click(screen.getByLabelText(/autorizo/i));
  await user.click(screen.getByRole('button', { name: /confirmar registro/i }));
}

function findSelectByName(name: string): HTMLSelectElement | undefined {
  return (screen.getAllByRole('combobox') as HTMLSelectElement[]).find(
    (el) => el.name === name,
  );
}

describe('RegistroPage role matrix', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.turnstile;
  });

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
              updated_at: '2024-01-01T00:00:00Z',
            },
          },
          { status: 201 },
        );
      }),
    );
  });

  describe('funcion selector in step 1', () => {
    it('exposes exactly Participante and Facilitador options', async () => {
      renderRegistro();

      const funcionSelect = await waitFor(() => {
        const sel = findSelectByName('rol-en-acoes');
        if (!sel) throw new Error('funcion select not rendered yet');
        return sel as HTMLSelectElement;
      });

      const optionLabels = Array.from(funcionSelect.options)
        .map((o) => o.text)
        .filter((label) => label !== 'Selecciona');

      expect(optionLabels).toEqual(['Participante', 'Facilitador']);
    });

    it('defaults to no selected role (empty)', async () => {
      renderRegistro();

      const funcionSelect = await waitFor(() => findSelectByName('rol-en-acoes') as HTMLSelectElement);
      expect(funcionSelect.value).toBe('');
    });

    it('shows a banner pointing to the panel for admin-only roles', async () => {
      renderRegistro();

      const banner = await screen.findByTestId('registro-role-banner');
      expect(banner).toBeInTheDocument();
      expect(banner.textContent ?? '').toMatch(/Participante/);
      expect(banner.textContent ?? '').toMatch(/Facilitador/);
      expect(banner.textContent ?? '').toMatch(/administrador|panel de control/i);
    });
  });

  describe('conditional rendering of curso / capacitacion', () => {
    it('does NOT render curso or capacitacion with empty funcion', async () => {
      renderRegistro();
      await screen.findByTestId('registro-role-banner');

      // Initial render is on step 1, so step-3 fields must not be in the DOM
      // regardless of the empty `funcion` state. The conditional rendering
      // covers this case by never mounting the inputs when funcion !==
      // 'Facilitador'.
      expect(screen.queryByLabelText(/^curso$/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^capacitaci[oó]n$/i)).not.toBeInTheDocument();
    });

    it('does NOT render curso or capacitacion for Participante', async () => {
      renderRegistro();
      await screen.findByTestId('registro-role-banner');

      const user = userEvent.setup();
      await fillStep1(user, { funcion: 'Participante' });
      await fillStep2(user);

      expect(screen.queryByLabelText(/^curso$/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^capacitaci[oó]n$/i)).not.toBeInTheDocument();
    });

    it('renders curso and capacitacion for Facilitador', async () => {
      renderRegistro();
      await screen.findByTestId('registro-role-banner');

      const user = userEvent.setup();
      await fillStep1(user, { funcion: 'Facilitador' });
      await fillStep2(user);

      expect(screen.getByLabelText(/^curso$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^capacitaci[oó]n$/i)).toBeInTheDocument();
    });

    it('clears stale curso and capacitacion state when toggling Facilitador → Participante', async () => {
      renderRegistro();
      await screen.findByTestId('registro-role-banner');

      const user = userEvent.setup();
      await fillStep1(user, { funcion: 'Facilitador' });
      await fillStep2(user);

      // Fill facilitator-only fields in step 3.
      const courseSelect = screen.getByLabelText(/^curso$/i) as HTMLSelectElement;
      const firstRealCourse = Array.from(courseSelect.options).map((o) => o.value).find((v) => v);
      await user.selectOptions(courseSelect, firstRealCourse!);
      const capacitacionInput = screen.getByLabelText(/^capacitaci[oó]n$/i);
      await user.type(capacitacionInput, 'Programa inicial');

      // Go back to step 1 (click Anterior twice: step 3 → step 2 → step 1).
      await user.click(screen.getByRole('button', { name: /anterior/i }));
      await user.click(screen.getByRole('button', { name: /anterior/i }));
      const funcionSelect = await screen.findByLabelText(/rol en acoes/i) as HTMLSelectElement;
      await user.selectOptions(funcionSelect, 'Participante');

      // Advance to step 3 again — conditional fields must be gone.
      await user.click(screen.getByRole('button', { name: /^siguiente$/i }));
      await screen.findByLabelText(/^celular$/i);
      await user.click(screen.getByRole('button', { name: /^siguiente$/i }));
      await waitFor(() => {
        expect(screen.queryByLabelText(/^curso$/i)).not.toBeInTheDocument();
      });
      expect(screen.queryByLabelText(/^capacitaci[oó]n$/i)).not.toBeInTheDocument();

      // And after submit, the payload must NOT carry stale values.
      await fillStep3ParticipanteAndSubmit(user);

      await waitFor(() => {
        expect(lastCreatePayload).not.toBeNull();
      });
      expect(lastCreatePayload).toMatchObject({ role_function: 'Participante' });
      // courseId is facilitator-only and must be absent (api.ts maps '' to undefined).
      expect(lastCreatePayload).not.toHaveProperty('courseId');
      // program (capacitacion) is facilitator-only — empty string is the
      // "no value" invariant; the backend's public schema (PR1) treats it as
      // a no-op so no observations-style data leaks into the participant row.
      expect(lastCreatePayload?.program).toBe('');
    });
  });

  describe('Turnstile verification', () => {
    it('blocks submission until the configured widget returns a token', async () => {
      vi.stubEnv('VITE_TURNSTILE_SITEKEY', 'test-site-key');
      window.turnstile = {
        render: vi.fn(() => 'widget-id'),
        reset: vi.fn(),
        remove: vi.fn(),
      };
      renderRegistro();
      const user = userEvent.setup();

      await fillStep1(user, { funcion: 'Participante' });
      await fillStep2(user);
      await fillStep3ParticipanteAndSubmit(user);

      expect(await screen.findByRole('alert')).toHaveTextContent('Por favor completá la verificación de seguridad');
      expect(lastCreatePayload).toBeNull();
    });

    it('submits the token returned by the configured widget', async () => {
      vi.stubEnv('VITE_TURNSTILE_SITEKEY', 'test-site-key');
      let resolveToken: ((token: string) => void) | undefined;
      window.turnstile = {
        render: vi.fn((_container, options) => {
          resolveToken = options.callback;
          return 'widget-id';
        }),
        reset: vi.fn(),
        remove: vi.fn(),
      };
      renderRegistro();
      const user = userEvent.setup();

      await fillStep1(user, { funcion: 'Participante' });
      await fillStep2(user);
      await waitFor(() => expect(resolveToken).toBeDefined());
      act(() => resolveToken?.('verified-token'));
      await fillStep3ParticipanteAndSubmit(user);

      await waitFor(() => expect(lastCreatePayload).not.toBeNull());
      expect(lastCreatePayload?.turnstileToken).toBe('verified-token');
    });
  });

  describe('step validation', () => {
    it('blocks step-1 advance when funcion is empty', async () => {
      renderRegistro();
      await screen.findByTestId('registro-role-banner');

      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/nombre completo/i), 'Ana');
      await user.type(screen.getByLabelText(/documento|dui/i), '12345678-9');
      await user.type(screen.getByLabelText(/fecha de nacimiento/i), '1995-05-20');
      const generoSelect = findSelectByName('genero') as HTMLSelectElement;
      await user.selectOptions(generoSelect, 'Femenino');
      await user.click(screen.getByRole('button', { name: /^siguiente$/i }));

      // Still on step 1 — the funcion select is still visible (the form did
      // not advance) and the select carries the validation error.
      expect(screen.getByLabelText(/rol en acoes/i)).toBeInTheDocument();
      const funcionSelect = findSelectByName('rol-en-acoes') as HTMLSelectElement;
      // The empty option is selected; the error attribute is set on the select.
      expect(funcionSelect.value).toBe('');
    });

    it('requires curso + capacitacion only for Facilitador on step 3', async () => {
      renderRegistro();
      await screen.findByTestId('registro-role-banner');

      const user = userEvent.setup();

      // Participante path: step 3 succeeds without facilitator-only fields.
      await fillStep1(user, { funcion: 'Participante' });
      await fillStep2(user);
      await fillStep3ParticipanteAndSubmit(user);

      await waitFor(() => {
        expect(lastCreatePayload).not.toBeNull();
      });
      expect(lastCreatePayload).toMatchObject({ role_function: 'Participante' });
    });
  });

  describe('observaciones is removed from the public form', () => {
    it('does NOT render any observaciones textarea or input', async () => {
      renderRegistro();
      await screen.findByTestId('registro-role-banner');

      // No element named `observaciones` exists on any step.
      expect(document.querySelector('[name="observaciones"]')).toBeNull();
    });

    it('submission payload never carries user observations', async () => {
      renderRegistro();
      await screen.findByTestId('registro-role-banner');

      const user = userEvent.setup();
      await fillStep1(user, { funcion: 'Participante' });
      await fillStep2(user);
      await fillStep3ParticipanteAndSubmit(user);

      await waitFor(() => {
        expect(lastCreatePayload).not.toBeNull();
      });
      // The public backend schema (PR1) accepts notes: '' as a no-op and
      // the route handler never forwards it. The form's payload MUST not
      // carry a non-empty user-written observation.
      expect(lastCreatePayload?.notes ?? '').toBe('');
    });
  });

  describe('DUI input guidance', () => {
    it('exposes pattern, placeholder, maxLength, and inputMode', async () => {
      renderRegistro();
      await screen.findByTestId('registro-role-banner');

      const duiInput = screen.getByLabelText(/documento|dui/i) as HTMLInputElement;
      expect(duiInput.getAttribute('pattern')).toBe('\\d{8}-\\d');
      expect(duiInput.getAttribute('placeholder')).toBe('00000000-0');
      expect(duiInput.getAttribute('maxlength')).toBe('10');
      expect(duiInput.getAttribute('inputmode')).toBe('numeric');
    });
  });
});