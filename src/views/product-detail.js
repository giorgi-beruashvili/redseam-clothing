export function renderProductDetail(root, params) {
  root.innerHTML = `
    <section>
      <h1>Product #${params.id}</h1>
      <p>Detail content will be here (Day 4)</p>
    </section>
  `;
}
