document.addEventListener("DOMContentLoaded", () => {
  // ------- Elements
  const playBtn  = document.getElementById("playBtn");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const shareBtn = document.getElementById("shareBtn");
  const mobileShareBtn = document.getElementById("mobileShareBtn");
  const jamAudio = document.getElementById("jamAudio");
  const statusEl = document.getElementById("statusEl");
  const answerEl = document.getElementById("answerEl");
  const yearGrid = document.getElementById("yearGrid");
  const signInStatusEl = document.getElementById("signInStatusEl");
  const listenPanelBody = document.querySelector("#tab-listen .panel-body");
  const rightOriginalHTML = listenPanelBody ? listenPanelBody.innerHTML : "";

console.log("playBtn element:", playBtn);
console.log("jamAudio element:", jamAudio);

  if (!playBtn || !jamAudio || !statusEl || !answerEl || !yearGrid) {
    console.error("Required elements missing. Check index.html IDs.");
    return; // safe to return here because we are inside DOMContentLoaded handler
  }

  // ------- Sponsor Rotation System
  let sponsorRotationIndex = 0;
  const leftPanelTitle = document.getElementById('leftPanelTitle');
  const leftPanelBody = document.getElementById('leftPanelBody');
  const rightPanelTitle = document.getElementById('rightPanelTitle');
  const rightPanelBody = document.getElementById('rightPanelBody');

  const sponsorContent = [
    {
      // Rotation 1: Stretch Pizza + Nugs
      left: {
        title: 'Check out our Sponsor:',
        body: `
          <a href="https://www.instagram.com/stretchpizzanyc/" target="_blank" rel="noopener noreferrer" class="instagram-link">
            <div class="instagram-card">
              <img src="/Images/stretch-logo.png" alt="Stretch Pizza NYC" class="stretch-logo" />
              <div class="instagram-info">
                <h3>Stretch Pizza NYC</h3>
                <p>@stretchpizzanyc</p>
                <span class="instagram-cta">Follow on Instagram →</span>
              </div>
            </div>
          </a>
        `
      },
      right: {
        title: 'Nugs.net - Stream Shows',
        body: `
          <a href="https://www.nugs.net/" target="_blank" rel="noopener noreferrer" class="nugs-link">
            <img src="/Images/nugs-logo.png" alt="Nugs.net - Stream Shows" class="nugs-logo" />
          </a>
        `
      }
    },
    {
      // Rotation 2: Etsy Store + Searchlight GD YouTube
      left: {
        title: '',
        body: `
          <div style="padding:20px;">
            <a href="https://www.etsy.com/shop/MindLeftBodyStore/" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
              <div style="text-align:center; padding:20px; background:rgba(255,255,255,0.5); border-radius:12px; transition:all 0.3s ease;">
                <h3 style="margin:0 0 8px 0; font-size:18px; font-weight:600; color:#444;">Mind Left Body Store</h3>
                <p style="margin:0 0 12px 0; font-size:14px; color:#444;">Grateful Dead inspired goods</p>
                <a href="https://www.etsy.com/listing/4543534647/" target="_blank" style="display:block; margin:16px 0;">
                  <img src="https://i.etsystatic.com/66949228/r/il/3708c0/8310447380/il_1588xN.8310447380_n4ky.jpg" alt="V2 Grateful Dead Tape Cover Scatter Poster" style="width:100%; max-height:200px; object-fit:contain; border-radius:8px; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                </a>
                <span style="display:inline-block; padding:8px 16px; background:#F56400; color:white; border-radius:20px; font-size:14px; font-weight:600;">Shop Now →</span>
              </div>
            </a>
          </div>
        `
      },
      right: {
        title: 'This Day in Dead History',
        body: `
          <div style="padding:20px;">
            <a href="https://www.youtube.com/@SearchlightGD" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
              <div style="text-align:center; padding:20px; background:rgba(255,255,255,0.5); border-radius:12px; transition:all 0.3s ease;">
                <div style="width:80px; height:80px; margin:0 auto 12px; background:#FF0000; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                  <svg width="50" height="36" viewBox="0 0 68 48" fill="white">
                    <path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z M27,34V14l18,10L27,34z"/>
                  </svg>
                </div>
                <h3 style="margin:0 0 8px 0; font-size:18px; font-weight:600; color:#444;">Searchlight GD</h3>
                <p style="margin:0 0 12px 0; font-size:14px; color:#444;">Daily Grateful Dead history</p>
                <span style="display:inline-block; padding:8px 16px; background:#FF0000; color:white; border-radius:20px; font-size:14px; font-weight:600;">Watch on YouTube →</span>
              </div>
            </a>
          </div>
        `
      }
    }
  ];

  function rotateSponsorContent() {
    if (!leftPanelTitle || !leftPanelBody || !rightPanelTitle || !rightPanelBody) return;

    const content = sponsorContent[sponsorRotationIndex];

    leftPanelTitle.textContent = content.left.title;
    leftPanelBody.innerHTML = content.left.body;
    rightPanelTitle.textContent = content.right.title;
    rightPanelBody.innerHTML = content.right.body;

    // Move to next rotation
    sponsorRotationIndex = (sponsorRotationIndex + 1) % sponsorContent.length;
  }

  const labelDefault = playBtn.querySelector(".label-default");
  const labelLoading = playBtn.querySelector(".label-loading");
  const labelPlaying = playBtn.querySelector(".label-playing");
  const labelPaused = playBtn.querySelector(".label-paused");
  const labelRoundEnd = playBtn.querySelector(".label-round-end");
  const labelRoundEndPaused = playBtn.querySelector(".label-round-end-paused");
  const elapsedSpan  = document.getElementById("elapsed");
  const durationSpan = document.getElementById("duration");
  const elapsedPausedSpan  = document.getElementById("elapsedPaused");
  const durationPausedSpan = document.getElementById("durationPaused");
  const elapsedEndSpan = document.getElementById("elapsedEnd");
  const elapsedEndPausedSpan = document.getElementById("elapsedEndPaused");
  const progressBar = document.getElementById("progressBar");
  const progressBarPaused = document.getElementById("progressBarPaused");

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" + s : s);
  }

  function setPlayState(state) {
    if (!playBtn) return;
    playBtn.dataset.state = state;
    if (state === "idle") {
      if (!labelDefault || !labelLoading || !labelPlaying || !labelPaused) return;

      // Idle = either initial state OR paused mid-jam.
      // Show "Resume" only when there's progress in the current clip
      // AND the round is still active (not over).
      const hasProgress =
        jamAudio &&
        isFinite(jamAudio.currentTime) &&
        jamAudio.currentTime > 0 &&
        !jamAudio.ended;

      labelDefault.textContent = hasProgress ? "Resume" : "Play";
      labelDefault.hidden = false;
      labelLoading.hidden = true;
      labelPlaying.hidden = true;
      labelPaused.hidden = true;
      if (labelRoundEnd) labelRoundEnd.hidden = true;
      if (labelRoundEndPaused) labelRoundEndPaused.hidden = true;
    } else if (state === "loading") {
      labelDefault.hidden = true;
      labelLoading.hidden = false;
      labelPlaying.hidden = true;
      labelPaused.hidden = true;
      if (labelRoundEnd) labelRoundEnd.hidden = true;
      if (labelRoundEndPaused) labelRoundEndPaused.hidden = true;
    } else if (state === "playing") {
      labelDefault.hidden = true;
      labelLoading.hidden = true;
      labelPlaying.hidden = false;
      labelPaused.hidden = true;
      if (labelRoundEnd) labelRoundEnd.hidden = true;
      if (labelRoundEndPaused) labelRoundEndPaused.hidden = true;
    } else if (state === "paused") {
      labelDefault.hidden = true;
      labelLoading.hidden = true;
      labelPlaying.hidden = true;
      labelPaused.hidden = false;
      if (labelRoundEnd) labelRoundEnd.hidden = true;
      if (labelRoundEndPaused) labelRoundEndPaused.hidden = true;
    } else if (state === "round-end") {
      labelDefault.hidden = true;
      labelLoading.hidden = true;
      labelPlaying.hidden = true;
      labelPaused.hidden = true;
      if (labelRoundEnd) labelRoundEnd.hidden = false;
      if (labelRoundEndPaused) labelRoundEndPaused.hidden = true;
    } else if (state === "round-end-paused") {
      labelDefault.hidden = true;
      labelLoading.hidden = true;
      labelPlaying.hidden = true;
      labelPaused.hidden = true;
      if (labelRoundEnd) labelRoundEnd.hidden = true;
      if (labelRoundEndPaused) labelRoundEndPaused.hidden = false;
    }
  }

  // initial state
  setPlayState("idle");
  if (playAgainBtn) {
    playAgainBtn.style.display = "none";
  }

  // keep transport UI in sync with audio element
  jamAudio.addEventListener("timeupdate", () => {
    const currentTime = jamAudio.currentTime || 0;
    const duration = jamAudio.duration || 0;

    // Update time displays
    if (elapsedSpan) elapsedSpan.textContent = formatTime(currentTime);
    if (durationSpan) durationSpan.textContent = formatTime(duration);
    if (elapsedPausedSpan) elapsedPausedSpan.textContent = formatTime(currentTime);
    if (durationPausedSpan) durationPausedSpan.textContent = formatTime(duration);
    if (elapsedEndSpan) elapsedEndSpan.textContent = formatTime(currentTime);
    if (elapsedEndPausedSpan) elapsedEndPausedSpan.textContent = formatTime(currentTime);

    // Update progress bars (only during round, not at end)
    if (duration > 0 && !roundOver) {
      const progress = (currentTime / duration) * 100;
      if (progressBar) {
        progressBar.value = progress;
        progressBar.style.setProperty('--progress', progress + '%');
      }
      if (progressBarPaused) {
        progressBarPaused.value = progress;
        progressBarPaused.style.setProperty('--progress', progress + '%');
      }
    }
  });

  jamAudio.addEventListener("loadedmetadata", () => {
    const duration = jamAudio.duration || 0;
    if (durationSpan) durationSpan.textContent = formatTime(duration);
    if (durationPausedSpan) durationPausedSpan.textContent = formatTime(duration);
  });

  jamAudio.addEventListener("play", () => {
    // If round is over, switch to end-of-round state
    if (roundOver) {
      setPlayState("round-end");
    } else {
      setPlayState("playing");
    }
  });

  // Track if user is scrubbing
  let isScrubbing = false;

  jamAudio.addEventListener("pause", () => {
    // Only show paused state if not scrubbing and not ended
    if (!jamAudio.ended && !isScrubbing) {
      // If round is over, switch to end-of-round paused state
      if (roundOver) {
        setPlayState("round-end-paused");
      } else {
        setPlayState("paused");
      }
    }
  });

  jamAudio.addEventListener("ended", () => {
    setPlayState("idle");
  });

  // Progress bar scrubbing
  if (progressBar) {
    let wasPlaying = false;

    // Prevent clicks on progress bar from triggering button click
    progressBar.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    progressBar.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // Prevent button click
      isScrubbing = true;
      wasPlaying = !jamAudio.paused;
    });

    progressBar.addEventListener("mouseup", (e) => {
      e.stopPropagation(); // Prevent button click
      isScrubbing = false;
      // Resume playing if it was playing before scrubbing
      if (wasPlaying && jamAudio.paused) {
        jamAudio.play().catch(() => {});
      }
    });

    progressBar.addEventListener("input", (e) => {
      e.stopPropagation(); // Prevent button click
      const duration = jamAudio.duration;
      if (duration > 0) {
        const seekTime = (progressBar.value / 100) * duration;
        jamAudio.currentTime = seekTime;
      }
    });

    progressBar.addEventListener("change", (e) => {
      e.stopPropagation(); // Prevent button click
    });

    // Handle touch events for mobile
    progressBar.addEventListener("touchstart", (e) => {
      e.stopPropagation(); // Prevent button click
      isScrubbing = true;
      wasPlaying = !jamAudio.paused;
    });

    progressBar.addEventListener("touchend", (e) => {
      e.stopPropagation(); // Prevent button click
      isScrubbing = false;
      if (wasPlaying && jamAudio.paused) {
        jamAudio.play().catch(() => {});
      }
    });
  }

  if (progressBarPaused) {
    let wasPlayingPaused = false;

    // Prevent clicks on progress bar from triggering button click
    progressBarPaused.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    progressBarPaused.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // Prevent button click
      isScrubbing = true;
      wasPlayingPaused = !jamAudio.paused;
    });

    progressBarPaused.addEventListener("mouseup", (e) => {
      e.stopPropagation(); // Prevent button click
      isScrubbing = false;
      // Resume playing if it was playing before scrubbing
      if (wasPlayingPaused && jamAudio.paused) {
        jamAudio.play().catch(() => {});
      }
    });

    progressBarPaused.addEventListener("input", (e) => {
      e.stopPropagation(); // Prevent button click
      const duration = jamAudio.duration;
      if (duration > 0) {
        const seekTime = (progressBarPaused.value / 100) * duration;
        jamAudio.currentTime = seekTime;
      }
    });

    progressBarPaused.addEventListener("change", (e) => {
      e.stopPropagation(); // Prevent button click
    });

    // Handle touch events for mobile
    progressBarPaused.addEventListener("touchstart", (e) => {
      e.stopPropagation(); // Prevent button click
      isScrubbing = true;
      wasPlayingPaused = !jamAudio.paused;
    });

    progressBarPaused.addEventListener("touchend", (e) => {
      e.stopPropagation(); // Prevent button click
      isScrubbing = false;
      if (wasPlayingPaused && jamAudio.paused) {
        jamAudio.play().catch(() => {});
      }
    });
  }

