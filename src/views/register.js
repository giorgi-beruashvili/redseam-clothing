import { isEmail, minLen } from "../utils/validation.js";
import { registerUser, loginUser } from "../core/api.js";
import { setSession } from "../state.js";

export function renderRegister(root) {
  root.innerHTML = `
  <section class="auth-card" aria-labelledby="register-title">
    <h1 id="register-title">Registration</h1>

    <form id="register-form" novalidate>
      <div class="form-row">
        <label for="reg-username">Username *</label>
        <input id="reg-username" name="username" type="text" required minlength="3" />
        <div class="error" id="err-username"></div>
      </div>

      <div class="form-row">
        <label for="reg-email">Email *</label>
        <input id="reg-email" name="email" type="email" autocomplete="email" required />
        <div class="error" id="err-email"></div>
      </div>

      <div class="form-row">
        <label for="reg-password">Password *</label>
        <input id="reg-password" name="password" type="password" autocomplete="new-password" required minlength="3" />
        <button type="button" class="toggle-password" aria-label="Show password"></button>
        <div class="error" id="err-password"></div>
      </div>

      <div class="form-row">
        <label for="reg-confirm">Confirm password *</label>
        <input id="reg-confirm" name="confirm" type="password" autocomplete="new-password" required />
        <button type="button" class="toggle-password" aria-label="Show password"></button>
        <div class="error" id="err-confirm"></div>
      </div>

      <div class="form-row">
        <label for="reg-avatar">Avatar</label>
        <div class="inline">
          <input id="reg-avatar" name="avatar" type="file" accept="image/jpeg,image/png" />
          <img id="reg-preview" class="preview" alt="avatar preview" />
          <a href="#upload">Upload new</a>
          <a href="#remove">Remove</a>
        </div>
        <div class="error" id="err-avatar"></div>
      </div>

      <div class="actions">
        <button class="button" type="submit">Register</button>
        <a class="button ghost" href="#/login" role="button">Already member? Log in</a>
      </div>

      <div class="form-alert" id="register-alert" role="alert" aria-live="polite"></div>
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

  const form = $("#register-form");
  const alertBox = $("#register-alert");

  const $username = $("#reg-username");
  const $email = $("#reg-email");
  const $password = $("#reg-password");
  const $confirm = $("#reg-confirm");
  const $avatar = $("#reg-avatar");
  const $preview = $("#reg-preview");

  const submitBtn = root.querySelector('.actions .button[type="submit"]');
  const setBusy = (v) => {
    if (!submitBtn) return;
    submitBtn.disabled = !!v;
    submitBtn.setAttribute("aria-busy", v ? "true" : "false");
  };

  $avatar.addEventListener("change", () => {
    const file = $avatar.files?.[0];
    setErr("#err-avatar", "", $avatar);

    if (!file) {
      $preview.style.display = "none";
      $preview.src = "";
      return;
    }

    const okType = ["image/jpeg", "image/png"].includes(file.type);
    if (!okType) {
      setErr("#err-avatar", "Invalid file type", $avatar);
      $avatar.value = "";
      $preview.style.display = "none";
      $preview.src = "";
      return;
    }

    const url = URL.createObjectURL(file);
    $preview.src = url;
    $preview.style.display = "inline-block";
  });

  {
    const links = root.querySelectorAll(".inline a");
    const uploadLink = links[0];
    const removeLink = links[1];

    uploadLink?.addEventListener("click", (e) => {
      e.preventDefault();
      $avatar.click();
    });

    removeLink?.addEventListener("click", (e) => {
      e.preventDefault();
      $avatar.value = "";
      $preview.src = "";
      $preview.style.display = "none";
      setErr("#err-avatar", "", $avatar);
    });
  }

  root.querySelectorAll(".toggle-password").forEach((btn) => {
    const input = btn.previousElementSibling;
    btn.addEventListener("click", () => {
      if (!input || !(input instanceof HTMLInputElement)) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    setErr("#err-username", "", $username);
    setErr("#err-email", "", $email);
    setErr("#err-password", "", $password);
    setErr("#err-confirm", "", $confirm);
    setErr("#err-avatar", "", $avatar);
    setText(alertBox, "");
    alertBox.style.display = "none";

    const username = $username.value.trim();
    const email = $email.value.trim().toLowerCase();
    const password = $password.value.trim();
    const confirm = $confirm.value.trim();
    const avatarFile = $avatar.files?.[0] || null;

    let ok = true;
    if (!minLen(username, 3)) {
      setErr("#err-username", "Min length is 3", $username);
      ok = false;
    }
    if (!isEmail(email) || !minLen(email, 3)) {
      setErr("#err-email", "Invalid email format", $email);
      ok = false;
    }
    if (!minLen(password, 3)) {
      setErr(
        "#err-password",
        "Password must be at least 3 characters",
        $password
      );
      ok = false;
    }
    if (!confirm || confirm !== password) {
      setErr("#err-confirm", "Passwords do not match", $confirm);
      ok = false;
    }

    if (avatarFile && !["image/jpeg", "image/png"].includes(avatarFile.type)) {
      setErr("#err-avatar", "Invalid file type", $avatar);
      ok = false;
    }

    if (!ok) return;

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("username", username);
      fd.append("email", email);
      fd.append("password", password);
      fd.append("password_confirmation", confirm);
      if (avatarFile) fd.append("avatar", avatarFile);

      const regRes = await registerUser(fd);

      if (regRes?.token && regRes?.user) {
        setSession({ token: regRes.token, user: regRes.user });
        location.hash = "#/login";
        return;
      }

      try {
        const loginRes = await loginUser({ email, password });
        if (loginRes?.token && loginRes?.user) {
          setSession({ token: loginRes.token, user: loginRes.user });
          location.hash = "#/";
          return;
        }
      } catch (_) {}

      location.hash = "#/login";
    } catch (err) {
      const errs = err?.payload?.errors || {};
      if (errs.username?.[0])
        setErr("#err-username", errs.username[0], $username);
      if (errs.email?.[0]) setErr("#err-email", errs.email[0], $email);
      if (errs.password?.[0])
        setErr("#err-password", errs.password[0], $password);
      if (errs.password_confirmation?.[0])
        setErr("#err-confirm", errs.password_confirmation[0], $confirm);
      if (errs.avatar?.[0]) setErr("#err-avatar", errs.avatar[0], $avatar);

      setText(alertBox, err?.message || "Registration failed");
      alertBox.style.display = "block";
    } finally {
      setBusy(false);
    }
  });
}
