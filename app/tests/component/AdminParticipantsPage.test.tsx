import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import AdminParticipantsPage from '@/pages/admin/participants';

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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockParticipants = [
  {
    id: 1,
    participant_code: 'P001',
    full_name: 'Maria Garcia',
    document_number: '12345678-9',
    birth_date: '1990-05-15',
    gender: 'female',
    phone_country: 'SV',
    phone_dial_code: '+503',
    phone_number: '12345678',
    phone: '+503 1234 5678',
    email: 'maria@example.com',
    address: null,
    municipality: null,
    department: 'San Salvador',
    district: null,
    organization: 'Test Org',
    role_function: 'teacher',
    education_level: 'bachillerato',
    program: 'Digital Skills',
    status: 'active',
    lifecycle_state: 'active',
    deleted_at: null,
    deleted_by: null,
    notes: null,
    consent: true,
    created_by: 1,
    updated_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    participant_code: 'P002',
    full_name: 'Juan Perez',
    document_number: '87654321-0',
    birth_date: '1985-03-20',
    gender: 'male',
    phone_country: 'SV',
    phone_dial_code: '+503',
    phone_number: '87654321',
    phone: '+503 8765 4321',
    email: 'juan@example.com',
    address: null,
    municipality: null,
    department: 'La Libertad',
    district: null,
    organization: 'Another Org',
    role_function: 'student',
    education_level: 'universidad',
    program: 'Digital Skills',
    status: 'active',
    lifecycle_state: 'active',
    deleted_at: null,
    deleted_by: null,
    notes: null,
    consent: true,
    created_by: 1,
    updated_by: 1,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminParticipantsPage', () => {
  it('renders participants table', async () => {
    server.use(
      http.get('/api/participants', () =>
        HttpResponse.json({
          data: mockParticipants,
          meta: { page: 1, limit: 10, offset: 0 },
        })
      )
    );

    render(
      <MemoryRouter>
        <AdminParticipantsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    });

    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
  });

  it('shows participant codes', async () => {
    server.use(
      http.get('/api/participants', () =>
        HttpResponse.json({
          data: mockParticipants,
          meta: { page: 1, limit: 10, offset: 0 },
        })
      )
    );

    render(
      <MemoryRouter>
        <AdminParticipantsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('P001')).toBeInTheDocument();
    });

    expect(screen.getByText('P002')).toBeInTheDocument();
  });

  it('shows empty state when no participants', async () => {
    server.use(
      http.get('/api/participants', () =>
        HttpResponse.json({
          data: [],
          meta: { page: 1, limit: 10, offset: 0 },
        })
      )
    );

    render(
      <MemoryRouter>
        <AdminParticipantsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no se encontraron participantes/i)).toBeInTheDocument();
    });
  });

  it('has search input', async () => {
    render(
      <MemoryRouter>
        <AdminParticipantsPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/buscar por nombre/i)).toBeInTheDocument();
  });

  it('has new participant button', () => {
    render(
      <MemoryRouter>
        <AdminParticipantsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /nuevo participante/i })).toHaveAttribute(
      'href',
      '/admin/participants/new'
    );
  });

  it('renders department filter', async () => {
    render(
      <MemoryRouter>
        <AdminParticipantsPage />
      </MemoryRouter>
    );

    // Filter button should be present
    const filterButton = screen.getByRole('button', { name: '' });
    expect(filterButton).toBeInTheDocument();
  });
});