// Auto-start logic removed: inline transport + loadRandomClip() are triggered from the guarded Play button listener below.

  // ------- State (declare ONCE)
  let current = null;     // {identifier,date,title,venue,location,file?,url}
  let guessCount = 0;     // 0..3
  let round = 0;          // increments each time Play is clicked
  const MAX_GUESSES = 3;
  let roundOver = false;  // true once a round ends (win or out of guesses)
  let lastSongName = null;  // track name from last completed round
  let lastYear = null;      // year from last completed round

  // Session stats
  window.sessionRounds = 0;
  window.sessionPoints = 0;

  function updateSessionStats() {
    const ids = [
      ['sessionRoundsValue', window.sessionRounds],
      ['sessionPointsValue', window.sessionPoints],
      ['mobileSessionRoundsValue', window.sessionRounds],
      ['mobileSessionPointsValue', window.sessionPoints],
    ];
    ids.forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  }

  // ------- Utilities
  function setButtonsEnabled(enabled) {
    Array.from(yearGrid.querySelectorAll("button")).forEach(b => { b.disabled = !enabled; });
  }
  function clearUsedMarks() {
    Array.from(yearGrid.querySelectorAll("button")).forEach(b => {
      b.classList.remove("used", "correct", "bonus");
      // Reset button text back to the year number
      b.textContent = b.dataset.year;
    });
  }
  function cleanShowTitle(title, date, venue) {
    const raw = title || `${(date || "").split("T")[0]} — ${venue || ""}`;
    return raw.replace(/^Grateful Dead Live at\s*/i, "");
  }

  function renderTracksUnderAnswer(tracks) {
  if (!Array.isArray(tracks) || tracks.length === 0) {
    answerEl.innerHTML += `<p class="note" style="margin-top:6px;">No track list available.</p>`;
    return;
  }
  const list = document.createElement("ol");
  list.style.paddingLeft = "20px";
  list.style.marginTop = "8px";

  tracks.forEach(t => {
    const li = document.createElement("li");
    li.style.margin = "6px 0";
    const label = t.title || t.name;
    const len = t.length ? ` <span style="color:#9ca3af;">(${t.length})</span>` : "";
    li.innerHTML = `<a href="#" data-url="${t.url}" class="gt-play"><span class="gt-label">${label}</span></a>${len}`;
    list.appendChild(li);
  });

  answerEl.appendChild(list);

   // click to play in the same jamAudio element
  Array.from(answerEl.querySelectorAll(".gt-play")).forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const url = a.getAttribute("data-url");
      if (!url) return;
      // Reset all track labels to default style
      Array.from(answerEl.querySelectorAll(".gt-label")).forEach(span => {
        span.style.fontSize = "";
        span.style.fontWeight = "";
        span.style.color = "";
      });
      // Highlight the selected track's label
      const span = a.querySelector(".gt-label");
      if (span) {
        span.style.fontSize = "18px";
        span.style.fontWeight = "600";
        span.style.color = "#5B8FA3";
      }

      // GA4: answer_track_played event
      const songName = span ? span.textContent : '';
      const showYear = current && current.date ? parseInt(String(current.date).slice(0,4), 10) : null;
      if (typeof gtag === 'function') {
        gtag('event', 'answer_track_played', {
          song_name: songName,
          show_year: showYear
        });
      }

      try { jamAudio.pause(); } catch {}
      jamAudio.src = url;
      jamAudio.load();
      jamAudio.play().catch(()=>{});
      jamAudio.style.display = "block";
    });
  });
} // <- closes renderTracksUnderAnswer
function renderShowBottom(show) {
  const panel = document.getElementById("bottom-show");
  const body  = document.getElementById("bottom-show-body");
  if (!panel || !body) return;

  const meta   = show.meta || show; // support either shape
  const title  = cleanShowTitle(meta.title, meta.date, meta.venue);
  const when   = meta.date ? new Date(meta.date).toDateString() : "";
  const where  = [meta.venue, meta.location].filter(Boolean).join(" • ");
  const tracks = show.tracks || [];

  let html = `
    <div style="margin-bottom:10px;">
      <strong>${title}</strong>
      ${where ? `<div class="note">${where}</div>` : ""}
      ${when  ? `<div class="note">${when}</div>` : ""}
    </div>
  `;

  if (tracks.length) {
    html += `<ol style="padding-left:20px;">`;
    tracks.forEach(t => {
      const label = t.title || t.name;
      const len   = t.length ? ` <span style="color:#9ca3af;">(${t.length})</span>` : "";
      html += `<li style="margin:6px 0;">
        <a href="#" data-url="${t.url}" class="bottom-play">${label}</a>${len}
      </li>`;
    });
    html += `</ol>`;
  } else {
    html += `<p class="note">No track list available.</p>`;
  }

  body.innerHTML = html;
  panel.style.display = "block";

  // click-to-play in the same audio element
  Array.from(body.querySelectorAll(".bottom-play")).forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const url = link.getAttribute("data-url");
      if (!url) return;
      try { jamAudio.pause(); } catch {}
      jamAudio.src = url;
      jamAudio.load();
      jamAudio.play().catch(()=>{});
      jamAudio.style.display = "block";
    });
  });
}


  // Build year buttons 1966..1995 (once)
  if (yearGrid.children.length === 0) {
    for (let y = 1966; y <= 1995; y++) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = y;
      b.dataset.year = String(y);
      yearGrid.appendChild(b);
    }
  }

  // Initial UI
