import { getCart } from "../state.js";
import { getTotals, formatMoney, clearCart } from "../cart.js";
import { checkoutCart } from "../core/api.js";

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).toLowerCase());
}
function req(v) {
  return String(v || "").trim().length > 0;
}

function isHumanName(v) {
  return /^[A-Za-z\u10A0-\u10FF' -]+$/.test(String(v).trim());
}
function isZip(v) {
  return /^\d{4,10}$/.test(String(v).trim());
}

export function renderCheckout(root) {
  const cart = getCart();
  const totals = getTotals();

  if (cart.length === 0) {
    root.innerHTML = `
      <section>
        <h1 style="margin-bottom:10px;">Checkout</h1>
        <div class="ck-summary" role="status" aria-live="polite">
          Your cart is empty. Please add items first.
        </div>
      </section>
    `;
    return;
  }

  const session = (() => {
    try {
      return JSON.parse(localStorage.getItem("redseam_auth")) || null;
    } catch {
      return null;
    }
  })();
  const preEmail = session?.user?.email || "";
  const token = session?.token || session?.access_token || "";

  root.innerHTML = `
    <section class="checkout-wrap">
      <div class="ck-summary">
        <div class="ck-h">Order summary</div>
        <div class="ck-list">
          ${cart.map(lineHTML).join("")}
        </div>
        <div class="ck-totals">
          <div class="row"><span>Items</span><span><strong>${
            totals.totalQty
          }</strong></span></div>
          <div class="row"><span>Subtotal</span><span><strong>${formatMoney(
            totals.totalPrice
          )}</strong></span></div>
          <div class="row grand"><span>Total</span><span>${formatMoney(
            totals.totalPrice
          )}</span></div>
        </div>
        <div class="actions">
            <button class="button" type="submit" form="ck-form">Pay</button>
            <span id="form-msg" class="help" aria-live="polite"></span>
        </div>
      </div>

      <div class="ck-form">
        <div class="ck-h">Shipping & Contact</div>
        <form id="ck-form" novalidate>
          <div class="grid-2">
            <div class="form-row">
              <label for="first">First name</label>
              <input id="first" name="first" autocomplete="given-name" />
              <div class="error" id="err-first"></div>
            </div>
            <div class="form-row">
              <label for="last">Last name</label>
              <input id="last" name="last" autocomplete="family-name" />
              <div class="error" id="err-last"></div>
            </div>
          </div>

          <div class="form-row">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" autocomplete="email" value="${escapeHTML(
              preEmail
            )}" />
            <div class="help">Prefilled from your account; you can edit.</div>
            <div class="error" id="err-email"></div>
          </div>

          <div class="grid-2">
            <div class="form-row">
              <label for="zip">ZIP</label>
              <input id="zip" name="zip" inputmode="numeric" />
              <div class="error" id="err-zip"></div>
            </div>
            <div class="form-row">
              <label for="address">Address</label>
              <input id="address" name="address" autocomplete="street-address" />
              <div class="error" id="err-address"></div>
            </div>
          </div>

        </form>
      </div>
    </section>

    <div id="ck-backdrop" class="modal-backdrop" hidden></div>
      <div id="ck-modal" class="modal success" role="dialog" aria-modal="true" aria-labelledby="ck-title" aria-hidden="true">
        <button id="ck-x" class="modal-close" aria-label="Close">
          ×
        </button>
        <div class="success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h2 id="ck-title">Congrats!</h2>
        <p class="sub">Your order is placed successfully!</p>
        <div class="actions" style="justify-content:center">
          <button id="ck-close" class="button button-primary">Continue shopping</button>
        </div>
      </div>
  `;

  const $ = (sel) => root.querySelector(sel);
  const form = $("#ck-form");
  const msg = $("#form-msg");
  const modal = $("#ck-modal");
  const backdrop = $("#ck-backdrop");
  const closeBtn = $("#ck-close");
  const xBtn = $("#ck-x");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    $("#err-first").textContent = "";
    $("#err-last").textContent = "";
    $("#err-email").textContent = "";
    $("#err-zip").textContent = "";
    $("#err-address").textContent = "";
    msg.textContent = "";

    const first = $("#first").value.trim();
    const last = $("#last").value.trim();
    const email = $("#email").value.trim();
    const zip = $("#zip").value.trim();
    const address = $("#address").value.trim();

    let ok = true;
    if (!req(first) || !isHumanName(first)) {
      $("#err-first").textContent =
        "Please enter a valid first name (letters only).";
      ok = false;
    }
    if (!req(last) || !isHumanName(last)) {
      $("#err-last").textContent =
        "Please enter a valid last name (letters only).";
      ok = false;
    }
    if (!isEmail(email)) {
      $("#err-email").textContent = "Invalid email format";
      ok = false;
    }
    if (!isZip(zip)) {
      $("#err-zip").textContent = "ZIP must be digits (e.g., 4600)";
      ok = false;
    }
    if (!req(address)) {
      $("#err-address").textContent = "Required";
      ok = false;
    }
    if (!ok) return;

    if (!token) {
      msg.textContent = "You must be logged in to checkout (401).";
      return;
    }

    try {
      msg.textContent = "Submitting…";
      await checkoutCart({
        name: first,
        surname: last,
        email,
        zip_code: zip,
        address,
      });

      clearCart();
      msg.textContent = "";

      openModal();
    } catch (err) {
      const status = err?.status;
      const payload = err?.payload;
      msg.textContent = "Checkout failed";
      if (status === 401) {
        msg.textContent = "401 Unauthorized – Invalid or missing token.";
        return;
      }
      if ((status === 422 || status === 400) && payload?.errors) {
        if (payload.errors.name?.[0])
          $("#err-first").textContent = payload.errors.name[0];
        if (payload.errors.surname?.[0])
          $("#err-last").textContent = payload.errors.surname[0];
        if (payload.errors.email?.[0])
          $("#err-email").textContent = payload.errors.email[0];
        if (payload.errors.zip_code?.[0])
          $("#err-zip").textContent = payload.errors.zip_code[0];
        if (payload.errors.address?.[0])
          $("#err-address").textContent = payload.errors.address[0];
        msg.textContent =
          payload.message || "Please fix the highlighted fields.";
      } else if (status === 400) {
        msg.textContent =
          payload?.message || "400 Bad request – please review your data.";
      }
    }
  });

  const goHome = () => {
    closeModal();
    location.hash = "#/";
  };
  closeBtn.addEventListener("click", goHome);
  xBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", closeModal);

  function openModal() {
    modal.classList.add("open");
    backdrop.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    backdrop.hidden = false;
    modal.hidden = false;
  }
  function closeModal() {
    modal.classList.remove("open");
    backdrop.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    backdrop.hidden = true;
    modal.hidden = true;
  }

  function lineHTML(it) {
    const variant = [
      it.colorName ? `Color: ${escapeHTML(it.colorName)}` : null,
      it.size ? `Size: ${escapeHTML(String(it.size))}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const lineTotal = Number(it.price || 0) * Number(it.qty || 1);
    return `
      <div class="ck-line">
        <img class="ck-thumb" src="${it.image || ""}" alt="${escapeHTML(
      it.title
    )}" onerror="this.style.display='none'"/>
        <div class="ck-info">
          <div class="ck-title">${escapeHTML(it.title)}</div>
          <div class="ck-variant">${variant}</div>
          <div class="help">Qty: ${it.qty}</div>
        </div>
        <div class="ck-line-total">${formatMoney(lineTotal)}</div>
      </div>
    `;
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
