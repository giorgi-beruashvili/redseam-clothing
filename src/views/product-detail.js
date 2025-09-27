import { fetchProductById } from "../core/api.js";
import { addToCart } from "../cart.js";
import { getCart } from "../state.js";

function mapProduct(raw) {
  const id = Number(raw?.id);
  const name = raw?.name ?? "Product";
  const description = raw?.description ?? "";
  const price = Number(raw?.price ?? 0);
  const brandName = raw?.brand?.name ?? "";
  const brandLogo = raw?.brand?.image ?? "";

  let images = Array.isArray(raw?.images) ? raw.images.filter(Boolean) : [];
  if (!images.length && raw?.cover_image) {
    images = [raw.cover_image];
  }

  const colors = Array.isArray(raw?.available_colors)
    ? raw.available_colors
    : [];
  const sizes = Array.isArray(raw?.available_sizes) ? raw.available_sizes : [];
  const release = raw?.release_date ?? raw?.release_year ?? null;

  return {
    id,
    name,
    description,
    price,
    brandName,
    brandLogo,
    images,
    colors,
    sizes,
    release,
  };
}

export function renderProductDetail(root, params) {
  const id = params?.id;

  root.innerHTML = `
    <section>
      <div class="meta" style="margin-bottom:8px;">Loading product…</div>
    </section>
  `;

  (async () => {
    try {
      const raw = await fetchProductById(id);
      const p = mapProduct(raw);

      let activeImageIdx = 0;
      let activeColor = p.colors?.[0] ?? null;
      let activeSize = p.sizes?.[0] ?? "";
      let qty = 1;
      const stock =
        Number.isFinite(Number(p.quantity)) && Number(p.quantity) > 0
          ? Number(p.quantity)
          : Infinity;
      let remaining = stock;

      root.innerHTML = `
        <section class="pd-wrap">
          <div class="pd-gallery">
            <img id="pd-main" class="pd-main" alt="" />
            <div id="pd-thumbs" class="pd-thumbs"></div>
          </div>
          <div class="pd-info">
            <div class="pd-title">${escapeHTML(p.name)}</div>
            <div class="pd-brand">
              ${
                p.brandLogo
                  ? `<img src="${p.brandLogo}" alt="${escapeHTML(
                      p.brandName
                    )}" onerror="this.style.display='none'"/>`
                  : ""
              }
              <span>${escapeHTML(p.brandName)}</span>
            </div>
            <div class="pd-price">$${p.price.toFixed(2)}</div>
            ${renderColors(p.colors, activeColor)}
            ${renderSizes(p.sizes, activeSize)}
            <div class="size-row" style="${
              p.sizes?.length ? "" : "display:none;"
            }">
            </div>
            <div class="qty-row">
              <label for="qty-input">Quantity</label>
              <input id="qty-input" type="number" min="1" step="1" value="1" />
            </div>
            <div class="pd-actions">
              <button id="add-to-cart" class="button">Add to cart</button>
              <span id="toast" class="toast">Added to cart</span>
            </div>
            <div class="pd-desc">${escapeHTML(p.description)}</div>
          </div>
        </section>
      `;

      const $ = (sel) => root.querySelector(sel);
      const mainImg = $("#pd-main");
      const thumbs = $("#pd-thumbs");
      const addBtn = $("#add-to-cart");
      const toast = $("#toast");
      const sizeSelect = $("#size-select");
      const qtyInput = $("#qty-input");
      let colorToImageIdx = new Map();
      recomputeStockCaps();
      applyQtyMaxAttr();

      thumbs.innerHTML = p.images
        .map(
          (src, idx) => `
          <img class="pd-thumb ${idx === 0 ? "active" : ""}"
               data-idx="${idx}"
               src="${src}"
               alt="thumb ${idx + 1}"
               onerror="this.style.display='none'"/>
        `
        )
        .join("");
      if (Array.isArray(p.colors) && Array.isArray(p.images)) {
        for (const c of p.colors) {
          const i = p.images.findIndex((u) => imageMatchesColor(u, c));
          if (i >= 0 && !colorToImageIdx.has(c)) {
            colorToImageIdx.set(c, i);
          }
        }
      }
      if (activeColor && colorToImageIdx.has(activeColor)) {
        activeImageIdx = colorToImageIdx.get(activeColor);
      } else if (activeColor) {
        const idxByColor = findImageIndexForColor(activeColor, p.images);
        if (idxByColor >= 0) activeImageIdx = idxByColor;
      }

      maybeToggleAddButton();
      setMainImage(activeImageIdx);

      thumbs.addEventListener("click", (e) => {
        const imgEl = e.target.closest(".pd-thumb");
        if (!imgEl) return;
        const idx = Number(imgEl.dataset.idx);
        if (!Number.isFinite(idx)) return;

        activeImageIdx = idx;
        setMainImage(activeImageIdx);

        const url = p.images[activeImageIdx] ?? "";
        const detected = (p.colors || []).find((c) =>
          imageMatchesColor(url, c)
        );
        if (detected) {
          activeColor = detected;
          updateActiveSwatch(activeColor);
          recomputeStockCaps();
          applyQtyMaxAttr();
          maybeToggleAddButton();
        }
      });

      root.addEventListener("click", (e) => {
        const sw = e.target.closest(".swatch");
        if (!sw) return;

        const chosen = sw.dataset.color;
        activeColor = chosen || null;
        updateActiveSwatch(activeColor);

        const idx = findImageIndexForColor(activeColor, p.images);
        if (idx >= 0) {
          activeImageIdx = idx;
          setMainImage(activeImageIdx);
        }
        recomputeStockCaps();
        applyQtyMaxAttr();
        maybeToggleAddButton();
      });

      sizeSelect?.addEventListener("change", () => {
        activeSize = sizeSelect.value || "";
        recomputeStockCaps();
        applyQtyMaxAttr();
        maybeToggleAddButton();
      });

      qtyInput?.addEventListener("input", () => {
        const n = Math.floor(Number(qtyInput.value));
        let next = Number.isFinite(n) && n > 0 ? n : 1;
        if (remaining !== Infinity && next > remaining) next = remaining;
        qty = next;
        qtyInput.value = String(qty);
      });

      window.addEventListener("cart:changed", () => {
        recomputeStockCaps();
        applyQtyMaxAttr();
        maybeToggleAddButton();
      });

      addBtn.addEventListener("click", () => {
        if (p.sizes?.length && !activeSize) return;
        if (remaining !== Infinity && remaining <= 0) return;
        if (remaining !== Infinity && qty > remaining) {
          qty = remaining;
          if (qtyInput) qtyInput.value = String(qty);
        }
        const imgUrl = p.images[activeImageIdx] || "";
        const colorName = activeColor || "Default";
        const finalSize = p.sizes?.length ? activeSize || "" : "OneSize";

        addToCart({
          id: p.id,
          image: imgUrl,
          qty,
          color: p.colors?.length ? activeColor || "" : undefined,
          size: p.sizes?.length ? finalSize || "" : undefined,
        });

        toast.classList.add("show");
        addBtn.disabled = true;
        setTimeout(() => {
          toast.classList.remove("show");
          addBtn.disabled = false;
        }, 800);
      });

      function setMainImage(idx) {
        mainImg.src = p.images[idx] || "";
        [...thumbs.children].forEach((el) => el.classList.remove("active"));
        const activeEl = thumbs.querySelector(`[data-idx="${idx}"]`);
        if (activeEl) activeEl.classList.add("active");
      }

      function updateActiveSwatch(colorValue) {
        const all = root.querySelectorAll(".swatch");
        all.forEach((el) => el.classList.remove("active"));
        const el = root.querySelector(
          `.swatch[data-color="${cssEscape(String(colorValue))}"]`
        );
        if (el) el.classList.add("active");
      }

      function maybeToggleAddButton() {
        addBtn.disabled = !!(p.sizes?.length && !activeSize);
        const needSize = !!(p.sizes?.length && !activeSize);
        const noStockForVariant = remaining !== Infinity && remaining <= 0;
        addBtn.disabled = needSize || noStockForVariant;
      }

      runAcceptanceChecks();

      function runAcceptanceChecks() {
        try {
          assertInitialSelection();
          assertQtyMin();
          assertColorSwitchUpdatesImageIfPossible();
          assertThumbClickSelectsColorIfDetectable();
          assertStockGuardIfAvailable();
          console.info("[PD-ACCEPT] basic checks passed");
        } catch (e) {
          console.warn("[PD-ACCEPT] check failed:", e?.message || e);
        }
      }

      function assertInitialSelection() {
        if (Array.isArray(p.colors) && p.colors.length > 0) {
          if (String(activeColor) !== String(p.colors[0])) {
            throw new Error("Initial color is not the first available color");
          }
        }
        if (Array.isArray(p.sizes) && p.sizes.length > 0) {
          if (String(activeSize) !== String(p.sizes[0])) {
            throw new Error("Initial size is not the first available size");
          }
        }
        if (Array.isArray(p.images) && p.images.length > 0) {
          const src = String(p.images[activeImageIdx] || "");
          if (!src) throw new Error("Main image not set");
        }
      }

      function assertQtyMin() {
        if (qty < 1) throw new Error("Qty must start at 1");
      }

      function assertColorSwitchUpdatesImageIfPossible() {
        if (!Array.isArray(p.colors) || p.colors.length < 2) return;
        if (!Array.isArray(p.images) || p.images.length === 0) return;

        const idxBefore = activeImageIdx;
        const prevColor = activeColor;

        let candidate = null;
        let mappedIdx = -1;
        for (const c of p.colors || []) {
          const i = findImageIndexForColor(c, p.images);
          if (i >= 0 && i !== idxBefore) {
            candidate = c;
            mappedIdx = i;
            break;
          }
        }

        if (!candidate) return;

        activeColor = candidate;
        updateActiveSwatch(activeColor);
        activeImageIdx = mappedIdx;
        setMainImage(activeImageIdx);

        if (
          activeImageIdx === idxBefore &&
          String(prevColor) !== String(activeColor)
        ) {
          throw new Error(
            "Color change did not update image despite detectable mapping"
          );
        }

        activeColor = prevColor;
        updateActiveSwatch(activeColor);
        setMainImage(idxBefore);
      }

      function assertThumbClickSelectsColorIfDetectable() {
        if (!Array.isArray(p.images) || p.images.length === 0) return;
        if (!Array.isArray(p.colors) || p.colors.length === 0) return;
        const candidateIdx = p.images.findIndex((u) =>
          p.colors.some((c) => imageMatchesColor(u, c))
        );
        if (candidateIdx < 0) return;
        const prevColor = activeColor;
        const url = p.images[candidateIdx];
        const detected = p.colors.find((c) => imageMatchesColor(url, c));
        activeImageIdx = candidateIdx;
        setMainImage(activeImageIdx);
        if (detected) {
          activeColor = detected;
          updateActiveSwatch(activeColor);
          if (String(activeColor) !== String(detected)) {
            throw new Error("Thumb click did not select detected color");
          }
        }
        activeColor = prevColor;
      }

      function assertStockGuardIfAvailable() {
        if (stock === Infinity) return;
        if (remaining < 0) throw new Error("remaining must not be negative");
        if (remaining === 0 && addBtn.disabled !== true) {
          throw new Error("Add button must be disabled when remaining = 0");
        }
      }

      function findImageIndexForColor(color, images) {
        if (!color || !Array.isArray(images)) return -1;
        if (colorToImageIdx instanceof Map && colorToImageIdx.has(color)) {
          return colorToImageIdx.get(color);
        }
        return images.findIndex((url) => imageMatchesColor(url, color));
      }

      function imageMatchesColor(url, color) {
        try {
          const file = String(url).toLowerCase().split("?")[0].split("#")[0];
          const name = file.split("/").pop() || "";
          const base = name.replace(/\.(png|jpe?g|webp|gif|svg)$/i, "");
          const tokens = base.split(/[_\-\s\.]+/).filter(Boolean); // word tokens
          const c = String(color).toLowerCase().trim();
          if (tokens.includes(c)) return true;
          if (
            tokens.some(
              (t) =>
                t === `dark${c}` ||
                t === `light${c}` ||
                t === `${c}dark` ||
                t === `${c}light`
            )
          ) {
            return true;
          }
          return false;
        } catch {
          return false;
        }
      }

      function recomputeStockCaps() {
        if (stock === Infinity) {
          remaining = Infinity;
          return;
        }
        const cart = getCart();
        const same = cart.find(
          (it) =>
            String(it.id) === String(p.id) &&
            String(it.colorId ?? "") === String(null) &&
            String(it.colorName ?? "") === String(activeColor ?? "") &&
            String(it.size ?? "") ===
              String(p.sizes?.length ? activeSize || "" : "OneSize")
        );
        const used = Number(same?.qty || 0);
        const left = stock - used;
        remaining = left > 0 ? left : 0;
        if (remaining !== Infinity && qty > remaining) {
          qty = remaining || 1;
          if (qtyInput) qtyInput.value = String(qty);
        }
      }

      function applyQtyMaxAttr() {
        if (!qtyInput) return;
        if (remaining === Infinity) {
          qtyInput.removeAttribute("max");
        } else {
          qtyInput.setAttribute("max", String(remaining));
        }
      }
    } catch (err) {
      root.innerHTML = `
        <section>
          <div class="meta" style="color:#b00020;">${
            err?.message || "Failed to load product"
          }</div>
        </section>
      `;
    }
  })();
}

function renderColors(colors = [], activeColor) {
  if (!Array.isArray(colors) || colors.length === 0) return "";
  return `
    <div>
      <div style="font-size:14px;margin-bottom:6px;">Color</div>
      <div class="swatches">
        ${colors
          .map((c) => {
            const isActive = String(c) === String(activeColor);
            return `<button class="swatch ${isActive ? "active" : ""}"
              data-color="${escapeHTML(String(c))}"
              title="${escapeHTML(String(c))}"
              aria-label="${escapeHTML(String(c))}">${escapeHTML(
              String(c)
            )}</button>`;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderSizes(sizes = [], activeSize = "") {
  if (!Array.isArray(sizes) || sizes.length === 0) return "";
  return `
    <div class="size-row">
      <label for="size-select">Size</label>
      <select id="size-select">
        ${sizes
          .map((s, i) => {
            const val = escapeHTML(String(s));
            const selected = (
              activeSize ? String(activeSize) === String(s) : i === 0
            )
              ? "selected"
              : "";
            return `<option value="${val}" ${selected}>${val}</option>`;
          })
          .join("")}
      </select>
    </div>
  `;
}

function escapeHTML(s) {
  return String(s).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[
        m
      ])
  );
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, (m) => "\\" + m);
}
