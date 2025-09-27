import { isEmail, minLen } from "../utils/validation.js";
import { loginUser } from "../core/api.js";
import { setSession } from "../state.js";

export function renderLogin(root) {
  root.innerHTML = `
  <section class="auth-card" aria-labelledby="login-title">
    <h1 id="login-title">Log in</h1>

    <form id="login-form" novalidate>
      <div class="form-row">
        <label for="login-email">Email *</label>
        <input id="login-email" name="email" type="email" autocomplete="email" required minlength="3" />
        <div class="error" id="err-email"></div>
      </div>

      <div class="form-row">
        <label for="login-password">Password *</label>
        <input id="login-password" name="password" type="password" autocomplete="current-password" required minlength="3" />
        <button type="button" class="toggle-password" aria-label="Show password"></button>
        <div class="error" id="err-password"></div>
      </div>

      <div class="actions">
        <button class="button" type="submit">Log in</button>
      </div>

      <p class="button ghost">Not a member? <a href="#/register">Register</a></p>

      <div class="form-alert" id="login-alert" role="alert" aria-live="polite" hidden></div>
    </form>
  </section>
`;

  const $ = (sel) => root.querySelector(sel);
  const setText = (el, msg = "") => {
    if (el) el.textContent = msg;
  };
  function setErr(selector, msg, inputEl) {
    const node = typeof selector === "string" ? $(selector) : selector;
    setText(node, msg || "");
    if (inputEl) {
      if (msg) inputEl.setAttribute("aria-invalid", "true");
      else inputEl.removeAttribute("aria-invalid");
    }
  }

  const form = $("#login-form");
  const alertBox = $("#login-alert");
  const $email = $("#login-email");
  const $password = $("#login-password");
  const submitBtn = root.querySelector('.actions .button[type="submit"]');
  const setBusy = (v) => {
    if (!submitBtn) return;
    submitBtn.disabled = !!v;
    submitBtn.setAttribute("aria-busy", v ? "true" : "false");
  };

  {
    const btn = root.querySelector(".toggle-password");
    const input = btn?.previousElementSibling;
    btn?.addEventListener("click", () => {
      if (!input || !(input instanceof HTMLInputElement)) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  }

  $email.addEventListener("input", () => setErr("#err-email", "", $email));
  $password.addEventListener("input", () =>
    setErr("#err-password", "", $password)
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (submitBtn?.disabled) return;

    setErr("#err-email", "", $email);
    setErr("#err-password", "", $password);
    setText(alertBox, "");
    alertBox.hidden = true;

    const email = $email.value.trim().toLowerCase();
    const password = $password.value;
    let ok = true;
    let firstInvalid = null;

    if (!minLen(email, 3) || !isEmail(email)) {
      setErr("#err-email", "Invalid email format", $email);
      ok = false;
      firstInvalid ||= $email;
    }
    if (!minLen(password, 3)) {
      setErr(
        "#err-password",
        "Password must be at least 3 characters",
        $password
      );
      ok = false;
      firstInvalid ||= $password;
    }
    if (!ok) {
      firstInvalid?.focus();
      return;
    }

    setBusy(true);
    try {
      const data = await loginUser({ email, password });
      const token =
        data?.token ??
        data?.access_token ??
        data?.data?.token ??
        data?.data?.access_token;
      const user = data?.user ?? data?.data?.user ?? null;

      if (!token) {
        throw new Error("Invalid server response: missing token");
      }
      setSession({ token, user });
      location.hash = "#/";
    } catch (err) {
      const errs = err?.payload?.errors || {};
      if (errs.email?.[0]) setErr("#err-email", errs.email[0], $email);
      if (errs.password?.[0])
        setErr("#err-password", errs.password[0], $password);

      setText(
        alertBox,
        err?.payload?.message || err?.message || "Login failed"
      );
      alertBox.hidden = false;
    } finally {
      setBusy(false);
    }
  });
}
