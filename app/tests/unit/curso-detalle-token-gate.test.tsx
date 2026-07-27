import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { server } from '../setup';
import { CursoDetallePage } from '@/pages/CursoDetallePage';

function renderCursoDetalle(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/cursos/:id" element={<CursoDetallePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const baseCourseResponse = {
  data: {
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
    public_enrollment_token: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

function setupCourseHandler() {
  server.use(
    http.get('/api/courses/9', () => HttpResponse.json(baseCourseResponse)),
  );
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  sessionStorage.clear();
});

describe('CursoDetallePage — public enrollment token gating', () => {
  it('hides the Inscribirme ahora button when no public token is present in the URL', async () => {
    setupCourseHandler();

    renderCursoDetalle('/cursos/9');

    // Course loads; the button should never appear.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /colorimetría profesional/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /inscribirme ahora/i })).not.toBeInTheDocument();
  });

  it('shows the fallback message when no public token is present', async () => {
    setupCourseHandler();

    renderCursoDetalle('/cursos/9');

    expect(
      await screen.findByText(/necesitás un link público para inscribirte/i),
    ).toBeInTheDocument();
  });

  it('shows the Inscribirme ahora button when a public token is present in the URL', async () => {
    setupCourseHandler();
    server.use(
      http.get('/api/public/courses/enrollment', () =>
        HttpResponse.json({
          data: {
            token: 'tok-9-abc',
            course: {
              id: 9,
              name: 'Colorimetría Profesional',
              instructor: 'Inst',
              estado: 'enrolling',
              cupo_maximo: 20,
              inscritos: 5,
            },
          },
        }),
      ),
    );

    renderCursoDetalle('/cursos/9?token=tok-9-abc');

    expect(
      await screen.findByRole('button', { name: /inscribirme ahora/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/necesitás un link público para inscribirte/i),
    ).not.toBeInTheDocument();
  });

  it('hides both button and fallback when the token is invalid (token error path)', async () => {
    setupCourseHandler();
    server.use(
      http.get('/api/public/courses/enrollment', () =>
        HttpResponse.json({ error: 'Token inválido' }, { status: 404 }),
      ),
    );

    renderCursoDetalle('/cursos/9?token=bad-token');

    // Wait for the course to load, then assert the Inscribirme button never
    // appears (the CTA is gated by `!tokenError`).
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /colorimetría profesional/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /inscribirme ahora/i })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/necesitás un link público para inscribirte/i),
    ).not.toBeInTheDocument();
  });
});