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

async function showApp() {
  authScreen.hidden = true;
  appScreen.hidden = false;
  await loadProfile();
  checkAdminAccess();
  updateGreeting();
  loadFixtures();
}

function updateGreeting() {
  const name = currentProfile?.first_name;
  document.getElementById('hero-greeting').textContent = name ? `Γεια σου, ${name}` : 'Καταγραφή σεζόν';
}

function showAuth() {
  authScreen.hidden = false;
  appScreen.hidden = true;
}

const signupFields = document.getElementById('signup-fields');

const signupRequiredFields = ['auth-first-name', 'auth-last-name', 'auth-birth-year', 'auth-referee-school'];

authToggleBtn.addEventListener('click', () => {
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  authSubmitBtn.textContent = authMode === 'signin' ? 'Σύνδεση' : 'Εγγραφή';
  authToggleBtn.textContent = authMode === 'signin' ? 'Εγγραφή' : 'Σύνδεση';
  authToggleLabel.textContent = authMode === 'signin' ? 'Δεν έχεις λογαριασμό;' : 'Έχεις ήδη λογαριασμό;';
  authError.textContent = '';
  signupFields.hidden = authMode !== 'signup';

  const isSignup = authMode === 'signup';
  signupRequiredFields.forEach(id => {
    document.getElementById(id).required = isSignup;
  });
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';

  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    authError.textContent = 'Δώσε ένα έγκυρο email (π.χ. name@example.com).';
    return;
  }

  if (authMode === 'signup') {
    const hasLetter = /[a-zA-Zα-ωΑ-Ω]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (password.length < 8 || !hasLetter || !hasNumber) {
      authError.textContent = 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες, με τουλάχιστον ένα γράμμα και έναν αριθμό.';
      return;
    }
  }

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
    const newUser = result.data.user;

    if (!result.data.session) {
      authError.textContent = 'Ο λογαριασμός δημιουργήθηκε! Επιβεβαίωσε το email σου, μετά συνδέσου για να ολοκληρώσεις το προφίλ σου.';
      authMode = 'signin';
      authSubmitBtn.textContent = 'Σύνδεση';
      signupFields.hidden = true;
      return;
    }

    const { error: profileError } = await client.from('profiles').insert({
      id: newUser.id,
      first_name: document.getElementById('auth-first-name').value,
      last_name: document.getElementById('auth-last-name').value,
      birth_year: Number(document.getElementById('auth-birth-year').value) || null,
      referee_school: document.getElementById('auth-referee-school').value,
      evaluation_status: document.getElementById('auth-evaluation-status').value,
    });

    if (profileError) {
      authError.textContent = 'Ο λογαριασμός δημιουργήθηκε, αλλά κάτι πήγε στραβά με το προφίλ: ' + profileError.message;
    } else {
      authError.textContent = 'Ο λογαριασμός δημιουργήθηκε — μπορείς να συνδεθείς τώρα.';
    }

    authMode = 'signin';
    authSubmitBtn.textContent = 'Σύνδεση';
    signupFields.hidden = true;
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
let activeCategory = 'all';
let searchTerm = '';
let activeCompetitionFilter = '';

function getFilteredFixtures() {
  return fixturesData.filter(f => {
    if (activeCategory !== 'all' && f.category !== activeCategory) return false;
    if (activeCompetitionFilter && f.competition !== activeCompetitionFilter) return false;
    if (searchTerm) {
      const haystack = [
        f.home_team, f.away_team, f.venue, f.competition, f.role,
        f.player_name, f.player_team, f.result
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });
}

function renderAll() {
  const rows = getFilteredFixtures();
  renderKpis(rows);
  renderTable(rows);
  renderCharts(rows);
  renderStandouts(rows);
}

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
  populateCompetitionFilter();
  renderAll();
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
  const roles = ['Διαιτητής', 'Βοηθός Διαιτητής 1', 'Βοηθός Διαιτητής 2'];
  const roleColors = {
    'Διαιτητής': '#2E8B57',
    'Βοηθός Διαιτητής 1': '#E8B923',
    'Βοηθός Διαιτητής 2': '#C23B3B',
  };

  const counts = {};
  allCompetitions.forEach(c => {
    counts[c] = { 'Διαιτητής': 0, 'Βοηθός Διαιτητής 1': 0, 'Βοηθός Διαιτητής 2': 0 };
  });
  rows.forEach(f => {
    if (counts[f.competition] && counts[f.competition].hasOwnProperty(f.role)) {
      counts[f.competition][f.role]++;
    }
  });

  const datasets = roles.map(role => ({
    label: role,
    data: allCompetitions.map(c => counts[c][role]),
    backgroundColor: roleColors[role],
  }));

  if (chartCompetition) chartCompetition.destroy();
  chartCompetition = new Chart(document.getElementById('chart-competition'), {
    type: 'bar',
    data: { labels: allCompetitions, datasets },
    options: {
      scales: {
        x: { ticks: { autoSkip: false, maxRotation: 60, minRotation: 60 } },
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
      },
    },
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

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
    tab.classList.add('is-active');
    activeCategory = tab.dataset.category;
    renderAll();
  });
});

document.getElementById('search-input').addEventListener('input', (e) => {
  searchTerm = e.target.value;
  renderAll();
});

document.getElementById('filter-competition').addEventListener('change', (e) => {
  activeCompetitionFilter = e.target.value;
  renderAll();
});

function populateCompetitionFilter() {
  const select = document.getElementById('filter-competition');
  const current = select.value;
  const allCompetitions = Object.values(COMPETITION_GROUPS).flat();
  select.innerHTML = '<option value="">Όλες οι διοργανώσεις</option>' +
    allCompetitions.map(c => `<option value="${c}">${c}</option>`).join('');
  select.value = current;
}

function renderStandouts(rows) {
  const withPlayers = rows.filter(f => f.player_name).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const container = document.getElementById('standout-list');

  if (withPlayers.length === 0) {
    container.innerHTML = '<p style="color:var(--chalk-faint);font-size:13px;">Δεν έχεις καταγράψει παίκτη ακόμα.</p>';
    return;
  }

  container.innerHTML = withPlayers.map(f => {
    const isNegative = f.impression === 'negative';
    const badge = isNegative
      ? '<span style="color:#E38080;font-size:11px;">Αρνητική</span>'
      : '<span style="color:var(--grass-bright);font-size:11px;">Θετική</span>';
    return `
      <div style="border:1px solid var(--line);border-radius:var(--radius);padding:10px 12px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;">
          <strong style="font-size:14px;">${f.player_name}</strong>
          ${badge}
        </div>
        <div style="font-size:12px;color:var(--chalk-faint);">${f.player_team || ''} · ${f.date || ''}</div>
      </div>
    `;
  }).join('');
}

/* ---------------- Προφίλ χρήστη ---------------- */

let currentProfile = null;

const profileDrawerBackdrop = document.getElementById('profile-drawer-backdrop');
const profileForm = document.getElementById('profile-form');

async function loadProfile() {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (error) {
    console.error('Αποτυχία φόρτωσης προφίλ:', error.message);
    return;
  }

  currentProfile = data;
}

function openProfileDrawer() {
  document.getElementById('p-first-name').value = currentProfile?.first_name || '';
  document.getElementById('p-last-name').value = currentProfile?.last_name || '';
  document.getElementById('p-birth-year').value = currentProfile?.birth_year || '';
  document.getElementById('p-referee-school').value = currentProfile?.referee_school || '';
  document.getElementById('p-evaluation-status').value = currentProfile?.evaluation_status || 'Μη Αξιολογημένος';
  document.getElementById('p-phone').value = currentProfile?.phone || '';
  document.getElementById('p-address').value = currentProfile?.address || '';

  profileDrawerBackdrop.hidden = false;
  requestAnimationFrame(() => profileDrawerBackdrop.classList.add('is-open'));
}

function closeProfileDrawer() {
  profileDrawerBackdrop.classList.remove('is-open');
  setTimeout(() => { profileDrawerBackdrop.hidden = true; }, 250);
}

document.getElementById('btn-open-profile').addEventListener('click', openProfileDrawer);
document.getElementById('profile-drawer-close').addEventListener('click', closeProfileDrawer);
document.getElementById('btn-cancel-profile').addEventListener('click', closeProfileDrawer);

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const updatedProfile = {
    first_name: document.getElementById('p-first-name').value,
    last_name: document.getElementById('p-last-name').value,
    birth_year: Number(document.getElementById('p-birth-year').value) || null,
    referee_school: document.getElementById('p-referee-school').value,
    evaluation_status: document.getElementById('p-evaluation-status').value,
    phone: document.getElementById('p-phone').value,
    address: document.getElementById('p-address').value,
  };

  const { error } = await client.from('profiles').update(updatedProfile).eq('id', currentUser.id);

  if (error) {
    alert('Αποτυχία αποθήκευσης προφίλ: ' + error.message);
    return;
  }

  currentProfile = { ...currentProfile, ...updatedProfile };
  closeProfileDrawer();
});
/* ---------------- Admin view ---------------- */

