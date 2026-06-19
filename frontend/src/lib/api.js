import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8001";
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const orig = error.config;
    // Don't try to refresh on the refresh/login endpoints themselves
    const skipRefresh =
      orig?.url?.includes("/auth/refresh") ||
      orig?.url?.includes("/auth/login") ||
      orig?.url?.includes("/auth/register");

    if (error.response?.status === 401 && !orig._retry && !skipRefresh) {
      orig._retry = true;
      try {
        await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        return api(orig);
      } catch (refreshErr) {
        // 401 on refresh = no valid session. Only navigate from non-auth pages.
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/login") &&
          !window.location.pathname.startsWith("/register")
        ) {
          console.error("Token refresh failed:", refreshErr);
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
