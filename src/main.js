import { runRouter } from "./router.js";
import { getSession, getTotalQty } from "./state.js";

function renderUserDisplay() {
  const mount = document.getElementById("user-display");
  const session = getSession();

  if (!session?.user) {
    mount.innerHTML = `
      <span class="user-avatar" aria-hidden="true"></span>
      <div>
        <div>Guest</div>
        <div style="font-size:12px;color:#666">Not signed in</div>
      </div>
    `;
    return;
  }

  const { username, email, avatarUrl } = session.user;
  mount.innerHTML = `
    <img class="user-avatar" src="${avatarUrl || ""}" alt="${
    username || "User"
  }" onerror="this.style.display='none'"/>
    <div>
      <div>${username || "User"}</div>
      <div style="font-size:12px;color:#666">${email || ""}</div>
    </div>
  `;
}

function setupCartToggle() {
  const btn = document.getElementById("cart-toggle");
  const sidebar = document.getElementById("cart-sidebar");
  const closeBtn = document.getElementById("cart-close");
  const backdrop = document.getElementById("backdrop");

  const open = () => {
    sidebar.classList.add("open");
    backdrop.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    sidebar.setAttribute("aria-hidden", "false");
  };

  const close = () => {
    sidebar.classList.remove("open");
    backdrop.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    sidebar.setAttribute("aria-hidden", "true");
  };

  btn.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
}

function renderCartBadge() {
  const badge = document.getElementById("cart-badge");
  const total = getTotalQty();
  if (total > 0) {
    badge.textContent = String(total);
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

function onRouteChange() {
  runRouter();
  renderUserDisplay();
  renderCartBadge();
}

window.addEventListener("DOMContentLoaded", () => {
  renderUserDisplay();
  renderCartBadge();
  setupCartToggle();
  onRouteChange();
});

window.addEventListener("hashchange", onRouteChange);

window.addEventListener("auth:changed", () => {
  renderUserDisplay();
});
