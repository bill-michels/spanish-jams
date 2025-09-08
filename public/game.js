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
  let roundOver = false;  // true once a round ends (win or out of guesses)

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
    li.innerHTML = `<a href="#" data-url="${t.url}" class="gt-play">${label}</a>${len}`;
    list.appendChild(li);
  });

  answerEl.appendChild(list);

   // click to play in the same jamAudio element
  Array.from(answerEl.querySelectorAll(".gt-play")).forEach(a => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const url = a.getAttribute("data-url");
      if (!url) return;
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

// ------- Core: load a random clip (stable)
function loadRandomClip() {
  const myRound = ++round;
  roundOver = false;                     // round is active again
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
    if (roundOver) {
      statusEl.textContent = "This round is over. Click “Play the Jam” to start another round.";
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
      onWin();
    } else if (guessCount < MAX_GUESSES) {
      statusEl.textContent = `Guess ${guessCount} wrong. Try again — ${MAX_GUESSES - guessCount} left.`;
    } else {
      onOutOfGuesses(correct);
    }
  });

  function onWin() {
  roundOver = true;                        // lock the round
  setButtonsEnabled(false);
  statusEl.textContent = `You nailed it on guess ${guessCount}!`;

  const showTitle = cleanShowTitle(current.title, current.date, current.venue);
  const trackName = (current.file && (current.file.title || current.file.name)) || "";

  answerEl.style.display = "block";
  answerEl.innerHTML = `
    <div style="margin-top:6px;">
      <strong>${showTitle}</strong>
      ${trackName ? `<div style="margin-top:4px; color:#d1d5db;">${trackName}</div>` : ""}
    </div>
  `;

  // Render track list under the answer
  if (current?.identifier) {
    fetch(`/api/show/${encodeURIComponent(current.identifier)}`)
      .then(r => r.json())
      .then(show => {
        if (show && !show.error) {
          renderTracksUnderAnswer(show.tracks || []);
// renderShowBottom(show); // disabled to avoid duplicate list
        } else {
          answerEl.innerHTML += `<p class="note" style="margin-top:6px;">Couldn’t load track list.</p>`;
        }
      })
      .catch(() => {
        answerEl.innerHTML += `<p class="note" style="margin-top:6px;">Couldn’t load track list.</p>`;
      });
// Award points only if won within 3 guesses: 1st → 3, 2nd → 2, 3rd → 1
let pts = 0;
if (guessCount === 1) pts = 3;
else if (guessCount === 2) pts = 2;
else if (guessCount === 3) pts = 1;

console.log("[CLIENT] scoring win", { guessCount, pts });
fetch("/api/score", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ points: pts })
}).then(() => {
  if (typeof window.refreshLeaderboard === "function") window.refreshLeaderboard();
}).catch(()=>{});
  }
}

function onOutOfGuesses(correctYear) {
  roundOver = true;                        // lock the round
  setButtonsEnabled(false);
  statusEl.textContent = `Out of guesses. The correct year was ${correctYear}.`;

  const showTitle = cleanShowTitle(current.title, current.date, current.venue);
  const trackName = (current.file && (current.file.title || current.file.name)) || "";

  answerEl.style.display = "block";
  answerEl.innerHTML = `
    <div style="margin-top:6px;">
      <strong>${showTitle}</strong>
      ${trackName ? `<div style="margin-top:4px; color:#d1d5db;">${trackName}</div>` : ""}
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
          answerEl.innerHTML += `<p class="note" style="margin-top:6px;">Couldn’t load track list.</p>`;
        }
      })
      .catch(() => {
        answerEl.innerHTML += `<p class="note" style="margin-top:6px;">Couldn’t load track list.</p>`;
      });
// No points when out of guesses
fetch("/api/score", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ points: 0 })
}).then(() => {
  if (typeof window.refreshLeaderboard === "function") window.refreshLeaderboard();
}).catch(()=>{});
  }
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
});