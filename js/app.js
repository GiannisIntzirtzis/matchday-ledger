const SUPABASE_URL = "https://edhtzvgfuejcfniyqygn.supabase.co"
const SUPABASE_KEY = "sb_publishable_wB6KHsy5IemEod00mKHjPQ_Tg7vWPU1"
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
console.log('Supabase client ready:', client)

let currentUser = null;
let authMode = 'signin'; // 'signin' ή 'signup'

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
  authSubmitBtn.textContent = authMode === 'signin' ? 'Sign in' : 'Sign up';
  authToggleBtn.textContent = authMode === 'signin' ? 'Sign up' : 'Sign in';
  authToggleLabel.textContent = authMode === 'signin' ? "Don't have an account?" : 'Already have an account?';
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
    authError.textContent = 'Account created — you can sign in now.';
    authMode = 'signin';
    authSubmitBtn.textContent = 'Sign in';
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

const drawerBackdrop = document.getElementById('drawer-backdrop');
const fixtureForm = document.getElementById('fixture-form');

let editingId = null;

function openDrawer(fixture = null) {
  editingId = fixture ? fixture.id : null;
  document.getElementById('drawer-title').textContent = fixture ? 'Edit fixture' : 'Add fixture';
  document.getElementById('btn-delete-fixture').hidden = !fixture;

  if (fixture) {
    document.getElementById('f-category').value = fixture.category || 'main';
    document.getElementById('f-date').value = fixture.date || '';
    document.getElementById('f-competition').value = fixture.competition || '';
    document.getElementById('f-venue').value = fixture.venue || '';
    document.getElementById('f-role').value = fixture.role || 'Referee';
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
  }

  drawerBackdrop.hidden = false;
  requestAnimationFrame(() => drawerBackdrop.classList.add('is-open'));
}

function closeDrawer() {
  drawerBackdrop.classList.remove('is-open');
  setTimeout(() => {
    drawerBackdrop.hidden = true;
    fixtureForm.reset();
  }, 250);
}

document.getElementById('btn-add-match').addEventListener('click', openDrawer);
document.getElementById('btn-empty-add').addEventListener('click', openDrawer);
document.getElementById('btn-cancel-fixture').addEventListener('click', closeDrawer);
document.getElementById('drawer-close').addEventListener('click', closeDrawer);

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

  const { error } = await client.from('fixtures').insert(newFixture);

  if (error) {
    alert('Could not save fixture: ' + error.message);
    return;
  }

  closeDrawer();
  loadFixtures();
  alert('Fixture saved!');
});

let fixturesData = [];

async function loadFixtures() {
  const { data, error } = await client
    .from('fixtures')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Failed to load fixtures:', error.message);
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
  const netProfit = totalFee - totalExpense;

  document.getElementById('kpi-hero-net').textContent = `€${netProfit.toFixed(2)}`;

  document.getElementById('kpi-row').innerHTML = `
    <div class="kpi"><div class="kpi-label">Fixtures logged</div><div class="kpi-value">${rows.length}</div></div>
    <div class="kpi accent-grass"><div class="kpi-label">Fees earned</div><div class="kpi-value">€${totalFee.toFixed(2)}</div></div>
    <div class="kpi"><div class="kpi-label">Travel expenses</div><div class="kpi-value">€${totalExpense.toFixed(2)}</div></div>
    <div class="kpi accent-grass"><div class="kpi-label">Net profit</div><div class="kpi-value">€${netProfit.toFixed(2)}</div></div>
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
    const net = Number(f.fee || 0) - Number(f.travel_expense || 0);
    return `
      <tr data-id="${f.id}" style="cursor:pointer">
        <td>${f.date || '—'}</td>
        <td>${f.competition || '—'}</td>
        <td>${f.home_team || '?'} vs ${f.away_team || '?'}</td>
        <td>${f.role || '—'}</td>
        <td>€${Number(f.fee || 0).toFixed(2)}</td>
        <td>€${net.toFixed(2)}</td>
        <td>${f.self_rating ?? '—'}</td>
        <td>${f.observer_rating ?? '—'}</td>
        <td>${f.yellow_cards || 0}Y / ${f.red_cards || 0}R</td>
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
    const month = f.date.slice(0, 7); // "2026-09-11" -> "2026-09"
    const net = Number(f.fee || 0) - Number(f.travel_expense || 0);
    byMonth[month] = (byMonth[month] || 0) + net;
  });

  const months = Object.keys(byMonth).sort();
  const values = months.map(m => byMonth[m]);

  if (chartProfit) chartProfit.destroy();
  chartProfit = new Chart(document.getElementById('chart-profit'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [{ label: 'Net profit (€)', data: values, borderColor: '#2E8B57', tension: 0.3 }]
    }
  });
}

function renderCompetitionChart(rows) {
  const counts = {};
  rows.forEach(f => {
    const comp = f.competition || 'Unspecified';
    counts[comp] = (counts[comp] || 0) + 1;
  });

  if (chartCompetition) chartCompetition.destroy();
  chartCompetition = new Chart(document.getElementById('chart-competition'), {
    type: 'bar',
    data: {
      labels: Object.keys(counts),
      datasets: [{ label: 'Fixtures', data: Object.values(counts), backgroundColor: '#2E8B57' }]
    }
  });
}

function renderRoleChart(rows) {
  const counts = {};
  rows.forEach(f => {
    const role = f.role || 'Unspecified';
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