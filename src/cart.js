import { getCart, setCart } from "./state.js";

export function addToCart({
  id,
  title,
  price,
  image,
  colorId,
  colorName,
  size,
  qty = 1,
}) {
  const keyMatch = (it) =>
    String(it.id) === String(id) &&
    String(it.colorId ?? "") === String(colorId ?? "") &&
    String(it.size ?? "") === String(size ?? "");

  const cart = getCart();
  const idx = cart.findIndex(keyMatch);

  if (idx >= 0) {
    cart[idx].qty = Number(cart[idx].qty || 0) + Number(qty || 1);
  } else {
    cart.push({
      id,
      title,
      price,
      image,
      colorId,
      colorName,
      size,
      qty: Number(qty || 1),
    });
  }
  setCart(cart);
  fireChanged(cart);
}

export function updateQty(key, nextQty) {
  const cart = getCart();
  const idx = findIndexByKey(cart, key);
  if (idx < 0) return;
  const q = Math.max(0, Math.floor(Number(nextQty || 0)));
  if (q === 0) cart.splice(idx, 1);
  else cart[idx].qty = q;
  setCart(cart);
  fireChanged(cart);
}

export function removeItem(key) {
  const cart = getCart();
  const idx = findIndexByKey(cart, key);
  if (idx < 0) return;
  cart.splice(idx, 1);
  setCart(cart);
  fireChanged(cart);
}

export function getTotals() {
  const cart = getCart();
  const totalQty = cart.reduce((s, i) => s + (i.qty || 0), 0);
  const totalPrice = cart.reduce(
    (s, i) => s + Number(i.price || 0) * (i.qty || 0),
    0
  );
  return { totalQty, totalPrice };
}

export function keyOf(item) {
  return `${item.id}__${item.colorId ?? ""}__${item.size ?? ""}`;
}

export function findIndexByKey(cart, key) {
  const [id, colorId, size] = key.split("__");
  return cart.findIndex(
    (it) =>
      String(it.id) === id &&
      String(it.colorId ?? "") === colorId &&
      String(it.size ?? "") === size
  );
}

function fireChanged(cart) {
  const total = cart.reduce((s, i) => s + (i.qty || 0), 0);
  window.dispatchEvent(new CustomEvent("cart:changed", { detail: { total } }));
}

export function formatMoney(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}
