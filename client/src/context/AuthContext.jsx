import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { clearToken, getToken, setToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken())); // true while we check a saved login

  // On first load, if a token is saved, ask the server who it belongs to.
  useEffect(() => {
    let alive = true;
    if (!getToken()) {
      setLoading(false);
      return undefined;
    }
    api
      .get('/api/auth/me')
      .then((res) => alive && setUser(res.data.user))
      .catch(() => clearToken())
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // The api helper announces this when the server rejects our token.
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('gignest:logout', onLogout);
    return () => window.removeEventListener('gignest:logout', onLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (details) => {
    const { data } = await api.post('/api/auth/register', details);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const updateUser = useCallback((next) => setUser(next), []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateUser }),
    [user, loading, login, register, logout, updateUser]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
