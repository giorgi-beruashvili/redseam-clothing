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

  window.dispatchEvent(
    new CustomEvent("cart:changed", {
      detail: { total: cart.reduce((s, i) => s + (i.qty || 0), 0) },
    })
  );
}
