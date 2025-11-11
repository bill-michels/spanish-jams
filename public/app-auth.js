(function () {
  const $ = (id) => document.getElementById(id);

  const signInStatusEl = $('signInStatusEl');
  const authName       = $('authName');
  const authPass       = $('authPass');
  const authContinue   = $('authContinueBtn');
  const authedPanel    = $('authedPanel');
  const authedUserEl   = $('authedUser');
  const authedScoreEl  = $('authedScore');
  const logoutBtn      = $('logoutBtn');
  const leaderboardBody= $('leaderboardBody');
  const authLoginPanel = $('authLoginPanel');
  const authPanel = $('authPanel');
  const authForm      = $('authForm');

  // Dynamically set main padding so Year Grid starts immediately below the fixed header
  function setHeaderOffset() {
    const header = document.getElementById('fixedHeader');
    const main = document.getElementById('appMain');
    if (!header || !main) return;
    // add a tiny buffer (8px) under the header for breathing room
    const h = header.offsetHeight;
    main.style.paddingTop = (h + 8) + 'px';
  }

  // keep score in window so game.js can update it
  window.currentScore = typeof window.currentScore === 'number' ? window.currentScore : 0;

  async function getMe() {
    try {
      const r = await fetch('/api/me', { credentials: 'same-origin' });
      if (!r.ok) return null;
      const data = await r.json();
      return data.user || data.me || null;
    } catch (e) {
      return null;
    }
  }

function setAuthedUI(user) {
  const body = document.body;

  if (!user) {
    // logged OUT: clear state and remove class
    body.classList.remove('is-authed');
    if (signInStatusEl) signInStatusEl.textContent = '';
    if (authedUserEl) authedUserEl.textContent = '—';
    if (authedScoreEl) authedScoreEl.textContent = 'Score: 0';
    setHeaderOffset();
    return;
  }

  // logged IN: add body class and populate name/score
  body.classList.add('is-authed');
  if (signInStatusEl) signInStatusEl.textContent = '';

  const shownName = user.username || user.name || 'you';
  if (authedUserEl) authedUserEl.textContent = shownName;
  if (authedScoreEl) authedScoreEl.textContent = 'Score: ' + (window.currentScore || 0);
  setHeaderOffset();
}
  async function refreshLeaderboard() {
  try {
    const r = await fetch('/api/leaderboard?t=' + Date.now(), {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!r.ok) throw new Error('lb');
    const data = await r.json();
    const rows = (data && (data.scores || data.leaderboard))
      ? (data.scores || data.leaderboard)
      : (Array.isArray(data) ? data : []);

    if (!rows.length) {
      leaderboardBody.innerHTML = '<p class="note">No scores yet.</p>';
      return;
    }

    const html = [
      '<ol style="margin:0; padding-left:1.2rem;">',
      ...rows.slice(0, 20).map((r) =>
        `<li>${(r.username || r.name || 'anon')} — <strong>${r.points || r.score || 0}</strong></li>`
      ),
      '</ol>'
    ].join('');
    leaderboardBody.innerHTML = html;
  } catch (e) {
    leaderboardBody.innerHTML = '<p class="note">Could not load leaderboard.</p>';
  }
}
  // expose so game.js can call it
  window.refreshLeaderboard = refreshLeaderboard;
async function syncScoreFromLeaderboardFor(user) {
  if (!user) return;
  try {
    const r = await fetch('/api/leaderboard', { credentials: 'same-origin' });
    if (!r.ok) return;
    const data = await r.json();
    const rows = (data && (data.scores || data.leaderboard))
      ? (data.scores || data.leaderboard)
      : (Array.isArray(data) ? data : []);

    const shownName = user.username || user.name;
    const found = rows.find(
      (row) =>
        row.username === shownName ||
        row.name === shownName
    );
    if (found) {
      window.currentScore = found.points || found.score || 0;
      if (authedScoreEl) {
        authedScoreEl.textContent = 'Score: ' + window.currentScore;
      }
    }
  } catch (e) {
    console.warn('Failed to sync score from leaderboard', e);
  }
}
  async function continueAuthFlow() {
    const username = authName && authName.value ? authName.value.trim() : '';
    const password = authPass && authPass.value ? authPass.value : '';

    if (!username || !password) {
      if (signInStatusEl) signInStatusEl.textContent = 'Enter username and password';
      return;
    }

    // 1) try login
    let r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username, password })
    });

    if (r.ok) {
  const me = await getMe();
  setAuthedUI(me);
  await refreshLeaderboard();
  await syncScoreFromLeaderboardFor(me);
  setHeaderOffset();
  return;
}

    // 2) otherwise create account
    r = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username, password })
    });

    if (r.ok) {
  const me = await getMe();
  setAuthedUI(me);
  await refreshLeaderboard();
  await syncScoreFromLeaderboardFor(me);
  setHeaderOffset();
  return;
}

    if (signInStatusEl) signInStatusEl.textContent = 'Login / Register failed';
  }

  async function handleLogout() {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (e) {}
    window.currentScore = 0;
    setAuthedUI(null);
    setHeaderOffset();
    refreshLeaderboard();
  }

  if (authContinue) {
    authContinue.addEventListener('click', continueAuthFlow);
  }
  if (authForm) {
    authForm.addEventListener('submit', function (e) {
      e.preventDefault();
      continueAuthFlow();
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // initial boot: get me + leaderboard
  getMe()
    .then(async (u) => {
      if (authPanel) authPanel.style.display = 'block';
      if (u) {
        setAuthedUI(u);
        await refreshLeaderboard();
        await syncScoreFromLeaderboardFor(u);
      } else {
        setAuthedUI(null);
        await refreshLeaderboard();
      }
    });

  console.log('[auth] single-button flow ready');
  window.addEventListener('load', setHeaderOffset);
  window.addEventListener('resize', setHeaderOffset);
})();