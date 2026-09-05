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