(function () {
  const $ = (id) => document.getElementById(id);

  const signInStatusEl = $('signInStatusEl');
  const authName       = $('authName');
  const authPass       = $('authPass');
  const authContinue   = $('authContinueBtn');
  const authedPanel    = $('authedPanel');
  const authedUserEl   = $('authedUser');
  const authedScoreValueEl = $('authedScoreValue');
  const logoutBtn      = $('logoutBtn');
  const leaderboardBody= $('leaderboardBody');
  const authLoginPanel = $('authLoginPanel');
  const authPanel      = $('authPanel');
  const authForm       = $('authForm');

  // Mobile menu elements
  const mobileAuthName = $('mobileAuthName');
  const mobileAuthPass = $('mobileAuthPass');
  const mobileAuthForm = $('mobileAuthForm');
  const mobileAuthedPanel = $('mobileAuthedPanel');
  const mobileAuthedUser = $('mobileAuthedUser');
  const mobileAuthedScore = $('mobileAuthedScore');
  const mobileLogoutBtn = $('mobileLogoutBtn');
  const mobileLeaderboardBody = $('mobileLeaderboardBody');
  const mobileAuthPanel = $('mobileAuthPanel');

  // Ensure main content sits just below fixed header
  function setHeaderOffset() {
    const header = document.getElementById('fixedHeader');
    const main = document.getElementById('appMain');
    if (!header || !main) return;
    const h = header.offsetHeight;
    main.style.paddingTop = (h + 8) + 'px';
  }

  // Keep score globally so game.js can read it
  window.currentScore = typeof window.currentScore === 'number' ? window.currentScore : 0;

  async function getMe() {
    try {
      const r = await fetch('/api/me', { credentials: 'same-origin' });
      if (!r.ok) return null;
      const data = await r.json();
      return data.user || data.me || null;
    } catch {
      return null;
    }
  }

  function setAuthedUI(user) {
    const body = document.body;

    if (!user) {
      body.classList.remove('is-authed');
      if (signInStatusEl) signInStatusEl.textContent = '';
      if (authedUserEl) authedUserEl.textContent = '—';
      if (authedScoreValueEl) authedScoreValueEl.textContent = 'Score: 0';

      // Mobile menu: show login form, hide logged-in panel
      if (mobileAuthPanel) mobileAuthPanel.style.display = 'block';
      if (mobileAuthedPanel) mobileAuthedPanel.style.display = 'none';

      setHeaderOffset();
      return;
    }

    body.classList.add('is-authed');
    if (signInStatusEl) signInStatusEl.textContent = '';

    const shownName = user.display_name || user.username || user.name || 'you';
    if (authedUserEl) authedUserEl.textContent = shownName;
    if (authedScoreValueEl) authedScoreValueEl.textContent = window.currentScore || 0;

    // Mobile menu: sync user info
    if (mobileAuthedUser) mobileAuthedUser.textContent = shownName;
    if (mobileAuthedScore) mobileAuthedScore.textContent = window.currentScore || 0;
    if (mobileAuthPanel) mobileAuthPanel.style.display = 'none';
    if (mobileAuthedPanel) mobileAuthedPanel.style.display = 'block';

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
        if (leaderboardBody) {
          leaderboardBody.innerHTML = '<p class="note">No scores yet.</p>';
        }
        return;
      }

      const html = [
        '<ol style="margin:0; padding-left:0;">',
        ...rows.slice(0, 20).map((row) =>
          `<li><span class="lb-name">${(row.display_name || row.username || row.name || 'anon')}</span>: <strong>${row.points || row.score || 0}</strong></li>`
        ),
        '</ol>'
      ].join('');

      if (leaderboardBody) {
        leaderboardBody.innerHTML = html;
      }
      if (mobileLeaderboardBody) {
        mobileLeaderboardBody.innerHTML = html;
      }
    } catch (e) {
      if (leaderboardBody) {
        leaderboardBody.innerHTML = '<p class="note">Could not load leaderboard.</p>';
      }
    }
  }

  // Expose so game.js can call it
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

      const shownName = user.display_name || user.username || user.name;
      const found = rows.find(
        (row) =>
          row.username === shownName ||
          row.name === shownName ||
          row.display_name === shownName
      );

      if (found) {
        window.currentScore = found.points || found.score || 0;
        if (authedScoreValueEl) {
          authedScoreValueEl.textContent = window.currentScore;
        }
        if (mobileAuthedScore) {
          mobileAuthedScore.textContent = window.currentScore;
        }
      }
    } catch (e) {
      console.warn('Failed to sync score from leaderboard', e);
    }
  }

  window.syncScoreFromLeaderboardFor = syncScoreFromLeaderboardFor;

  async function continueAuthFlow(isFromMobile = false) {
    const username = isFromMobile
      ? (mobileAuthName && mobileAuthName.value ? mobileAuthName.value.trim() : '')
      : (authName && authName.value ? authName.value.trim() : '');
    const password = isFromMobile
      ? (mobileAuthPass && mobileAuthPass.value ? mobileAuthPass.value : '')
      : (authPass && authPass.value ? authPass.value : '');

    if (!username || !password) {
      if (signInStatusEl) signInStatusEl.textContent = 'Please enter a username and password.';
      return;
    }

    const onSuccess = async () => {
      const me = await getMe();
      setAuthedUI(me);
      await refreshLeaderboard();
      await syncScoreFromLeaderboardFor(me);
      setHeaderOffset();
      if (signInStatusEl) signInStatusEl.textContent = '';
    };

    // 1) Try login first
    let r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username, password })
    });

    if (r.ok) {
      return onSuccess();
    }

    // 2) If login fails with 401, try register
    if (r.status === 401) {
      r = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password })
      });

      if (r.ok) {
        return onSuccess();
      }

      if (r.status === 409) {
        if (signInStatusEl) signInStatusEl.textContent = 'That username is taken. Try logging in instead.';
        return;
      }
    }

    const errJson = await r.json().catch(() => ({}));
    if (signInStatusEl) {
      signInStatusEl.textContent = errJson?.error || 'Could not sign in. Please try again.';
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {}
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

  // Mobile menu event listeners
  if (mobileAuthForm) {
    mobileAuthForm.addEventListener('submit', function (e) {
      e.preventDefault();
      continueAuthFlow(true);
    });
  }

  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener('click', handleLogout);
  }

  // Initial boot: show panel, get session + leaderboard
  getMe().then(async (u) => {
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