setButtonsEnabled(false);
jamAudio.style.display = "none";
answerEl.style.display = "none";

// Hide answer panel initially
const answerPanel = document.querySelector('.answer-panel');
if (answerPanel) answerPanel.style.display = "none";

// ------- AdSense refresh logic
function refreshAdUnit() {
  // Get the ad container
  const adContainer = document.getElementById('ad-right');
  if (!adContainer) return;

  // Remove existing ad
  const existingAd = adContainer.querySelector('.adsbygoogle');
  if (existingAd) {
    existingAd.remove();
  }

  // Create new ad element
  const newAd = document.createElement('ins');
  newAd.className = 'adsbygoogle';
  newAd.style.display = 'inline-block';
  newAd.style.width = '300px';
  newAd.style.height = '250px';
  newAd.setAttribute('data-ad-client', 'ca-pub-5226913770398471');
  newAd.setAttribute('data-ad-slot', '9360651477');

  // Add new ad to container
  adContainer.appendChild(newAd);

  // Push to AdSense queue
  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.error('AdSense error:', e);
  }
}

// ------- Core: load a random clip (stable)
function loadRandomClip(trigger = 'play') {
  const myRound = ++round;

  // GA4: game_start event
  if (typeof gtag === 'function') {
    gtag('event', 'game_start', { trigger: trigger });
  }
  roundOver = false;                     // round is active again

  // Refresh ad unit at start of new round
  refreshAdUnit();

  setPlayState("loading");
  if (playAgainBtn) playAgainBtn.style.display = "none";
  playBtn.disabled = true;               // disable only while loading
  setButtonsEnabled(false);
  clearUsedMarks();

  // Hide/clear the bottom panel for a fresh round
  const bottom = document.getElementById("bottom-show");
  const bottomBody = document.getElementById("bottom-show-body");
  if (bottom && bottomBody) {
    bottom.style.display = "none";
    bottomBody.innerHTML = "";
  }

  statusEl.textContent = "Picking a random show and track…";
  answerEl.style.display = "none";
  answerEl.textContent = "";
  guessCount = 0;
  current = null;
  // Also hide the answer panel itself
const answerPanel = document.querySelector('.answer-panel');
if (answerPanel) answerPanel.style.display = "none";

    // Hard reset audio so old events/buffers can't leak
    try { jamAudio.pause(); } catch (_) {}
    jamAudio.removeAttribute("src");
    jamAudio.load();
    jamAudio.oncanplay = null;

    fetch("/api/random-clip")
  .then(async r => {
    console.log('[load] /api/random-clip status', r.status);
    const data = await r.json().catch(err => {
      console.error('[load] JSON parse error', err);
      return { error: 'bad_json' };
    });
    return data;
  })
      .then(data => {
        if (myRound !== round) return;                  // stale response, ignore
        if (data.error) throw new Error(data.error);

        current = data;
  console.log('[load] api data', current);
        
        // Safety: make sure we actually have a URL
        if (!current || !current.url) {
          console.error("No playable URL in /api/random-clip response:", current);
          statusEl.textContent = "Couldn’t load a clip. Try again.";
          setButtonsEnabled(true);
          return;
        }

        // Cache-bust so we never reuse an old audio buffer
        const src = current.url;
        const cacheBust = (src.includes("?") ? "&" : "?") + "r=" + Date.now();
        jamAudio.src = src + cacheBust;
        jamAudio.currentTime = 0;
        jamAudio.load();

        jamAudio.oncanplay = () => {
          if (myRound !== round) return;                // stale event, ignore

          // Soft-sync: derive identifier from audio URL and update `current`
          try {
            const idFromUrl = jamAudio.src.split("/download/")[1]?.split("/")[0];
            if (idFromUrl && idFromUrl !== current.identifier) {
              // fetch meta for the *actual* audio so the answer matches the song
              fetch(`/api/show/${encodeURIComponent(idFromUrl)}`)
                .then(r => r.json())
                .then(show => {
                  if (show && show.meta) {
                    current.identifier = idFromUrl;
                    current.title     = show.meta.title     || current.title;
                    current.date      = show.meta.date      || current.date;
                    current.venue     = show.meta.venue     || current.venue;
                    current.location  = show.meta.location  || current.location;
                  }
                })
                .catch(() => {/* ignore meta sync errors */});
            }
          } catch {/* ignore parse issues */}

          setPlayState("playing");
          jamAudio.play().catch(err => {
  console.error('[audio] play() failed', err);
});
          statusEl.textContent = "";
          jamAudio.style.display = "block";
          setButtonsEnabled(true);
        };
      })
      .catch(err => {
        if (myRound !== round) return;
        console.error("random-clip error:", err);
        statusEl.textContent = "Couldn’t load a clip. Try again.";
        setButtonsEnabled(true);
      })
      .finally(() => {
        if (myRound === round) playBtn.disabled = false; // ALWAYS re-enable
      });
  }

