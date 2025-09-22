export function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).toLowerCase());
}

export function minLen(v, n = 3) {
  return String(v || "").trim().length >= n;
}
