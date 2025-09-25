import { parseHashQuery, setHashQuery } from "../utils/hash.js";
import { fetchProducts } from "../core/api.js";

const PAGE_SIZE = 10;

export function renderHome(root) {
  const q = parseHashQuery();
  const page = clampInt(q.page ? Number(q.page) : 1, 1);
  const allowedSorts = new Set(["newest", "price_asc", "price_desc"]);
  const sortRaw = q.sort;
  const sort = allowedSorts.has(sortRaw) ? sortRaw : null;

  const min = cleanNum(q.min);
  const max = cleanNum(q.max);

  root.innerHTML = `
    <section>
      <h1 style="margin-bottom:10px;">Products</h1>
      <div class="products-toolbar" id="toolbar">
        <div class="form-ctl">
          <label for="sort">Sort by</label>
          <select id="sort">
              <option value="" hidden disabled selected>Sort by</option>
              <option value="newest">New products first</option>
              <option value="price_asc">Price, low to high</option>
              <option value="price_desc">Price, high to low</option>
          </select>
        </div>
        <div class="form-ctl">
          <label for="min">Min</label>
          <input id="min" type="number" min="0" step="1" placeholder="0" />
        </div>
        <div class="form-ctl">
          <label for="max">Max</label>
          <input id="max" type="number" min="0" step="1" placeholder="9999" />
        </div>
        <button id="apply" class="button">Apply</button>
        <button id="clear" class="button button-secondary">Clear filters</button>
        <span id="list-meta" class="meta" aria-live="polite"></span>
      </div>
      <div id="grid" class="products-grid" aria-live="polite"></div>
      <nav id="pager" class="pagination" aria-label="Pagination"></nav>
    </section>
  `;

  const $ = (sel) => root.querySelector(sel);
  $("#sort").value = sort ?? "";
  if (min !== null) $("#min").value = String(min);
  if (max !== null) $("#max").value = String(max);

  loadProducts();

  $("#sort").addEventListener("change", () => {
    const v = $("#sort").value;
    setHashQuery({ page: 1, sort: v === "" ? undefined : v });
  });

  $("#apply").addEventListener("click", () => {
    const vMin = Number($("#min").value);
    const vMax = Number($("#max").value);
    if (Number.isFinite(vMin) && Number.isFinite(vMax) && vMin > vMax) {
      [$("#min").value, $("#max").value] = [String(vMax), String(vMin)];
    }

    const next = {
      page: 1,
      min: $("#min").value || undefined,
      max: $("#max").value || undefined,
    };
    setHashQuery(next);
    updateClearVisibility();
  });

  $("#clear")?.addEventListener("click", () => {
    $("#sort").value = "";
    $("#min").value = "";
    $("#max").value = "";
    setHashQuery({ page: 1, min: undefined, max: undefined });
    updateClearVisibility();
  });

  function updateClearVisibility() {
    const hasFilters = $("#min").value !== "" || $("#max").value !== "";
    const clearBtn = $("#clear");
    if (clearBtn) clearBtn.style.display = hasFilters ? "" : "none";
  }
  updateClearVisibility();

  function clampInt(n, minV) {
    if (!Number.isFinite(n) || n < minV) return minV;
    return Math.floor(n);
  }

  function cleanNum(v) {
    if (v === undefined) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
  }

  function pageFromUrl(u) {
    try {
      if (!u) return null;
      const p = new URL(u).searchParams.get("page");
      return p ? Number(p) : null;
    } catch {
      return null;
    }
  }

  async function loadProducts() {
    const grid = $("#grid");
    const pager = $("#pager");
    const meta = $("#list-meta");

    grid.innerHTML = '<div class="meta">Loading…</div>';
    pager.innerHTML = "";
    meta.textContent = "";

    try {
      const res = await fetchProducts({
        page,
        sort: sort ?? undefined,
        min,
        max,
      });
      const items = Array.isArray(res?.data) ? res.data : [];
      const currentPage = Number(res?.meta?.current_page) || page;
      const perPage = Number(res?.meta?.per_page) || PAGE_SIZE;
      const from = Number(res?.meta?.from) || (currentPage - 1) * perPage + 1;
      const to = Number(res?.meta?.to) || from - 1 + items.length;
      const lastPage = pageFromUrl(res?.links?.last);
      const totalPages = Number.isFinite(lastPage)
        ? lastPage
        : res?.links?.next
        ? currentPage + 1
        : currentPage;

      const total = Number(res?.meta?.total) || to;

      grid.innerHTML =
        items.map(cardHTML).join("") || `<div class="meta">No products</div>`;

      meta.textContent = `Showing ${from}–${to} of ${total} results`;

      renderPager(pager, currentPage, totalPages);
    } catch (err) {
      const msg =
        err?.payload?.message || err?.message || "Failed to load products";
      grid.innerHTML = `<div class="meta" style="color:#b00020;">${escapeHTML(
        msg
      )}</div>`;
    }
  }

  function cardHTML(p) {
    const id = p.id;
    const title = escapeHTML(p.name || "Product");
    const price = Number(p.price ?? 0).toFixed(2);
    const raw = p.cover_image || "";

    return `
    <article class="product-card" onclick="location.hash='#/product/${id}'">
      <img class="thumb" src="${raw}" alt="${title}" onerror="this.style.display='none'"/>
      <div class="info">
        <div class="title">${title}</div>
        <div class="price">$${price}</div>
      </div>
    </article>
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

  function renderPager(mount, current, totalPages) {
    const parts = [];
    const go = (n) => {
      const now = parseHashQuery();
      setHashQuery({ ...now, page: n });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const btn = (label, n, opts = {}) =>
      `<button class="page-btn" ${opts.current ? 'aria-current="page"' : ""} ${
        opts.disabled ? "disabled" : ""
      } ${
        opts.ellipsis ? 'data-ellipsis="true"' : ""
      } data-goto="${n}">${label}</button>`;

    parts.push(btn("«", Math.max(1, current - 1), { disabled: current <= 1 }));

    if (Number.isFinite(totalPages) && totalPages > 1) {
      const show = new Set(
        [
          1,
          2,
          totalPages - 1,
          totalPages,
          current - 1,
          current,
          current + 1,
        ].filter((n) => n >= 1 && n <= totalPages)
      );

      let last = 0;
      for (let i = 1; i <= totalPages; i++) {
        if (!show.has(i)) continue;
        if (i - last > 1)
          parts.push(btn("…", current, { ellipsis: true, disabled: true }));
        parts.push(btn(String(i), i, { current: i === current }));
        last = i;
      }
    } else {
      parts.push(btn(String(current), current, { current: true }));
    }

    parts.push(
      btn(
        "»",
        Number.isFinite(totalPages)
          ? Math.min(totalPages, current + 1)
          : current + 1,
        { disabled: Number.isFinite(totalPages) && current >= totalPages }
      )
    );

    mount.innerHTML = parts.join("");

    mount.addEventListener(
      "click",
      (e) => {
        const t = e.target.closest(".page-btn");
        if (!t || t.hasAttribute("disabled") || t.dataset.ellipsis) return;
        const n = Number(t.dataset.goto);
        if (!Number.isFinite(n)) return;
        if (Number.isFinite(totalPages) && (n < 1 || n > totalPages)) return;
        go(n);
      },
      { once: true }
    );
  }
}
