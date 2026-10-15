let storage = {
  leads: JSON.parse(localStorage.getItem('sania_leads') || '[]'),
  clients: JSON.parse(localStorage.getItem('sania_clients') || '[]'),
  jobs: JSON.parse(localStorage.getItem('sania_jobs') || '[]'),
  quotes: JSON.parse(localStorage.getItem('sania_quotes') || '[]'),
  reminders: JSON.parse(localStorage.getItem('sania_reminders') || '[]')
};

function save() {
  localStorage.setItem('sania_leads', JSON.stringify(storage.leads));
  localStorage.setItem('sania_clients', JSON.stringify(storage.clients));
  localStorage.setItem('sania_jobs', JSON.stringify(storage.jobs));
  localStorage.setItem('sania_quotes', JSON.stringify(storage.quotes));
  localStorage.setItem('sania_reminders', JSON.stringify(storage.reminders));
  updateDashboard();
}

function showSection(id) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  renderAll();
}

function updateDashboard() {
  document.getElementById('leadCount').textContent = storage.leads.length;
  document.getElementById('clientCount').textContent = storage.clients.length;
  document.getElementById('jobCount').textContent = storage.jobs.filter(j => (j.status || '').toLowerCase() !== 'completed').length;
  document.getElementById('quoteCount').textContent = storage.quotes.filter(q => !['accepted','declined'].includes((q.status || '').toLowerCase())).length;
  const total = storage.quotes
    .filter(q => !['accepted','declined'].includes((q.status || '').toLowerCase()))
    .reduce((sum, q) => sum + (parseFloat(q.amount) || 0), 0);
  document.getElementById('quoteTotal').textContent = '$' + total.toLocaleString(undefined, {maximumFractionDigits:0});

  const upcoming = getUpcomingReminders();
  document.getElementById('reminderCount').textContent = upcoming.length;
}

function getUpcomingReminders(days = 30) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 86400000);
  return storage.reminders.filter(r => {
    if (!r.next) return false;
    const d = new Date(r.next);
    return d >= now && d <= cutoff;
  }).sort((a,b) => a.next.localeCompare(b.next));
}

function matches(item, q, status) {
  const text = JSON.stringify(item).toLowerCase();
  const qOk = !q || text.includes(q.toLowerCase());
  const sOk = !status || (item.status || '').toLowerCase() === status.toLowerCase();
  return qOk && sOk;
}

function badge(status) {
  if (!status) return '';
  const cls = status.toLowerCase().replace(/\s+/g, '');
  return `<span class="badge ${cls}">${status}</span>`;
}

function photoHtml(photo) {
  return photo ? `<img class="photo-thumb" src="${photo}" onclick="window.open(this.src)" alt="note">` : '';
}

function renderList(containerId, items, type) {
  const q = document.getElementById('searchBox')?.value || '';
  const status = document.getElementById('statusFilter')?.value || '';
  const filtered = items.filter(i => matches(i, q, status));
  const el = document.getElementById(containerId);
  el.innerHTML = filtered.length ? filtered.map(item => {
    const idx = items.indexOf(item);
    return `
      <div class="item">
        <div>
          <strong>${item.name || item.client || '—'}</strong>${badge(item.status)}<br>
          <small style="color:var(--muted)">${Object.entries(item).filter(([k]) => !['name','client','status','photo'].includes(k)).map(([k,v]) => `${k}: ${v || '—'}`).join(' • ')}</small>
          ${photoHtml(item.photo)}
        </div>
        <div>
          <button class="edit-btn" onclick="editItem('${type}', ${idx})">Edit</button>
          <button onclick="deleteItem('${type}', ${idx})">Delete</button>
        </div>
      </div>`;
  }).join('') : '<p>No matching records.</p>';
}

function renderReminders() {
  const el = document.getElementById('reminderList');
  el.innerHTML = storage.reminders.length ? storage.reminders.map((r, i) => `
    <div class="item">
      <div>
        <strong>${r.client}</strong> — ${r.service || 'Maintenance'}<br>
        <small>Next: ${r.next || '—'} • Every ${r.interval} months<br>${r.notes || ''}</small>
      </div>
      <div>
        <button class="edit-btn" onclick="markDoneReminder(${i})">Done / Next</button>
        <button onclick="deleteItem('reminders', ${i})">Delete</button>
      </div>
    </div>
  `).join('') : '<p>No reminders yet.</p>';

  const up = document.getElementById('upcomingReminders');
  const upcoming = getUpcomingReminders();
  up.innerHTML = upcoming.length ? upcoming.map(r => `
    <div class="reminder-item">
      <strong>${r.next}</strong> — ${r.client}: ${r.service || 'Maintenance'}
    </div>
  `).join('') : '<p>No reminders in the next 30 days.</p>';
}

function renderCalendar() {
  const el = document.getElementById('calendarView');
  const jobs = [...storage.jobs].filter(j => j.date).sort((a,b) => a.date.localeCompare(b.date));
  if (!jobs.length) { el.innerHTML = '<p>No dated jobs.</p>'; return; }
  const byDate = {};
  jobs.forEach(j => { (byDate[j.date] = byDate[j.date] || []).push(j); });
  el.innerHTML = Object.entries(byDate).map(([date, list]) => `
    <div class="cal-day">
      <strong>${date}</strong>
      ${list.map(j => `<div>• ${j.client || '—'} — ${j.type || ''} ${badge(j.status)}</div>`).join('')}
    </div>
  `).join('');
}

