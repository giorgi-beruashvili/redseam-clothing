import { getCart } from "../state.js";
import {
  keyOf,
  updateQty,
  removeItem,
  getTotals,
  formatMoney,
} from "../cart.js";

export function initCartSidebar(opts = {}) {
  const sidebar = document.getElementById("cart-sidebar");
  const content = document.getElementById("cart-content");
  const checkoutBtn = sidebar.querySelector(".go-checkout");

  render();
  window.addEventListener("cart:changed", render);

  function render() {
    const items = getCart();
    if (items.length === 0) {
      content.innerHTML = `<div class="cart-empty"><strong>Uh-oh…</strong> you've got nothin’ in your cart just yet! <a class="start-shopping" href="#/">Start shopping →</a></div>`;
      setSummary(0, 0);
      checkoutBtn.disabled = true;
      return;
    }
    content.innerHTML = items.map(itemHTML).join("");
    const { totalQty, totalPrice } = getTotals();
    setSummary(totalQty, totalPrice);
    checkoutBtn.disabled = false;
  }

  function itemHTML(it) {
    const key = keyOf(it);
    const variant = [it.size ? `Size: ${escapeHTML(String(it.size))}` : null]
      .filter(Boolean)
      .join(" · ");
    return `
      <div class="cart-line" data-key="${escapeHTML(key)}">
        <img class="cart-thumb" src="${it.image || ""}" alt="${escapeHTML(
      it.title
    )}" onerror="this.style.display='none'"/>
        <div class="cart-info">
          <div class="cart-title">${escapeHTML(it.title)}</div>
          <div class="cart-variant">${variant}</div>
          <div class="cart-qty">
            <button class="qty-dec" aria-label="Decrease">−</button>
            <input class="qty-input" type="number" min="0" step="1" value="${Number(
              it.qty || 1
            )}"/>
            <button class="qty-inc" aria-label="Increase">+</button>
          </div>
        </div>
        <div class="cart-price">
          <div>${formatMoney(Number(it.price || 0) * Number(it.qty || 1))}</div>
          <button class="cart-remove">Remove</button>
        </div>
      </div>
    `;
  }

  content.addEventListener("click", onContentClick);
  content.addEventListener("input", onContentInput);

  function onContentClick(e) {
    const line = e.target.closest(".cart-line");
    if (!line) return;
    const key = line.dataset.key;
    if (e.target.closest(".qty-inc")) {
      const input = line.querySelector(".qty-input");
      const next = Math.max(0, Number(input.value || 0) + 1);
      updateQty(key, next);
      return;
    }
    if (e.target.closest(".qty-dec")) {
      const input = line.querySelector(".qty-input");
      const next = Math.max(0, Number(input.value || 0) - 1);
      updateQty(key, next);
      return;
    }
    if (e.target.closest(".cart-remove")) {
      removeItem(key);
      return;
    }
  }

  function onContentInput(e) {
    const input = e.target.closest(".qty-input");
    if (!input) return;
    const line = e.target.closest(".cart-line");
    const key = line.dataset.key;
    const value = Number(input.value || 0);
    if (Number.isFinite(value)) updateQty(key, value);
  }

  function setSummary(totalQty, subtotal) {
    const subtotalEl = document.getElementById("cart-subtotal");
    const deliveryEl = document.getElementById("cart-delivery");
    const totalEl = document.getElementById("cart-total");
    const countEl = document.getElementById("cart-count");
    const badgeEl = document.getElementById("cart-badge");

    const fee = totalQty > 0 ? readMoney(deliveryEl?.textContent) ?? 5 : 0;
    const total = totalQty > 0 ? subtotal + fee : 0;

    if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
    if (totalEl) totalEl.textContent = formatMoney(total);
    if (countEl) countEl.textContent = `(${totalQty})`;
    if (badgeEl) {
      if (totalQty > 0) {
        badgeEl.hidden = false;
        badgeEl.textContent = String(totalQty);
      } else {
        badgeEl.hidden = true;
        badgeEl.textContent = "0";
      }
    }
  }

  function readMoney(txt) {
    if (!txt) return null;
    const n = Number(String(txt).replace(/[^\d.-]+/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function escapeHTML(s) {
    return String(s).replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        }[m])
    );
  }
}
