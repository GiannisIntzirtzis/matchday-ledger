const SUPABASE_URL = "https://edhtzvgfuejcfniyqygn.supabase.co"
const SUPABASE_KEY = "sb_publishable_wB6KHsy5IemEod00mKHjPQ_Tg7vWPU1"
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

const COMPETITION_GROUPS = {
  'Φιλικά Παιχνίδια': ['Φιλικό Παιχνίδι'],
  'Ανδρικό': ["A' Αθηνών", "Β' Αθηνών", "Γ' Αθηνών"],
  'Υποδομές': ['Κ17', 'Κ16', 'Κ15', 'Κ14', 'Κ13', 'Κ12', 'Κ11'],
  'Κύπελλο': ['Κύπελλο ΕΠΣΑ'],
};

function getWithholdingRate(category) {
  return category === 'Φιλικά Παιχνίδια' ? 0 : 0.10;
}

/* ---------------- Auth ---------------- */

let currentUser = null;
let authMode = 'signin';

const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app-screen');
const authForm = document.getElementById('auth-form');
const authError = document.getElementById('auth-error');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authToggleLabel = document.getElementById('auth-toggle-label');
const authSubmitBtn = document.getElementById('auth-submit-btn');

function showApp() {
  authScreen.hidden = true;
  appScreen.hidden = false;
  loadFixtures();
}

function showAuth() {
  authScreen.hidden = false;
  appScreen.hidden = true;
}

authToggleBtn.addEventListener('click', () => {
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  authSubmitBtn.textContent = authMode === 'signin' ? 'Σύνδεση' : 'Εγγραφή';
  authToggleBtn.textContent = authMode === 'signin' ? 'Εγγραφή' : 'Σύνδεση';
  authToggleLabel.textContent = authMode === 'signin' ? 'Δεν έχεις λογαριασμό;' : 'Έχεις ήδη λογαριασμό;';
  authError.textContent = '';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';

  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  let result;
  if (authMode === 'signin') {
    result = await client.auth.signInWithPassword({ email, password });
  } else {
    result = await client.auth.signUp({ email, password });
  }

  if (result.error) {
    authError.textContent = result.error.message;
    return;
  }

  if (authMode === 'signup') {
    authError.textContent = 'Ο λογαριασμός δημιουργήθηκε — μπορείς να συνδεθείς τώρα.';
    authMode = 'signin';
    authSubmitBtn.textContent = 'Σύνδεση';
    return;
  }

  currentUser = result.data.user;
  showApp();
});

document.getElementById('btn-sign-out').addEventListener('click', async () => {
  await client.auth.signOut();
  currentUser = null;
  showAuth();
});

async function checkSession() {
  const { data } = await client.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    showApp();
  } else {
    showAuth();
  }
}

checkSession();

/* ---------------- Drawer: κατηγορία -> διοργάνωση ---------------- */

const fCategory = document.getElementById('f-category');
const fCompetition = document.getElementById('f-competition');

function populateCompetitions(category, selectedValue = '') {
  if (!category) {
    fCompetition.innerHTML = '<option value="" disabled selected>-- Πρώτα επίλεξε κατηγορία --</option>';
    fCompetition.disabled = true;
    return;
  }

  const options = COMPETITION_GROUPS[category] || [];
  fCompetition.innerHTML =
    '<option value="" disabled' + (selectedValue ? '' : ' selected') + '>-- Επίλεξε διοργάνωση --</option>' +
    options.map(c => `<option value="${c}" ${c === selectedValue ? 'selected' : ''}>${c}</option>`).join('');
  fCompetition.disabled = false;
}

fCategory.addEventListener('change', () => {
  populateCompetitions(fCategory.value);
  updateWithholdingPreview();
});

/* ---------------- Drawer: κράτηση 10% preview ---------------- */

const feeInput = document.getElementById('f-fee');
const withholdingInput = document.getElementById('f-withholding');

function updateWithholdingPreview() {
  const fee = Number(feeInput.value) || 0;
  const rate = getWithholdingRate(fCategory.value);
  withholdingInput.value = `€${(fee * rate).toFixed(2)}`;
}

feeInput.addEventListener('input', updateWithholdingPreview);

/* ---------------- Drawer: open / close ---------------- */

