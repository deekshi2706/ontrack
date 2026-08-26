const API_BASE = '/api/applications';

const STAGES = [
  { id: 'WISHLIST', label: 'Wishlist', color: 'var(--grey)' },
  { id: 'APPLIED', label: 'Applied', color: 'var(--sky)' },
  { id: 'TEST', label: 'OA / Test', color: 'var(--violet)' },
  { id: 'INTERVIEW', label: 'Interview', color: 'var(--amber)' },
  { id: 'OFFER', label: 'Offer', color: 'var(--mint)' },
  { id: 'REJECTED', label: 'Rejected', color: 'var(--coral)' },
];

let apps = [];
let editingId = null;

const boardWrap = document.getElementById('boardWrap');
const statsEl = document.getElementById('stats');
const overlay = document.getElementById('overlay');
const searchEl = document.getElementById('search');

async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let msg = 'Request failed (' + res.status + ')';
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
    } catch (_) {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function loadApps() {
  boardWrap.innerHTML = `<div class="loading">Loading your board...</div>`;
  try {
    apps = await api('');
    render();
  } catch (e) {
    boardWrap.innerHTML = `<div class="empty-state">Couldn't reach the server. Is the app running? (${escapeHtml(e.message)})</div>`;
  }
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d - today) / 86400000);
}

function urgencyBadge(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return { cls: 'd-grey', text: 'No date', border: 'var(--grey)' };
  if (days < 0) return { cls: 'd-grey', text: 'Past', border: 'var(--grey)' };
  if (days === 0) return { cls: 'd-red', text: 'Today', border: 'var(--coral)' };
  if (days <= 3) return { cls: 'd-red', text: days + 'd left', border: 'var(--coral)' };
  if (days <= 7) return { cls: 'd-amber', text: days + 'd left', border: 'var(--amber)' };
  return { cls: 'd-green', text: days + 'd left', border: 'var(--mint)' };
}

function render() {
  const q = searchEl.value.trim().toLowerCase();
  const filtered = apps.filter(a =>
    !q || a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
  );

  const total = apps.length;
  const upcoming7 = apps.filter(a => { const d = daysUntil(a.deadline); return d !== null && d >= 0 && d <= 7; }).length;
  const offers = apps.filter(a => a.stage === 'OFFER').length;
  const urgent = apps.filter(a => { const d = daysUntil(a.deadline); return d !== null && d >= 0 && d <= 3; }).length;

  statsEl.innerHTML = `
    <div class="stat"><div class="num display">${total}</div><div class="lbl">Total applications</div></div>
    <div class="stat week"><div class="num display">${upcoming7}</div><div class="lbl">Due in 7 days</div></div>
    <div class="stat urgent"><div class="num display">${urgent}</div><div class="lbl">Urgent (≤3 days)</div></div>
    <div class="stat offer"><div class="num display">${offers}</div><div class="lbl">Offers</div></div>
  `;

  if (apps.length === 0) {
    boardWrap.innerHTML = `<div class="empty-state">No applications yet. Hit <strong>+ Add application</strong> to start tracking your first one.</div>`;
    return;
  }

  boardWrap.innerHTML = `<div class="board">${STAGES.map(stage => {
    const colApps = filtered.filter(a => a.stage === stage.id)
      .sort((a, b) => (daysUntil(a.deadline) ?? 9999) - (daysUntil(b.deadline) ?? 9999));
    return `
      <div class="col">
        <div class="col-head">
          <span class="col-title" style="color:${stage.color}">${stage.label}</span>
          <span class="col-count mono">${colApps.length}</span>
        </div>
        ${colApps.length === 0 ? `<div class="col-empty">Empty</div>` : colApps.map(a => {
          const b = urgencyBadge(a.deadline);
          return `
          <div class="card" style="border-left-color:${b.border}" data-id="${a.id}">
            <button class="del" data-del="${a.id}" title="Delete">✕</button>
            <p class="company">${escapeHtml(a.company)}</p>
            <p class="role">${escapeHtml(a.role)}</p>
            <div class="meta">
              <span class="badge ${b.cls} mono">${b.text}</span>
              ${a.notes ? '<span class="notes-flag">📝 notes</span>' : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }).join('')}</div>`;

  boardWrap.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.del')) return;
      openModal(card.dataset.id);
    });
  });
  boardWrap.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.del;
      try {
        await api('/' + id, { method: 'DELETE' });
        apps = apps.filter(a => String(a.id) !== String(id));
        render();
      } catch (err) {
        alert('Could not delete: ' + err.message);
      }
    });
  });
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

function openModal(id) {
  editingId = id || null;
  const stageSel = document.getElementById('f-stage');
  stageSel.innerHTML = STAGES.map(s => `<option value="${s.id}">${s.label}</option>`).join('');

  if (id) {
    const a = apps.find(x => String(x.id) === String(id));
    document.getElementById('modalTitle').textContent = 'Edit application';
    document.getElementById('f-company').value = a.company;
    document.getElementById('f-role').value = a.role;
    document.getElementById('f-stage').value = a.stage;
    document.getElementById('f-deadline').value = a.deadline || '';
    document.getElementById('f-link').value = a.link || '';
    document.getElementById('f-notes').value = a.notes || '';
  } else {
    document.getElementById('modalTitle').textContent = 'Add application';
    document.getElementById('f-company').value = '';
    document.getElementById('f-role').value = '';
    document.getElementById('f-stage').value = 'WISHLIST';
    document.getElementById('f-deadline').value = '';
    document.getElementById('f-link').value = '';
    document.getElementById('f-notes').value = '';
  }
  overlay.classList.add('show');
  document.getElementById('f-company').focus();
}

function closeModal() {
  overlay.classList.remove('show');
  editingId = null;
}

document.getElementById('addBtn').addEventListener('click', () => openModal(null));
document.getElementById('cancelBtn').addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

document.getElementById('saveBtn').addEventListener('click', async () => {
  const company = document.getElementById('f-company').value.trim();
  const role = document.getElementById('f-role').value.trim();
  if (!company || !role) {
    alert('Please fill in at least the company and role.');
    return;
  }
  const payload = {
    company,
    role,
    stage: document.getElementById('f-stage').value,
    deadline: document.getElementById('f-deadline').value || null,
    link: document.getElementById('f-link').value.trim(),
    notes: document.getElementById('f-notes').value.trim(),
  };

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  try {
    if (editingId) {
      const updated = await api('/' + editingId, { method: 'PUT', body: JSON.stringify(payload) });
      const idx = apps.findIndex(a => String(a.id) === String(editingId));
      apps[idx] = updated;
    } else {
      const created = await api('', { method: 'POST', body: JSON.stringify(payload) });
      apps.push(created);
    }
    closeModal();
    render();
  } catch (err) {
    alert('Could not save: ' + err.message);
  } finally {
    saveBtn.disabled = false;
  }
});

searchEl.addEventListener('input', render);

loadApps();
