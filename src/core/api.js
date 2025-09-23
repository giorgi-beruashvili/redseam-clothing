import { getSession, clearSession } from "../state.js";

const BASE_URL = "https://api.redseam.redberryinternship.ge/api";

const API_LOGIN_PATH = "/login";
const API_REGISTER_PATH = "/register";

export async function apiFetch(path, options = {}) {
  const session = getSession();

  const isFD = options?.body instanceof FormData;
  const baseHeaders = isFD ? {} : { "Content-Type": "application/json" };
  const AUTH_FREE_PATHS = new Set(["/login", "/register"]);
  const shouldAttachAuth = !!session?.token && !AUTH_FREE_PATHS.has(path);

  let headers = {
    ...baseHeaders,
    Accept: "application/json",
    ...(shouldAttachAuth ? { Authorization: `Bearer ${session.token}` } : {}),
    ...(options.headers || {}),
  };

  if (AUTH_FREE_PATHS.has(path) && "Authorization" in headers) {
    const { Authorization, ...rest } = headers;
    headers = rest;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  try {
    const dbg = await res.clone().json();
  } catch {
    const txt = await res.clone().text();
  }

  if (res.status === 401) {
    clearSession();
    if (!location.hash.startsWith("#/login")) {
      location.hash = "#/login";
    }
    const err = new Error("Unauthorized");
    err.status = 401;
    try {
      const t = await res.clone().text();
      err.payload = t ? JSON.parse(t) : null;
    } catch {
      err.payload = null;
    }
    throw err;
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
  return apiFetch("/login", {
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