const drawerBackdrop = document.getElementById('drawer-backdrop');
const fixtureForm = document.getElementById('fixture-form');
let editingId = null;

function openDrawer(fixture = null) {
  editingId = fixture ? fixture.id : null;
  document.getElementById('drawer-title').textContent = fixture ? 'Επεξεργασία αγώνα' : 'Νέος αγώνας';
  document.getElementById('btn-delete-fixture').hidden = !fixture;

  if (fixture) {
    document.getElementById('f-category').value = fixture.category || '';
    populateCompetitions(fixture.category, fixture.competition);
    document.getElementById('f-date').value = fixture.date || '';
    document.getElementById('f-venue').value = fixture.venue || '';
    document.getElementById('f-role').value = fixture.role || 'Διαιτητής';
    document.getElementById('f-home').value = fixture.home_team || '';
    document.getElementById('f-away').value = fixture.away_team || '';
    document.getElementById('f-result').value = fixture.result || '';
    document.getElementById('f-fee').value = fixture.fee ?? 0;
    document.getElementById('f-expense').value = fixture.travel_expense ?? 0;
    document.getElementById('f-self-rating').value = fixture.self_rating ?? '';
    document.getElementById('f-observer-rating').value = fixture.observer_rating ?? '';
    document.getElementById('f-yellow').value = fixture.yellow_cards ?? 0;
    document.getElementById('f-red').value = fixture.red_cards ?? 0;
    document.getElementById('f-player-name').value = fixture.player_name || '';
    document.getElementById('f-player-team').value = fixture.player_team || '';
    document.getElementById('f-impression').value = fixture.impression || '';
  } else {
    populateCompetitions('');
  }

  updateWithholdingPreview();
  updatePhotoSectionVisibility();
  if (fixture) loadPhotoGallery(fixture);
  drawerBackdrop.hidden = false;
  requestAnimationFrame(() => drawerBackdrop.classList.add('is-open'));
}

function closeDrawer() {
  drawerBackdrop.classList.remove('is-open');
  editingId = null;
  setTimeout(() => {
    drawerBackdrop.hidden = true;
    fixtureForm.reset();
  }, 250);
}

document.getElementById('btn-add-match').addEventListener('click', () => openDrawer());
document.getElementById('btn-empty-add').addEventListener('click', () => openDrawer());
document.getElementById('btn-cancel-fixture').addEventListener('click', closeDrawer);
document.getElementById('drawer-close').addEventListener('click', closeDrawer);

/* ---------------- Drawer: save (insert/update) ---------------- */

fixtureForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newFixture = {
    user_id: currentUser.id,
    category: document.getElementById('f-category').value,
    date: document.getElementById('f-date').value || null,
    competition: document.getElementById('f-competition').value,
    venue: document.getElementById('f-venue').value,
    role: document.getElementById('f-role').value,
    home_team: document.getElementById('f-home').value,
    away_team: document.getElementById('f-away').value,
    result: document.getElementById('f-result').value,
    fee: Number(document.getElementById('f-fee').value) || 0,
    travel_expense: Number(document.getElementById('f-expense').value) || 0,
    self_rating: document.getElementById('f-self-rating').value || null,
    observer_rating: document.getElementById('f-observer-rating').value || null,
    yellow_cards: Number(document.getElementById('f-yellow').value) || 0,
    red_cards: Number(document.getElementById('f-red').value) || 0,
    player_name: document.getElementById('f-player-name').value,
    player_team: document.getElementById('f-player-team').value,
    impression: document.getElementById('f-impression').value,
  };

  let error;
  if (editingId) {
    ({ error } = await client.from('fixtures').update(newFixture).eq('id', editingId));
  } else {
    ({ error } = await client.from('fixtures').insert(newFixture));
  }

  if (error) {
    alert('Αποτυχία αποθήκευσης: ' + error.message);
    return;
  }

  closeDrawer();
  loadFixtures();
});

document.getElementById('btn-delete-fixture').addEventListener('click', async () => {
  if (!editingId) return;
  const confirmed = confirm('Διαγραφή αυτού του αγώνα; Δεν μπορεί να αναιρεθεί.');
  if (!confirmed) return;

  const { error } = await client.from('fixtures').delete().eq('id', editingId);
  if (error) {
    alert('Αποτυχία διαγραφής: ' + error.message);
    return;
  }
  closeDrawer();
  loadFixtures();
});

