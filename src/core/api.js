import { getSession, clearSession } from "../state.js";

const BASE_URL = "https://api.redseam.redberryinternship.ge/api";

export async function apiFetch(path, options = {}) {
  const session = getSession();
  const headers = {
    "Content-Type": "application/json",
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    location.hash = "#/login";
    throw new Error("Unauthorized");
  }

  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}
