import { getCart, setCart } from "./state.js";
import {
  fetchCart,
  addCartProduct,
  updateCartProduct,
  deleteCartProduct,
} from "./core/api.js";

export async function addToCart(payload) {
  const { id, image, color, colorName, size, qty = 1 } = payload || {};

  if (!id) throw new Error("addToCart: missing product id");
  const body = {};
  body.quantity = Number(qty);
  const chosenColor =
    typeof color === "string" && color.trim()
      ? color.trim()
      : typeof colorName === "string" && colorName.trim()
      ? colorName.trim()
      : "";
  if (chosenColor) body.color = chosenColor;
  if (typeof size === "string" && size.trim()) body.size = size.trim();
  await addCartProduct(id, body);
  const serverCart = await fetchCart();
  syncLocalCartFromServer(serverCart);
  return serverCart;
}

export async function updateQty(key, nextQty) {
  const cart = getCart();
  const idx = findIndexByKey(cart, key);
  if (idx < 0) return;
  const line = cart[idx];
  const q = Math.max(0, Math.floor(Number(nextQty || 0)));
  if (q === 0) {
    const del = { productId: Number(line.id) };
    if (typeof line.colorName === "string" && line.colorName.trim())
      del.color = line.colorName.trim();
    if (typeof line.size === "string" && line.size.trim())
      del.size = line.size.trim();
    await deleteCartProduct(del);
  } else {
    const upd = { productId: Number(line.id), quantity: q };
    if (typeof line.colorName === "string" && line.colorName.trim())
      upd.color = line.colorName.trim();
    if (typeof line.size === "string" && line.size.trim())
      upd.size = line.size.trim();
    await updateCartProduct(upd);
  }
  const serverCart = await fetchCart();
  syncLocalCartFromServer(serverCart);
}

export async function removeItem(key) {
  const cart = getCart();
  const idx = findIndexByKey(cart, key);
  if (idx < 0) return;
  const line = cart[idx];
  const del = { productId: Number(line.id) };
  if (typeof line.colorName === "string" && line.colorName.trim())
    del.color = line.colorName.trim();
  if (typeof line.size === "string" && line.size.trim())
    del.size = line.size.trim();
  await deleteCartProduct(del);
  const serverCart = await fetchCart();
  syncLocalCartFromServer(serverCart);
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

function syncLocalCartFromServer(serverCart) {
  const items =
    (Array.isArray(serverCart) && serverCart) ||
    (Array.isArray(serverCart?.items) && serverCart.items) ||
    (Array.isArray(serverCart?.data?.items) && serverCart.data.items) ||
    (Array.isArray(serverCart?.cart?.items) && serverCart.cart.items) ||
    (Array.isArray(serverCart?.data?.cart?.items) &&
      serverCart.data.cart.items) ||
    (Array.isArray(serverCart?.items?.data) && serverCart.items.data) ||
    [];

  const normalized = items.map((it) => {
    const id = Number(it.product_id ?? it.id);
    const title = it.title ?? it.name ?? "Product";
    const price = Number(it.price ?? 0);
    const image = it.image ?? it.cover_image ?? "";
    const colorName = it.color?.name ?? it.color_name ?? it.color ?? null;
    const colorId = it.color?.id ?? it.color_id ?? null;
    const size = it.size ?? null;
    const qty = Number(it.quantity ?? it.qty ?? 1);
    return { id, title, price, image, colorId, colorName, size, qty };
  });

  setCart(normalized);
  fireChanged(normalized);
}
export async function loadServerCart() {
  const serverCart = await fetchCart();
  syncLocalCartFromServer(serverCart);
}

export function keyOf(item) {
  return `${item.id}__${item.colorName ?? item.colorId ?? ""}__${
    item.size ?? ""
  }`;
}

export function findIndexByKey(cart, key) {
  const [id, colorKey, size] = key.split("__");
  return cart.findIndex(
    (it) =>
      String(it.id) === id &&
      String(it.colorName ?? it.colorId ?? "") === colorKey &&
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

export function clearCart() {
  setCart([]);
  window.dispatchEvent(
    new CustomEvent("cart:changed", { detail: { total: 0 } })
  );
}
