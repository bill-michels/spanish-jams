document.addEventListener("DOMContentLoaded", () => {
  // ------- Elements
  const playBtn  = document.getElementById("playBtn");
  const jamAudio = document.getElementById("jamAudio");
  const statusEl = document.getElementById("gameStatus");
  const answerEl = document.getElementById("answer");
  const yearGrid = document.getElementById("yearGuess");
  const listenPanelBody = document.querySelector("#tab-listen .panel-body");
  const rightOriginalHTML = listenPanelBody ? listenPanelBody.innerHTML : "";

  if (!playBtn || !jamAudio || !statusEl || !answerEl || !yearGrid) {
    console.error("Required elements missing. Check index.html IDs.");
    return;
  }

  // ------- State (declare ONCE)
  let current = null;     // {identifier,date,title,venue,location,file?,url}
  let guessCount = 0;     // 0..3
  let round = 0;          // increments each time Play is clicked
  const MAX_GUESSES = 3;

  // ------- Utilities
  function setButtonsEnabled(enabled) {
    Array.from(yearGrid.querySelectorAll("button")).forEach(b => { b.disabled = !enabled; });
  }
  function clearUsedMarks() {
    Array.from(yearGrid.querySelectorAll("button")).forEach(b => b.classList.remove("used"));
  }
  function cleanShowTitle(title, date, venue) {
    const raw = title || `${(date || "").split("T")[0]} — ${venue || ""}`;
    return raw.replace(/^Grateful Dead Live at\s*/i, "");
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

  // ------- Core: load a random clip (stable)
  function loadRandomClip() {
    const myRound = ++round;
    playBtn.disabled = true;               // disable only while loading
    setButtonsEnabled(false);
    clearUsedMarks();

    statusEl.textContent = "Picking a random show and track…";
    answerEl.style.display = "none";
    answerEl.textContent = "";
    guessCount = 0;
    current = null;

    // Hard reset audio so old events/buffers can't leak
    try { jamAudio.pause(); } catch (_) {}
    jamAudio.removeAttribute("src");
    jamAudio.load();
    jamAudio.oncanplay = null;

    fetch("/api/random-clip")
      .then(r => r.json())
      .then(data => {
        if (myRound !== round) return;                  // stale response, ignore
        if (data.error) throw new Error(data.error);

        current = data;

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

          jamAudio.play().catch(()=>{});
          statusEl.textContent = "Guess 1 of 3: Pick a year.";
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

  // Single, clean listener (no delegated fallback)
  playBtn.disabled = false;
  playBtn.addEventListener("click", (e) => {
    e.preventDefault();
    loadRandomClip();
  });

  // ------- Guess handling (3 guesses with year buttons)
  yearGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || btn.disabled) return;
    if (!current || !current.date) return;

    const guess = parseInt(btn.dataset.year, 10);
    const correct = parseInt(String(current.date).slice(0,4), 10);

    guessCount++;
    btn.classList.add("used");
    btn.disabled = true;

    if (guess === correct) {
      onWin();
    } else if (guessCount < MAX_GUESSES) {
      statusEl.textContent = `❌ Guess ${guessCount} wrong. Try again — ${MAX_GUESSES - guessCount} left.`;
    } else {
      onOutOfGuesses(correct);
    }
  });

  function onWin() {
    setButtonsEnabled(false);
    statusEl.textContent = `✅ You nailed it on guess ${guessCount}!`;

    const showTitle = cleanShowTitle(current.title, current.date, current.venue);
    const trackName = (current.file && (current.file.title || current.file.name)) || "";

    answerEl.style.display = "block";
    answerEl.innerHTML = `
      <div style="margin-top:6px;">
        <strong>${showTitle}</strong>
        ${trackName ? `<div style="margin-top:4px; color:#d1d5db;">${trackName}</div>` : ""}
        <div style="margin-top:6px;">
          <a href="#" id="exploreLink">Explore this show</a>
        </div>
      </div>
    `;

    const link = document.getElementById("exploreLink");
    if (link) link.addEventListener("click", (e) => { e.preventDefault(); exploreExactShow(); });
  }

  function onOutOfGuesses(correctYear) {
    setButtonsEnabled(false);
    statusEl.textContent = `❌ Out of guesses. The correct year was ${correctYear}.`;

    const showTitle = cleanShowTitle(current.title, current.date, current.venue);
    const trackName = (current.file && (current.file.title || current.file.name)) || "";

    answerEl.style.display = "block";
    answerEl.innerHTML = `
      <div style="margin-top:6px;">
        <strong>${showTitle}</strong>
        ${trackName ? `<div style="margin-top:4px; color:#d1d5db;">${trackName}</div>` : ""}
        <div style="margin-top:6px;">
          <a href="#" id="exploreLink">Explore this show</a>
        </div>
      </div>
    `;

    const link = document.getElementById("exploreLink");
    if (link) link.addEventListener("click", (e) => { e.preventDefault(); exploreExactShow(); });
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
        renderShowRight(show);
      })
      .catch(err => {
        console.error(err);
        if (listenPanelBody) {
          listenPanelBody.innerHTML = `<p class="note"><a href="#" id="backToBrowse">← Back to Browse</a></p><p>Error loading show details.</p>`;
          document.getElementById("backToBrowse").onclick = (e)=>{e.preventDefault(); restoreRightPanel();};
        }
      });
  }
});