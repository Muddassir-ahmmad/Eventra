import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
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
