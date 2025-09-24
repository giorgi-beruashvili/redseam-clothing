export function parseHashQuery() {
  const hash = location.hash || "#/";
  const qIndex = hash.indexOf("?");
  if (qIndex === -1) return {};
  const qs = hash.slice(qIndex + 1);
  const params = new URLSearchParams(qs);
  const out = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

export function setHashQuery(updates = {}, { replace = false } = {}) {
  const hash = location.hash || "#/";
  const base = hash.split("?")[0];
  const params = new URLSearchParams(parseHashQuery());
  Object.entries(updates).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") params.delete(k);
    else params.set(k, String(v));
  });
  const next = `${base}${params.toString() ? "?" + params.toString() : ""}`;
  if (replace) location.replace(next);
  else location.hash = next;
}
