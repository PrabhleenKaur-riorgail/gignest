import axios from 'axios';

// Empty in development (the dev server forwards /api to the backend).
// After deployment it holds the backend's address.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' });

const TOKEN_KEY = 'gignest_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Send the login token with every request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the server says our token is no longer valid, log out everywhere in the app.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      clearToken();
      window.dispatchEvent(new Event('gignest:logout'));
    }
    return Promise.reject(error);
  }
);

// Turns any error into a sentence we can show to the person.
export const errorMessage = (error) => {
  if (error.response?.data?.message) return error.response.data.message;
  if (error.request) return 'Cannot reach the server. Check that the backend is running.';
  return 'Something went wrong. Please try again.';
};

export default api;
