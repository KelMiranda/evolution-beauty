import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';
// Rewired from the deleted Astro catalog route to the active React SPA equivalent.
import { CatalogoCursosPage } from '@/pages/CatalogoCursosPage';

beforeEach(() => {
  server.use(
    http.get('/api/courses', () => HttpResponse.json({ data: [] })),
    http.get('/api/users', () => HttpResponse.json({ data: [] }))
  );
});

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockCourses = [
  {
    id: 1,
    name: 'Digital Skills 101',
    description: 'Learn digital skills for the modern workplace',
    category: 'technology',
    level: 'beginner',
    instructor: 'John Doe',
    instructor_bio: null,
    price: 0,
    price_original: null,
    image: null,
    fecha_inicio: '2024-01-01',
    fecha_fin: '2024-03-01',
    horario: 'Monday 9-11am',
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
  {
    id: 2,
    name: 'Advanced Colorimetry',
    description: 'Master advanced color techniques',
    category: 'Colorimetría',
    level: 'advanced',
    instructor: 'Jane Smith',
    instructor_bio: null,
    price: 50,
    price_original: 100,
    image: null,
    fecha_inicio: '2024-02-01',
    fecha_fin: '2024-04-01',
    horario: 'Tuesday 2-5pm',
    ubicacion: 'San Salvador',
    lat: null,
    lng: null,
    cupo_maximo: 15,
    inscritos: 12,
    estado: 'enrolling',
    tags: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CatalogoCursosPage', () => {
  it('renders course catalog page', () => {
    render(
      <MemoryRouter>
        <CatalogoCursosPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /formación de excelencia/i })).toBeInTheDocument();
  });

  it('renders course cards when data loads', async () => {
    server.use(
      http.get('/api/courses', () =>
        HttpResponse.json({
          data: mockCourses,
        })
      )
    );

    render(
      <MemoryRouter>
        <CatalogoCursosPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Digital Skills 101')).toBeInTheDocument();
    });

    expect(screen.getByText('Advanced Colorimetry')).toBeInTheDocument();
  });

  it('shows course description on cards', async () => {
    server.use(
      http.get('/api/courses', () =>
        HttpResponse.json({
          data: mockCourses,
        })
      )
    );

    render(
      <MemoryRouter>
        <CatalogoCursosPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/learn digital skills/i)).toBeInTheDocument();
    });
  });

  it('shows enrollment info', async () => {
    server.use(
      http.get('/api/courses', () =>
        HttpResponse.json({
          data: mockCourses,
        })
      )
    );

    render(
      <MemoryRouter>
        <CatalogoCursosPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/5 de 20/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no courses', async () => {
    server.use(
      http.get('/api/courses', () =>
        HttpResponse.json({
          data: [],
        })
      )
    );

    render(
      <MemoryRouter>
        <CatalogoCursosPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no se encontraron cursos/i)).toBeInTheDocument();
    });
  });

  it('has search input', async () => {
    render(
      <MemoryRouter>
        <CatalogoCursosPage />
      </MemoryRouter>
    );

    await screen.findByText(/no se encontraron cursos/i);
    expect(screen.getByPlaceholderText(/buscar cursos/i)).toBeInTheDocument();
  });

  it('has category filter buttons', async () => {
    render(
      <MemoryRouter>
        <CatalogoCursosPage />
      </MemoryRouter>
    );

    await screen.findByText(/no se encontraron cursos/i);
    expect(screen.getByRole('button', { name: 'Colorimetría' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Corte' })).toBeInTheDocument();
  });

  it('has level filter buttons', async () => {
    render(
      <MemoryRouter>
        <CatalogoCursosPage />
      </MemoryRouter>
    );

    await screen.findByText(/no se encontraron cursos/i);
    expect(screen.getByRole('button', { name: 'Básico' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Intermedio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Avanzado' })).toBeInTheDocument();
  });
});
