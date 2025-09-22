const AUTH_KEY = "redseam_auth";
const CART_KEY = "redseam_cart";

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY)) || null;
  } catch {
    return null;
  }
}

export function setSession(session) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}

export function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

export function setCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function getTotalQty() {
  return getCart().reduce((sum, it) => sum + (it.qty || 0), 0);
}
