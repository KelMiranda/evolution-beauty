import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router/dom';
import { api, getMe, login as apiLogin, logout as apiLogout, AuthUser } from '@/services/api';

export type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const navigate = useNavigate();

  const checkAuth = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { user } = await getMe();
      setState({ user, loading: false, error: null });
    } catch (err) {
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { user, redirectTo } = await apiLogin(email, password);
      setState({ user, loading: false, error: null });
      navigate(redirectTo);
      return { success: true as const, redirectTo };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      return { success: false as const, error: message };
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await apiLogout();
      setState({ user: null, loading: false, error: null });
      navigate('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [navigate]);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    logout,
    checkAuth,
  };
}