/* ---------------- Load + render ---------------- */

let fixturesData = [];

async function loadFixtures() {
  const { data, error } = await client
    .from('fixtures')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Αποτυχία φόρτωσης:', error.message);
    return;
  }

  fixturesData = data;
  renderKpis(fixturesData);
  renderTable(fixturesData);
  renderCharts(fixturesData);
}

function renderKpis(rows) {
  const totalFee = rows.reduce((sum, f) => sum + Number(f.fee || 0), 0);
  const totalExpense = rows.reduce((sum, f) => sum + Number(f.travel_expense || 0), 0);
  const totalWithholding = rows.reduce((sum, f) => sum + Number(f.fee || 0) * getWithholdingRate(f.category), 0);
  const netProfit = totalFee - totalWithholding - totalExpense;

  document.getElementById('kpi-hero-net').textContent = `€${netProfit.toFixed(2)}`;

  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi"><div class="kpi-label">Καταγεγραμμένοι αγώνες</div><div class="kpi-value">${rows.length}</div></div>
    <div class="kpi accent-grass"><div class="kpi-label">Αμοιβές</div><div class="kpi-value">€${totalFee.toFixed(2)}</div></div>
    <div class="kpi"><div class="kpi-label">Σύνολο κρατήσεων</div><div class="kpi-value">€${totalWithholding.toFixed(2)}</div></div>
    <div class="kpi"><div class="kpi-label">Έξοδα μετακίνησης</div><div class="kpi-value">€${totalExpense.toFixed(2)}</div></div>
    <div class="kpi accent-grass"><div class="kpi-label">Καθαρό κέρδος</div><div class="kpi-value">€${netProfit.toFixed(2)}</div></div>
  `;
}

function renderTable(rows) {
  const body = document.getElementById('ledger-body');
  const empty = document.getElementById('empty-state');

  if (rows.length === 0) {
    body.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  body.innerHTML = rows.map(f => {
    const fee = Number(f.fee || 0);
    const net = fee - (fee * getWithholdingRate(f.category)) - Number(f.travel_expense || 0);
    return `
      <tr data-id="${f.id}" style="cursor:pointer">
        <td>${f.date || '—'}</td>
        <td>${f.competition || '—'}</td>
        <td>${f.home_team || '?'} vs ${f.away_team || '?'}</td>
        <td>${f.role || '—'}</td>
        <td>€${fee.toFixed(2)}</td>
        <td>€${net.toFixed(2)}</td>
        <td>${f.self_rating ?? '—'}</td>
        <td>${f.observer_rating ?? '—'}</td>
        <td>${f.yellow_cards || 0}Κ / ${f.red_cards || 0}Ε</td>
        <td></td>
      </tr>
    `;
  }).join('');

  body.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => {
      const fixture = fixturesData.find(f => f.id === row.dataset.id);
      openDrawer(fixture);
    });
  });
}

/* ---------------- Charts ---------------- */

let chartProfit, chartCompetition, chartRole;

function renderCharts(rows) {
  renderProfitChart(rows);
  renderCompetitionChart(rows);
  renderRoleChart(rows);
}

function renderProfitChart(rows) {
  const byMonth = {};
  rows.forEach(f => {
    if (!f.date) return;
    const month = f.date.slice(0, 7);
    const fee = Number(f.fee || 0);
    const net = fee - (fee * getWithholdingRate(f.category)) - Number(f.travel_expense || 0);
    byMonth[month] = (byMonth[month] || 0) + net;
  });

  const months = Object.keys(byMonth).sort();
  const values = months.map(m => byMonth[m]);

  if (chartProfit) chartProfit.destroy();
  chartProfit = new Chart(document.getElementById('chart-profit'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [{ label: 'Καθαρό κέρδος (€)', data: values, borderColor: '#2E8B57', tension: 0.3 }]
    }
  });
}

function renderCompetitionChart(rows) {
  const allCompetitions = Object.values(COMPETITION_GROUPS).flat();
  const counts = {};
  allCompetitions.forEach(c => counts[c] = 0);
  rows.forEach(f => {
    if (counts.hasOwnProperty(f.competition)) counts[f.competition]++;
  });

  if (chartCompetition) chartCompetition.destroy();
  chartCompetition = new Chart(document.getElementById('chart-competition'), {
    type: 'bar',
    data: {
      labels: allCompetitions,
      datasets: [{ label: 'Αγώνες', data: allCompetitions.map(c => counts[c]), backgroundColor: '#2E8B57' }]
    },
    options: {
      scales: { x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 60 } } }
    }
  });
}

function renderRoleChart(rows) {
  const counts = {};
  rows.forEach(f => {
    const role = f.role || 'Άγνωστο';
    counts[role] = (counts[role] || 0) + 1;
  });

  if (chartRole) chartRole.destroy();
  chartRole = new Chart(document.getElementById('chart-role'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: ['#2E8B57', '#E8B923', '#C23B3B', '#6B8FA3', '#8A6BB1'] }]
    }
  });
}
/* ---------------- Φωτογραφίες φύλλου αγώνα ---------------- */

const fRole = document.getElementById('f-role');
const photoSection = document.getElementById('photo-section');
const photoInput = document.getElementById('f-photos');
const photoGallery = document.getElementById('photo-gallery');

function updatePhotoSectionVisibility() {
  const isReferee = fRole.value === 'Διαιτητής';
  photoSection.hidden = !isReferee;

  if (isReferee && !editingId) {
    photoGallery.innerHTML = '<p style="color:var(--chalk-faint);font-size:12px;">Αποθήκευσε πρώτα τον αγώνα για να προσθέσεις φωτογραφίες.</p>';
    photoInput.disabled = true;
  } else {
    photoInput.disabled = false;
  }
}

fRole.addEventListener('change', updatePhotoSectionVisibility);

async function loadPhotoGallery(fixture) {
  photoGallery.innerHTML = '';
  const paths = fixture.photo_paths || [];

  for (const path of paths) {
    const { data, error } = await client.storage.from('fixture-photos').createSignedUrl(path, 3600);
    if (error || !data) continue;

    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    thumb.innerHTML = `<img src="${data.signedUrl}"><button type="button" title="Διαγραφή">&times;</button>`;
    thumb.querySelector('button').addEventListener('click', () => deletePhoto(path));
    photoGallery.appendChild(thumb);
  }
}

async function deletePhoto(path) {
  const confirmed = confirm('Διαγραφή αυτής της φωτογραφίας;');
  if (!confirmed) return;

  await client.storage.from('fixture-photos').remove([path]);

  const fixture = fixturesData.find(f => f.id === editingId);
  const newPaths = (fixture.photo_paths || []).filter(p => p !== path);
  await client.from('fixtures').update({ photo_paths: newPaths }).eq('id', editingId);
  fixture.photo_paths = newPaths;

  loadPhotoGallery(fixture);
  loadFixtures();
}

function slugify(text) {
  return (text || 'agonas')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // αφαιρεί τόνους
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildFolderName(fixture) {
  const comp = slugify(fixture.competition);
  const date = fixture.date || 'no-date';
  const shortId = fixture.id.slice(0, 6);
  return `${comp}_${date}-${shortId}`;
}

photoInput.addEventListener('change', async () => {
  if (!editingId) {
    alert('Αποθήκευσε πρώτα τον αγώνα πριν προσθέσεις φωτογραφίες.');
    photoInput.value = '';
    return;
  }

  const fixture = fixturesData.find(f => f.id === editingId);
  const existingCount = (fixture.photo_paths || []).length;
  const files = Array.from(photoInput.files).slice(0, 4 - existingCount);

  if (files.length === 0) {
    alert('Έχεις ήδη 4 φωτογραφίες για αυτόν τον αγώνα.');
    photoInput.value = '';
    return;
  }

  const newPaths = [];
  for (const file of files) {
    const folder = buildFolderName(fixture);
    const path = `${currentUser.id}/${folder}/${Date.now()}-${file.name}`;
    const { error } = await client.storage.from('fixture-photos').upload(path, file);
    if (error) {
      alert('Αποτυχία ανεβάσματος: ' + error.message);
      continue;
    }
    newPaths.push(path);
  }

  const updatedPaths = [...(fixture.photo_paths || []), ...newPaths];
  await client.from('fixtures').update({ photo_paths: updatedPaths }).eq('id', editingId);
  fixture.photo_paths = updatedPaths;

  photoInput.value = '';
  loadPhotoGallery(fixture);
  loadFixtures();
});