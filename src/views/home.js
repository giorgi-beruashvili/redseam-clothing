import { parseHashQuery, setHashQuery } from "../utils/hash.js";
import { fetchProducts } from "../core/api.js";

const PAGE_SIZE = 10;

export function renderHome(root) {
  const q = parseHashQuery();
  const page = clampInt(q.page ? Number(q.page) : 1, 1);
  const allowedSorts = new Set([
    "",
    "newest",
    "oldest",
    "price_asc",
    "price_desc",
  ]);
  const sortRaw = q.sort || "newest";
  const sort = allowedSorts.has(sortRaw) ? sortRaw : "newest";

  const min = cleanNum(q.min);
  const max = cleanNum(q.max);

  root.innerHTML = `
    <section>
      <h1 style="margin-bottom:10px;">Products</h1>

      <div class="products-toolbar" id="toolbar">
        <div class="form-ctl">
          <label for="sort">Sort</label>
          <select id="sort">
            <!-- WHY: ზუსტი მნიშვნელობები Scalar-ის მიხედვით -->
            <option value="">Default</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
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
        <span id="list-meta" class="meta" aria-live="polite"></span>
      </div>

      <div id="grid" class="products-grid" aria-live="polite"></div>

      <nav id="pager" class="pagination" aria-label="Pagination"></nav>
    </section>
  `;

  const $ = (sel) => root.querySelector(sel);
  $("#sort").value = sort;
  if (min !== null) $("#min").value = String(min);
  if (max !== null) $("#max").value = String(max);

  loadProducts();

  $("#apply").addEventListener("click", () => {
    const vMin = Number($("#min").value);
    const vMax = Number($("#max").value);
    if (Number.isFinite(vMin) && Number.isFinite(vMax) && vMin > vMax) {
      [$("#min").value, $("#max").value] = [String(vMax), String(vMin)];
    }

    const next = {
      page: 1,
      sort: $("#sort").value || undefined,
      min: $("#min").value || undefined,
      max: $("#max").value || undefined,
    };
    setHashQuery(next);
  });

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
      const res = await fetchProducts({ page, sort, min, max });
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

      grid.innerHTML =
        items.map(cardHTML).join("") || `<div class="meta">No products</div>`;
      meta.textContent = `Page ${currentPage}${
        Number.isFinite(totalPages) ? "/" + totalPages : ""
      } · showing ${from}–${to}`;

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
    const img = p.image || "";

    return `
      <article class="product-card">
        <img class="thumb" src="${img}" alt="${title}" onerror="this.style.display='none'"/>
        <div class="info">
          <div class="title">${title}</div>
          <div class="price">$${price}</div>
          <button class="open" onclick="location.hash='#/product/${id}'">View</button>
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
      setHashQuery({ page: n });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const btn = (label, n, { current = false, disabled = false } = {}) => {
      return `<button class="page-btn" ${
        current ? 'aria-current="page"' : ""
      } ${disabled ? "disabled" : ""} data-goto="${n}">${label}</button>`;
    };

    parts.push(btn("«", Math.max(1, current - 1), { disabled: current <= 1 }));

    if (Number.isFinite(totalPages)) {
      for (let i = 1; i <= totalPages; i++) {
        parts.push(btn(String(i), i, { current: i === current }));
      }
      parts.push(
        btn("»", Math.min(totalPages, current + 1), {
          disabled: current >= totalPages,
        })
      );
    } else {
      parts.push(btn(String(current), current, { current: true }));
      parts.push(btn("»", current + 1));
    }

    mount.innerHTML = parts.join("");

    mount.addEventListener(
      "click",
      (e) => {
        const target = e.target.closest(".page-btn");
        if (!target) return;
        const n = Number(target.dataset.goto);
        if (
          !Number.isFinite(n) ||
          n < 1 ||
          (Number.isFinite(totalPages) && n > totalPages)
        )
          return;
        go(n);
      },
      { once: true }
    );
  }
}