// Expose a global starter for round kickoff
window.startRound = function(){ console.log('[round] startRound() called'); loadRandomClip(); };

  // Single, clean listener (no delegated fallback)
playBtn.disabled = false;
  playBtn.addEventListener("click", (e) => {
    e.preventDefault();

    // Don't toggle play/pause if clicking on the progress bar
    if (e.target.classList.contains('progress-bar') ||
        e.target.id === 'progressBar' ||
        e.target.id === 'progressBarPaused') {
      return;
    }

    // If we already have audio, this button is pure Play/Pause transport.
    if (jamAudio.src) {
      if (jamAudio.paused) {
        jamAudio.play().catch(() => {});
      } else {
        jamAudio.pause();
      }
      return;
    }

    // No audio yet: start the first round.
    loadRandomClip();
  });

  // ------- Easter egg detection
  function getEasterEgg() {
    const trackName = (current.file && (current.file.title || current.file.name)) || "";
    const lower = trackName.toLowerCase();
    if (lower.includes("mind left body")) return { name: "Mind Left Body", multiplier: 10 };
    if (lower.includes("dark star")) return { name: "Dark Star", multiplier: 3 };
    return null;
  }

  // ------- Guess handling (3 guesses with year buttons)
  yearGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || btn.disabled) return;
    if (roundOver) {
      statusEl.textContent = "This round is over. Use Play Again to start a new round.";
      btn.blur();
      return;
    }
    if (!current || !current.date) return;

    const guess = parseInt(btn.dataset.year, 10);
    const correct = parseInt(String(current.date).slice(0,4), 10);

    guessCount++;
    btn.classList.add("used");
    btn.disabled = true;

    if (guess === correct) {
      // Correct guess - calculate base points
      let basePts = 0;
      if (guessCount === 1) basePts = 3;
      else if (guessCount === 2) basePts = 2;
      else if (guessCount === 3) basePts = 1;

      const egg = getEasterEgg();
      if (egg) {
        const total = basePts * egg.multiplier;
        btn.textContent = `${total}pts (${egg.multiplier}X)`;
        btn.classList.remove("used");
        btn.classList.add("bonus");
      } else {
        btn.textContent = basePts + (basePts === 1 ? "pt" : "pts");
        btn.classList.remove("used");
        btn.classList.add("correct");
      }
      onWin(egg);
    } else if (guessCount < MAX_GUESSES) {
      // Incorrect guess - show "Nope"
      btn.textContent = "Nope";
    } else {
      // Final incorrect guess - show "0pts"
      btn.textContent = "0pts";
      onOutOfGuesses(correct);
    }
  });

  function onWin(easterEgg) {
    roundOver = true;                        // lock the round
    jamAudio.oncanplay = null;               // prevent stale handler from overriding round-end state
    setButtonsEnabled(false);

    const showTitle = cleanShowTitle(current.title, current.date, current.venue);
    const trackName = (current.file && (current.file.title || current.file.name)) || "";

    // Store for share feature
    lastSongName = trackName || "a jam";
    lastYear = current.date ? String(current.date).slice(0, 4) : "";

    // Build bonus callout HTML
    let bonusHtml = "";
    if (easterEgg) {
      bonusHtml = `<div style="margin-top:6px; font-size:16px; font-weight:700; color:#F3B23E;">${easterEgg.name} bonus! ${easterEgg.multiplier}X points!</div>`;
    }

    // Sign-in prompt for anonymous users (prominent card style)
    const signInPrompt = !window.currentUser
      ? `<div style="margin:16px 0; padding:16px; background:linear-gradient(135deg, rgba(45,106,79,0.15) 0%, rgba(45,106,79,0.08) 100%); border:2px solid #2d6a4f; border-radius:12px; text-align:center;">
           <div style="font-size:16px; font-weight:700; color:#2d6a4f; margin-bottom:4px;">🎸 Track Your Score!</div>
           <div style="font-size:14px; color:#444;">Sign in or create an account — no email needed!</div>
         </div>`
      : "";

    answerEl.style.display = "block";
const answerPanel = document.querySelector('.answer-panel');
if (answerPanel) answerPanel.style.display = "block";
    answerEl.innerHTML = `
      ${signInPrompt}
      <div style="margin-top:6px;">
        <strong>${showTitle}</strong>
        ${trackName ? `<div style="margin-top:4px; font-size:18px; font-weight:600; color:#5B8FA3;">${trackName}</div>` : ""}
        ${bonusHtml}
      </div>
    `;

    // Render track list under the answer
    if (current?.identifier) {
      fetch(`/api/show/${encodeURIComponent(current.identifier)}`)
        .then(r => r.json())
        .then(show => {
          if (show && !show.error) {
            renderTracksUnderAnswer(show.tracks || []);
          } else {
            answerEl.innerHTML += `<p class="note" style="margin-top:6px;">Couldn't load track list.</p>`;
          }
        })
        .catch(() => {
          answerEl.innerHTML += `<p class="note" style="margin-top:6px;">Couldn't load track list.</p>`;
        });
    }

    // Award points: base 1st → 3, 2nd → 2, 3rd → 1, then apply easter egg multiplier
    let pts = 0;
    if (guessCount === 1) pts = 3;
    else if (guessCount === 2) pts = 2;
    else if (guessCount === 3) pts = 1;

    if (easterEgg) {
      pts = pts * easterEgg.multiplier;
    }

    console.log("[CLIENT] scoring win", { guessCount, pts, easterEgg });

    // GA4: round_completed and round_completed_won events
    const correctYear = parseInt(String(current.date).slice(0,4), 10);
    if (typeof gtag === 'function') {
      gtag('event', 'round_completed', {
        points: pts,
        guesses_used: guessCount,
        correct_year: correctYear
      });
      gtag('event', 'round_completed_won', {
        points: pts,
        guesses_used: guessCount,
        correct_year: correctYear
      });
      // easter_egg_found event
      if (easterEgg) {
        gtag('event', 'easter_egg_found', {
          egg_name: easterEgg.name,
          multiplier: easterEgg.multiplier,
          points_earned: pts
        });
      }
    }

    // Update session stats
    window.sessionRounds++;
    window.sessionPoints += pts;
    updateSessionStats();

    // keep a running total on the client so the auth box can show it
    if (typeof window.currentScore !== "number") {
      window.currentScore = 0;
    }
    window.currentScore += pts;
    const authedScoreEl = document.getElementById("authedScoreValue");
    const mobileAuthedScoreEl = document.getElementById("mobileAuthedScore");
    if (authedScoreEl) {
      authedScoreEl.textContent = window.currentScore;
    }
    if (mobileAuthedScoreEl) {
      mobileAuthedScoreEl.textContent = window.currentScore;
    }

    // send just THIS round's points to the server; server aggregates
    fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: pts })
    }).then(() => {
      if (typeof window.refreshLeaderboard === "function") {
        window.refreshLeaderboard();
      } else {
        // retry once in case index.html script defined it later
        setTimeout(() => {
          if (typeof window.refreshLeaderboard === "function") {
            window.refreshLeaderboard();
          }
        }, 500);
      }
    }).catch(() => {});

    if (playAgainBtn) {
      playAgainBtn.style.display = "inline-flex";
      playAgainBtn.dataset.visible = "true";
    }
    if (playBtn) {
      playBtn.dataset.roundOver = "true";
    }

    // Switch to end-of-round state
    if (!jamAudio.paused) {
      setPlayState("round-end");
    } else {
      setPlayState("round-end-paused");
    }

    // Rotate sponsor content for next round
    rotateSponsorContent();
  }