const adminScreen = document.getElementById('admin-screen');
const btnAdminView = document.getElementById('btn-admin-view');

function checkAdminAccess() {
  if (currentProfile?.role === 'admin') {
    btnAdminView.hidden = false;
  } else {
    btnAdminView.hidden = true;
  }
}

btnAdminView.addEventListener('click', async () => {
  appScreen.hidden = true;
  adminScreen.hidden = false;
  await loadAdminData();
});

document.getElementById('btn-back-to-dashboard').addEventListener('click', () => {
  adminScreen.hidden = true;
  appScreen.hidden = false;
});

async function loadAdminData() {
  const container = document.getElementById('admin-user-list');
  container.innerHTML = '<p style="color:var(--chalk-faint);">Φόρτωση...</p>';

  const { data: profiles, error: profilesError } = await client.from('profiles').select('*');
  const { data: allFixtures, error: fixturesError } = await client.from('fixtures').select('*');

  if (profilesError || fixturesError) {
    container.innerHTML = `<p style="color:#E38080;">Σφάλμα φόρτωσης: ${(profilesError || fixturesError).message}</p>`;
    return;
  }

  container.innerHTML = profiles.map(p => {
    const userFixtures = allFixtures.filter(f => f.user_id === p.id);
    const totalFee = userFixtures.reduce((s, f) => s + Number(f.fee || 0), 0);
    const totalMatches = userFixtures.length;
    const totalPhotos = userFixtures.reduce((s, f) => s + (f.photo_paths?.length || 0), 0);

    return `
      <div class="panel" data-user-id="${p.id}" style="margin-bottom:12px;cursor:pointer;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <strong style="font-size:16px;">${p.first_name || '—'} ${p.last_name || ''}</strong>
          <span style="font-size:11px;color:var(--chalk-faint);">${p.role}</span>
        </div>
        <div style="font-size:12px;color:var(--chalk-faint);margin-top:4px;">
          ${p.referee_school || 'Χωρίς σχολή'} · ${p.evaluation_status || '—'} · Γεν. ${p.birth_year || '—'}
        </div>
        <div style="font-size:12px;color:var(--chalk-faint);">
          ${p.phone || '—'} · ${p.address || '—'}
        </div>
        <div style="display:flex;gap:20px;margin-top:10px;font-size:13px;">
          <span><strong>${totalMatches}</strong> αγώνες</span>
          <span><strong>€${totalFee.toFixed(2)}</strong> αμοιβές</span>
          <span><strong>${totalPhotos}</strong> φωτογραφίες</span>
        </div>
      </div>
    `;
  }).join('');
   
  container.querySelectorAll('.panel').forEach(card => {
    card.addEventListener('click', () => viewUserAsAdmin(card.dataset.userId, profiles, allFixtures));
  });
}

function viewUserAsAdmin(userId, profiles, allFixtures) {
  const profile = profiles.find(p => p.id === userId);
  const userFixtures = allFixtures.filter(f => f.user_id === userId);

  adminScreen.hidden = true;
  appScreen.hidden = false;

  document.getElementById('kpi-hero-net').closest('.hero').querySelector('.hero-headline h1').textContent =
    `${profile.first_name || ''} ${profile.last_name || ''} — Προβολή διαχειριστή`;

  renderKpis(userFixtures);
  renderTable(userFixtures);
  renderCharts(userFixtures);
  renderStandouts(userFixtures);

  document.getElementById('btn-add-match').hidden = true;
  document.getElementById('btn-open-profile').hidden = true;
  document.getElementById('btn-admin-view').hidden = true;
  document.getElementById('btn-sign-out').textContent = 'Έξοδος από προβολή';

  const originalSignOut = () => {
    location.reload();
  };
  document.getElementById('btn-sign-out').replaceWith(document.getElementById('btn-sign-out').cloneNode(true));
  document.getElementById('btn-sign-out').addEventListener('click', originalSignOut);
}