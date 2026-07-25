import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleGuard } from '@/components/RoleGuard';

const useAuthMock = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => useAuthMock() }));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard/cursos']}>
      <Routes>
        <Route
          path="/dashboard/cursos"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <div>Protected courses</div>
            </RoleGuard>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RoleGuard', () => {
  beforeEach(() => useAuthMock.mockReset());

  it('does not render protected content while auth is loading', () => {
    useAuthMock.mockReturnValue({ loading: true, isAuthenticated: false, role: null });
    renderGuard();
    expect(screen.queryByText('Protected courses')).not.toBeInTheDocument();
  });

  it('redirects an unauthenticated user to login', () => {
    useAuthMock.mockReturnValue({ loading: false, isAuthenticated: false, role: null });
    renderGuard();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('redirects a wrong-role user to the unauthorized page', () => {
    useAuthMock.mockReturnValue({ loading: false, isAuthenticated: true, role: 'empleado' });
    renderGuard();
    expect(screen.getByText('Unauthorized page')).toBeInTheDocument();
  });

  it('renders protected content for an allowed role', () => {
    useAuthMock.mockReturnValue({ loading: false, isAuthenticated: true, role: 'admin' });
    renderGuard();
    expect(screen.getByText('Protected courses')).toBeInTheDocument();
  });
});
