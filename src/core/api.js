import { getSession, clearSession } from "../state.js";

const BASE_URL = "https://api.redseam.redberryinternship.ge/api";

const API_LOGIN_PATH = "/login";
const API_REGISTER_PATH = "/register";

export async function apiFetch(path, options = {}) {
  const session = getSession();

  const isFD = options?.body instanceof FormData;
  const baseHeaders = isFD ? {} : { "Content-Type": "application/json" };

  const headers = {
    ...baseHeaders,
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    location.hash = "#/login";
    throw Object.assign(new Error("Unauthorized"), { status: 401 });
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.message || data.error || data.detail)) ||
      `HTTP ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

export async function loginUser({ email, password }) {
  return apiFetch(API_LOGIN_PATH, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(payload) {
  if (payload instanceof FormData) {
    return apiFetch(API_REGISTER_PATH, { method: "POST", body: payload });
  }

  const { username, email, password, confirm, avatarFile } = payload || {};

  const fd = new FormData();
  if (username != null) fd.append("username", username);
  if (email != null) fd.append("email", email);
  if (password != null) fd.append("password", password);
  if (confirm != null) fd.append("password_confirmation", confirm);
  if (avatarFile) fd.append("avatar", avatarFile);

  return apiFetch(API_REGISTER_PATH, { method: "POST", body: fd });
}
