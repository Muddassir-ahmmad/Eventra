import axios from "axios";

// Read API URL from environment variable if configured (for Vercel / production),
// otherwise default to localhost:5000 for local development.
let rawBaseURL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

// Ensure /api suffix if not already present
if (!rawBaseURL.endsWith("/api") && !rawBaseURL.endsWith("/api/")) {
  rawBaseURL = `${rawBaseURL.replace(/\/+$/, "")}/api`;
}

const api = axios.create({
  baseURL: rawBaseURL,
});

export function setToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    localStorage.setItem("eventra_token", token);
  } else {
    delete api.defaults.headers.common.Authorization;
    localStorage.removeItem("eventra_token");
  }
}

const savedToken = localStorage.getItem("eventra_token");
if (savedToken) setToken(savedToken);

export default api;
