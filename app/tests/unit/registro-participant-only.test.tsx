import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { server } from '../setup';
import { RegistroPage } from '@/pages/RegistroPage';

// Capture the payload the form sends to the public endpoint.
let lastCreatePayload: Record<string, unknown> | null = null;

function renderRegistro() {
  return render(
    <MemoryRouter initialEntries={['/registro']}>
      <RegistroPage />
    </MemoryRouter>,
  );
}

async function fillStep1(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nombre completo/i), 'Ana Participante');
  await user.type(screen.getByLabelText(/documento|dui/i), '12345678-9');
  await user.type(screen.getByLabelText(/fecha de nacimiento/i), '1995-05-20');
  const generoSelect = (await screen.findAllByRole('combobox')).find(
    (el) => (el as HTMLSelectElement).name === 'genero',
  ) as HTMLSelectElement;
  await user.selectOptions(generoSelect, 'Femenino');
  await user.click(screen.getByRole('button', { name: /^siguiente$/i }));
}

async function fillStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^celular$/i), '7000-0000');
  await user.type(screen.getByLabelText(/^correo$/i), 'ana.participante@example.com');
  await user.type(screen.getByLabelText(/^direcci[oó]n$/i), 'Colonia Escalón');

  const departamento = (await screen.findAllByRole('combobox')).find(
    (el) => (el as HTMLSelectElement).name === 'departamento',
  ) as HTMLSelectElement;
  await user.selectOptions(departamento, 'San Salvador');

  // municipio is a controlled select that depends on departamento.
  // After selecting San Salvador, the municipios list should populate.
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

async function fillStep3AndSubmit(user: ReturnType<typeof userEvent.setup>) {
  // Course select.
  const courseSelect = screen.getByLabelText(/^curso$/i) as HTMLSelectElement;
  const firstRealCourse = Array.from(courseSelect.options).map((o) => o.value).find((v) => v);
  await user.selectOptions(courseSelect, firstRealCourse!);

  await user.type(screen.getByLabelText(/entidad/i), 'Test Org');
  // The `funcion` field is now read-only — there is no select to interact with.
  await user.click(screen.getByLabelText(/autorizo/i));

  await user.click(screen.getByRole('button', { name: /confirmar registro/i }));
}

describe('RegistroPage participant-only', () => {
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

  it('shows a banner explaining the form is for participants only', async () => {
    renderRegistro();

    const banner = await screen.findByTestId('registro-participant-only-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent ?? '').toMatch(/participantes/i);
    expect(banner.textContent ?? '').toMatch(/administrador|panel de control/i);
  });

  it('renders the sidebar with the participant-only heading', async () => {
    renderRegistro();

    expect(
      await screen.findByRole('heading', { name: /registro de participantes/i }),
    ).toBeInTheDocument();
  });

  it('does not expose a <select> for the funcion field', async () => {
    renderRegistro();

    await screen.findByTestId('registro-participant-only-banner');

    // No select named `funcion` should be present in step 1.
    const selectsInStep1 = screen.getAllByRole('combobox');
    const funcionSelect = selectsInStep1.find(
      (el) => (el as HTMLSelectElement).name === 'funcion',
    );
    expect(funcionSelect).toBeUndefined();

    // Navigate to step 3 and confirm there is still no `funcion` select.
    const user = userEvent.setup();
    await fillStep1(user);
    await fillStep2(user);

    // On step 3, the read-only role field is rendered.
    expect(screen.getByTestId('registro-role-readonly')).toHaveTextContent(
      /Participante/,
    );

    const selectsInStep3 = screen.getAllByRole('combobox');
    const funcionSelectStep3 = selectsInStep3.find(
      (el) => (el as HTMLSelectElement).name === 'funcion',
    );
    expect(funcionSelectStep3).toBeUndefined();
  });

  it('hardcodes funcion to "Participante" in the form state', async () => {
    renderRegistro();

    await screen.findByTestId('registro-participant-only-banner');

    const user = userEvent.setup();
    await fillStep1(user);
    await fillStep2(user);

    // The read-only field shows "Participante" and the confirmation group
    // surfaces the same value (reviewGroups reads form.funcion).
    expect(screen.getByTestId('registro-role-readonly')).toHaveTextContent(
      /Participante/,
    );
    expect(screen.getByText('Función').nextSibling).toHaveTextContent(
      /Participante/,
    );
  });

  it('submits the form with funcion: "Participante" regardless of user actions', async () => {
    const user = userEvent.setup();
    renderRegistro();

    await screen.findByTestId('registro-participant-only-banner');
    await fillStep1(user);
    await fillStep2(user);
    await fillStep3AndSubmit(user);

    await waitFor(() => {
      expect(lastCreatePayload).not.toBeNull();
    });

    expect(lastCreatePayload).toMatchObject({
      role_function: 'Participante',
      consent: true,
    });

    // The success view shows the participant code.
    expect(
      await screen.findByRole('heading', { name: /registro exitoso/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('P-TEST-001')).toBeInTheDocument();
  });
});