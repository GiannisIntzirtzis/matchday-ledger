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

function openDrawer() {
  drawerBackdrop.hidden = false;
}

function closeDrawer() {
  drawerBackdrop.hidden = true;
  fixtureForm.reset();
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
  alert('Fixture saved!');
});