function renderAll() {
  renderList('leadList', storage.leads, 'leads');
  renderList('clientList', storage.clients, 'clients');
  renderList('jobList', storage.jobs, 'jobs');
  renderList('quoteList', storage.quotes, 'quotes');
  renderReminders();
  renderCalendar();
  updateDashboard();
}

function deleteItem(type, index) {
  if (!confirm('Delete this record?')) return;
  storage[type].splice(index, 1);
  save(); renderAll();
}

function editItem(type, index) {
  const item = storage[type][index];
  const newName = prompt('Name / Client:', item.name || item.client || '');
  if (newName === null) return;
  if (item.name !== undefined) item.name = newName; else item.client = newName;
  const notes = prompt('Notes:', item.notes || '');
  if (notes !== null) item.notes = notes;
  if (item.status !== undefined) {
    const st = prompt('Status:', item.status || '');
    if (st !== null) item.status = st;
  }
  if (item.amount !== undefined) {
    const amt = prompt('Amount:', item.amount || '');
    if (amt !== null) item.amount = amt;
  }
  save(); renderAll();
}

function markDoneReminder(index) {
  const r = storage.reminders[index];
  if (!r.next) return;
  const d = new Date(r.next);
  d.setMonth(d.getMonth() + parseInt(r.interval || 6));
  r.next = d.toISOString().slice(0,10);
  save(); renderAll();
}

async function readPhoto(input) {
  if (!input.files || !input.files[0]) return null;
  return new Promise(res => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.readAsDataURL(input.files[0]);
  });
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  localStorage.setItem('sania_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  document.getElementById('themeToggle').textContent = document.body.classList.contains('dark') ? 'Light Mode' : 'Dark Mode';
}

// Forms
document.getElementById('leadForm').onsubmit = async e => {
  e.preventDefault();
  const photo = await readPhoto(document.getElementById('leadPhoto'));
  storage.leads.push({
    name: document.getElementById('leadName').value,
    phone: document.getElementById('leadPhone').value,
    email: document.getElementById('leadEmail').value,
    source: document.getElementById('leadSource').value,
    service: document.getElementById('leadService').value,
    equipment: document.getElementById('leadEquipment').value,
    address: document.getElementById('leadAddress').value,
    notes: document.getElementById('leadNotes').value,
    owner: document.getElementById('leadOwner').value,
    photo
  });
  e.target.reset(); save(); renderAll();
};

document.getElementById('clientForm').onsubmit = async e => {
  e.preventDefault();
  const photo = await readPhoto(document.getElementById('clientPhoto'));
  storage.clients.push({
    name: document.getElementById('clientName').value,
    phone: document.getElementById('clientPhone').value,
    email: document.getElementById('clientEmail').value,
    address: document.getElementById('clientAddress').value,
    system: document.getElementById('clientSystem').value,
    notes: document.getElementById('clientNotes').value,
    photo
  });
  e.target.reset(); save(); renderAll();
};

document.getElementById('jobForm').onsubmit = async e => {
  e.preventDefault();
  const photo = await readPhoto(document.getElementById('jobPhoto'));
  storage.jobs.push({
    client: document.getElementById('jobClient').value,
    type: document.getElementById('jobType').value,
    date: document.getElementById('jobDate').value,
    status: document.getElementById('jobStatus').value,
    tech: document.getElementById('jobTech').value,
    notes: document.getElementById('jobNotes').value,
    photo
  });
  e.target.reset(); save(); renderAll();
};

document.getElementById('quoteForm').onsubmit = async e => {
  e.preventDefault();
  const photo = await readPhoto(document.getElementById('quotePhoto'));
  storage.quotes.push({
    client: document.getElementById('quoteClient').value,
    service: document.getElementById('quoteService').value,
    amount: document.getElementById('quoteAmount').value,
    status: document.getElementById('quoteStatus').value,
    notes: document.getElementById('quoteNotes').value,
    photo
  });
  e.target.reset(); save(); renderAll();
};

document.getElementById('reminderForm').onsubmit = e => {
  e.preventDefault();
  storage.reminders.push({
    client: document.getElementById('remClient').value,
    service: document.getElementById('remService').value,
    next: document.getElementById('remNext').value,
    interval: document.getElementById('remInterval').value,
    notes: document.getElementById('remNotes').value
  });
  e.target.reset(); save(); renderAll();
};

function exportAll() {
  function toCSV(arr, name) {
    if (!arr.length) return '';
    const keys = Object.keys(arr[0]).filter(k => k !== 'photo');
    const rows = [keys.join(','), ...arr.map(o => keys.map(k => `"${(o[k]||'').toString().replace(/"/g,'""')}"`).join(','))];
    return `=== ${name} ===\n` + rows.join('\n') + '\n\n';
  }
  const csv = toCSV(storage.leads,'Leads') + toCSV(storage.clients,'Clients') + toCSV(storage.jobs,'Jobs') + toCSV(storage.quotes,'Quotes') + toCSV(storage.reminders,'Reminders');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
  a.download = 'sania-marketing-export.csv';
  a.click();
}

// Init theme
if (localStorage.getItem('sania_theme') === 'dark') {
  document.body.classList.add('dark');
  document.getElementById('themeToggle').textContent = 'Light Mode';
}
renderAll();
showSection('dashboard');
