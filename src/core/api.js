import { getSession, clearSession } from "../state.js";

const BASE_URL = "https://api.redseam.redberryinternship.ge/api";

const API_LOGIN_PATH = "/login";
const API_REGISTER_PATH = "/register";
const PRODUCTS_PATH = "/products";
const CART_PATH = "/cart";
const CART_PRODUCTS_PATH = (productId) => `/cart/products/${productId}`;
const CART_CHECKOUT_PATH = "/cart/checkout";

export async function apiFetch(path, options = {}) {
  const session = getSession();
  const isFD = options?.body instanceof FormData;
  const hasBody = options?.body !== undefined && options?.body !== null;
  const baseHeaders =
    !isFD && hasBody ? { "Content-Type": "application/json" } : {};
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

function normalizeSort(input) {
  if (!input) return undefined;
  const v = String(input).toLowerCase();
  if (v === "price" || v === "created_at") return v;
  if (v === "price_asc") return "price";
  if (v === "price_desc") return "-price";
  if (v === "newest" || v === "created_at_desc") return "-created_at";
  if (v === "oldest" || v === "created_at_asc") return "created_at";
  return v;
}

export async function fetchProducts({
  page = 1,
  sort,
  min,
  max,
  priceFrom,
  priceTo,
} = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  const s = normalizeSort(sort);
  if (s) qs.set("sort", s);
  const from = min ?? priceFrom;
  const to = max ?? priceTo;
  if (from !== undefined && from !== "")
    qs.set("filter[price_from]", String(from));
  if (to !== undefined && to !== "") qs.set("filter[price_to]", String(to));
  return apiFetch(`${PRODUCTS_PATH}?${qs.toString()}`, { method: "GET" });
}

const PRODUCT_BY_ID_PATH = (id) => `${PRODUCTS_PATH}/${id}`;

export async function fetchProductById(id) {
  return apiFetch(PRODUCT_BY_ID_PATH(id), { method: "GET" });
}

export async function fetchCart() {
  return apiFetch(CART_PATH, { method: "GET" });
}

export async function addCartProduct(productId, { quantity, color, size }) {
  const body = {};
  if (Number.isFinite(Number(quantity))) body.quantity = Number(quantity);
  if (typeof color === "string" && color.trim()) body.color = color.trim();
  if (typeof size === "string" && size.trim()) body.size = size.trim();

  return apiFetch(CART_PRODUCTS_PATH(productId), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateCartProduct({
  productId,
  quantity,
  color,
  size,
  delta,
}) {
  const body = {};
  if (delta !== undefined) body.delta = Number(delta);
  if (quantity !== undefined)
    body.quantity = Math.max(0, Math.floor(Number(quantity)));
  if (typeof color === "string" && color.trim()) body.color = color.trim();
  if (typeof size === "string" && size.trim()) body.size = size.trim();
  return apiFetch(CART_PRODUCTS_PATH(productId), {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteCartProduct({ productId, color, size }) {
  const body = {};
  if (typeof color === "string" && color.trim()) body.color = color.trim();
  if (typeof size === "string" && size.trim()) body.size = size.trim();
  return apiFetch(CART_PRODUCTS_PATH(productId), {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

export async function checkoutCart(payload) {
  return apiFetch(CART_CHECKOUT_PATH, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}
