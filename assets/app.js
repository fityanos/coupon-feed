const appEl = document.getElementById('app');
const statsEl = document.getElementById('stats');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');

async function loadCoupons() {
  const res = await fetch('coupons.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch coupons.json: ${res.status}`);
  return res.json();
}

function render(data, query = '') {
  const q = query.trim().toLowerCase();
  const hosts = Object.keys(data).sort();
  let total = 0;
  const frag = document.createDocumentFragment();

  for (const host of hosts) {
    const list = data[host] || [];
    const filtered = q
      ? list.filter(c =>
          host.toLowerCase().includes(q) ||
          (c.code || '').toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q)
        )
      : list;

    if (filtered.length === 0) continue;
    total += filtered.length;

    const card = document.createElement('article');
    card.className = 'card';

    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `<span class="domain">${host}</span><span class="count">${filtered.length}</span>`;
    card.appendChild(header);

    for (const c of filtered) {
      const row = document.createElement('div');
      row.className = 'coupon';

      const left = document.createElement('div');
      left.innerHTML = `<div class="code" title="Copy">${(c.code || '').toString().slice(0, 40)}</div>` +
        (c.description ? `<div class="desc">${c.description}</div>` : '');

      const right = document.createElement('div');
      const rate = typeof c.successRate === 'number' ? Math.round(c.successRate * 100) : null;
      right.innerHTML = rate != null ? `<span class="rate">${rate}%</span>` : '';

      row.appendChild(left);
      row.appendChild(right);
      card.appendChild(row);
    }

    frag.appendChild(card);
  }

  appEl.innerHTML = '';
  appEl.appendChild(frag);
  statsEl.textContent = total ? `${total} coupons shown` : 'No results';

  if (total === 0) {
    appEl.innerHTML = '<div class="empty">No coupons found. Try clearing the search.</div>';
  }
}

async function init() {
  try {
    const data = await loadCoupons();
    render(data, searchInput.value);

    searchInput.addEventListener('input', () => render(data, searchInput.value));
    refreshBtn?.addEventListener('click', async () => {
      try {
        const fresh = await loadCoupons();
        render(fresh, searchInput.value);
      } catch (e) {
        console.error(e);
        alert('Failed to refresh coupons.json');
      }
    });
  } catch (e) {
    console.error(e);
    appEl.innerHTML = '<div class="empty">Failed to load coupons.json. Ensure it exists at the repo root.</div>';
  }
}

init();


