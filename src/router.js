import { renderHome } from "./views/home.js";
import { renderLogin } from "./views/login.js";
import { renderRegister } from "./views/register.js";
import { renderCheckout } from "./views/checkout.js";
import { renderProductDetail } from "./views/product-detail.js";

const routes = [
  { path: "^#/(\\?.*)?$", action: (root) => renderHome(root) },
  { path: "^#$/?$", action: (root) => renderHome(root) },
  { path: "^#/login(\\?.*)?$", action: (root) => renderLogin(root) },
  { path: "^#/register(\\?.*)?$", action: (root) => renderRegister(root) },
  { path: "^#/checkout(\\?.*)?$", action: (root) => renderCheckout(root) },
  {
    path: "^#/product/(\\d+)(\\?.*)?$",
    action: (root, m) => renderProductDetail(root, { id: m[1] }),
  },
];

export function runRouter() {
  const hash = location.hash || "#/";
  const root = document.getElementById("view-root");

  for (const r of routes) {
    const re = new RegExp(r.path);
    const match = hash.match(re);
    if (match) {
      r.action(root, match);
      return;
    }
  }

  location.hash = "#/";
}