function onOutOfGuesses(correctYear) {
  roundOver = true;                        // lock the round
  jamAudio.oncanplay = null;               // prevent stale handler from overriding round-end state
  setButtonsEnabled(false);

  const showTitle = cleanShowTitle(current.title, current.date, current.venue);
  const trackName = (current.file && (current.file.title || current.file.name)) || "";

  // Store for share feature
  lastSongName = trackName || "a jam";
  lastYear = current.date ? String(current.date).slice(0, 4) : "";

  // Sign-in prompt for anonymous users (prominent card style)
  const signInPrompt = !window.currentUser
    ? `<div style="margin:16px 0; padding:16px; background:linear-gradient(135deg, rgba(45,106,79,0.15) 0%, rgba(45,106,79,0.08) 100%); border:2px solid #2d6a4f; border-radius:12px; text-align:center;">
         <div style="font-size:16px; font-weight:700; color:#2d6a4f; margin-bottom:4px;">🎸 Track Your Score!</div>
         <div style="font-size:14px; color:#444;">Sign in or create an account — no email needed!</div>
       </div>`
    : "";

  answerEl.style.display = "block";
const answerPanel = document.querySelector('.answer-panel');
if (answerPanel) answerPanel.style.display = "block";
  answerEl.innerHTML = `
    ${signInPrompt}
    <div style="margin-top:6px;">
      <strong>${showTitle}</strong>
      ${trackName ? `<div style="margin-top:4px; font-size:18px; font-weight:600; color:#5B8FA3;">${trackName}</div>` : ""}
    </div>
  `;

  if (current?.identifier) {
    fetch(`/api/show/${encodeURIComponent(current.identifier)}`)
      .then(r => r.json())
      .then(show => {
        if (show && !show.error) {
          renderTracksUnderAnswer(show.tracks || []);
          // renderShowBottom(show); // disabled to avoid duplicate list
        } else {
          answerEl.innerHTML += `<p class="note" style="margin-top:6px;">Couldn't load track list.</p>`;
        }
      })
      .catch(() => {
        answerEl.innerHTML += `<p class="note" style="margin-top:6px;">Couldn't load track list.</p>`;
      });
  }

  // Update session stats (0 points)
  window.sessionRounds++;
  updateSessionStats();

  // GA4: round_completed and round_completed_lost events
  if (typeof gtag === 'function') {
    gtag('event', 'round_completed', {
      points: 0,
      guesses_used: MAX_GUESSES,
      correct_year: correctYear
    });
    gtag('event', 'round_completed_lost', {
      correct_year: correctYear
    });
  }

  // No points when out of guesses
  fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ score: 0 })
  }).then(() => {
    if (typeof window.refreshLeaderboard === "function") {
      window.refreshLeaderboard();
    } else {
      setTimeout(() => {
        if (typeof window.refreshLeaderboard === "function") {
          window.refreshLeaderboard();
        }
      }, 500);
    }
  }).catch(() => {});

  if (playAgainBtn) {
    playAgainBtn.style.display = "inline-flex";
    playAgainBtn.dataset.visible = "true";
  }
  if (playBtn) {
    playBtn.dataset.roundOver = "true";
  }

  // Switch to end-of-round state
  if (!jamAudio.paused) {
    setPlayState("round-end");
  } else {
    setPlayState("round-end-paused");
  }

  // Rotate sponsor content for next round
  rotateSponsorContent();
}

  // ------- Right panel rendering helpers
  function restoreRightPanel() {
    if (listenPanelBody) listenPanelBody.innerHTML = rightOriginalHTML;
  }

  function renderShowRight(show) {
    if (!listenPanelBody) return;
    const meta = show.meta || {};
    const tracks = show.tracks || [];
    const title = meta.title || `${meta.date || ""} — ${meta.venue || ""}`;
    let html = `
      <p class="note"><a href="#" id="backToBrowse">← Back to Browse</a></p>
      <h3>${title}</h3>
      <div style="margin-bottom:10px; color:#d1d5db;">
        ${meta.date || ""}${meta.venue ? " • " + meta.venue : ""}${meta.location ? " • " + meta.location : ""}
      </div>
      <audio id="rightAudio" controls style="width:100%;"></audio>
      <h4 style="margin-top:12px;">Setlist</h4>
    `;
    if (!tracks.length) {
      html += `<p>No track list available.</p>`;
    } else {
      html += `<ol id="trackList" style="padding-left:20px;">`;
      tracks.forEach((t) => {
        const label = t.title || t.name;
        const len = t.length ? ` <span style="color:#9ca3af;">(${t.length})</span>` : "";
        html += `<li style="margin:6px 0;">
          <a href="#" data-url="${t.url}" class="playTrack">${label}</a>${len}
        </li>`;
      });
      html += `</ol>`;
    }
    listenPanelBody.innerHTML = html;

    document.getElementById("backToBrowse").onclick = (e)=>{ e.preventDefault(); restoreRightPanel(); };

    const audio = document.getElementById("rightAudio");
    if (tracks.length) {
      audio.src = tracks[0].url;
      audio.load();
    }

    Array.from(document.getElementsByClassName("playTrack")).forEach(a => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const url = a.getAttribute("data-url");
        audio.src = url;
        audio.play().catch(()=>{});
      });
    });
  }

  function exploreExactShow() {
    if (!current?.identifier) return;
    fetch(`/api/show/${encodeURIComponent(current.identifier)}`)
      .then(r => r.json())
      .then(show => {
        if (show.error) throw new Error(show.error);
        renderShowBottom(show);
      })
      .catch(err => {
        console.error(err);
        if (listenPanelBody) {
          listenPanelBody.innerHTML = `<p class="note"><a href="#" id="backToBrowse">← Back to Browse</a></p><p>Error loading show details.</p>`;
          document.getElementById("backToBrowse").onclick = (e)=>{e.preventDefault(); restoreRightPanel();};
        }
      });
  }

  // Play Again button handler
  if (playAgainBtn) {
    playAgainBtn.addEventListener("click", () => {
      roundOver = false;
      loadRandomClip('play_again');
      playAgainBtn.style.display = "none";
      playAgainBtn.dataset.visible = "false";
      if (playBtn) {
        playBtn.dataset.roundOver = "false";
      }
    });
  }

  // Share button handler (shared logic for desktop and mobile)
  function handleShare(btn) {
    // Get all-time score
    const allTimeScore = window.currentScore || 0;

    // Build share text
    let shareText = `Grateful Dead Guess the Year Game⚡`;
    if (lastSongName && lastYear) {
      shareText += `${lastSongName} - ${lastYear}, `;
    }
    shareText += `${allTimeScore} Score⚡mindleftbodygame.com`;

    // Copy to clipboard
    navigator.clipboard.writeText(shareText).then(() => {
      // Show feedback on both buttons
      if (shareBtn) {
        shareBtn.textContent = "Copied! ✌️";
        shareBtn.classList.add("copied");
      }
      if (mobileShareBtn) {
        mobileShareBtn.textContent = "Copied! ✌️";
        mobileShareBtn.style.background = "#1e4d3a";
      }

      // Reset after 2 seconds
      setTimeout(() => {
        if (shareBtn) {
          shareBtn.textContent = "Copy to Share Result";
          shareBtn.classList.remove("copied");
        }
        if (mobileShareBtn) {
          mobileShareBtn.textContent = "Copy to Share Result";
          mobileShareBtn.style.background = "#2d6a4f";
        }
      }, 2000);

      // GA4 event
      if (typeof gtag === 'function') {
        gtag('event', 'share_result', {
          all_time_score: allTimeScore,
          song_name: lastSongName,
          year: lastYear
        });
      }
    }).catch(() => {
      // Fallback for older browsers
      btn.textContent = "Copy failed";
      setTimeout(() => {
        btn.textContent = "Copy to Share Result";
      }, 2000);
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", () => handleShare(shareBtn));
  }
  if (mobileShareBtn) {
    mobileShareBtn.addEventListener("click", () => handleShare(mobileShareBtn));
  }

  // Initialize first ad on page load
  try {
    (adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.error('Initial AdSense load error:', e);
  }
});