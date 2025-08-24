// server.js
// Minimal Express backend for Grateful Dead browsing + "Guess the Year" game

const path = require("path");
const express = require("express");
// Node 18+ has global fetch; your Node is v22.x, so no polyfill needed.

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Static files ----------
app.use(express.static(path.join(__dirname, "public")));

// Root -> serve index.html
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------- Helpers ----------
function parseLenSeconds(len) {
  if (len == null) return NaN;
  if (typeof len === "number") return len;
  const s = String(len).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const p = s.split(":").map(Number);
  if (p.some(isNaN)) return NaN;
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  return NaN;
}

function itemDownloadUrl(identifier, filename) {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(filename)}`;
}

// ---------- API: Random clip with uniform year (1966–1995) ----------
app.get("/api/random-clip", async (req, res) => {
  try {
    const startY = parseInt(req.query.start || "1966", 10);
    const endY   = parseInt(req.query.end   || "1995", 10);

    // 1) Pick a year uniformly
    const years = [];
    for (let y = startY; y <= endY; y++) years.push(y);
    const year = years[Math.floor(Math.random() * years.length)];

    // 2) Find shows in that year within GratefulDead collection
    const q = `collection:GratefulDead AND date:[${year}-01-01 TO ${year}-12-31]`;
    const searchUrl =
      `https://archive.org/advancedsearch.php` +
      `?q=${encodeURIComponent(q)}` +
      `&fl[]=identifier&fl[]=date&fl[]=title&fl[]=venue&fl[]=location` +
      `&rows=1000&sort[]=date+asc&output=json`;

    const sr = await fetch(searchUrl);
    const sd = await sr.json();
    const docs = (sd.response && sd.response.docs) || [];
    if (!docs.length) throw new Error(`No shows found in ${year}`);

    // 3) Pick a random show from that year
    const show = docs[Math.floor(Math.random() * docs.length)];

    // 4) Load authoritative metadata + files
    const metaUrl = `https://archive.org/metadata/${encodeURIComponent(show.identifier)}`;
    const mr = await fetch(metaUrl);
    const meta = await mr.json();

    const item = (meta && meta.metadata) || {};
    const files = (meta && meta.files) || [];

    const ansDate = item.date || show.date || "";
    const ansTitle = item.title || show.title || "";
    const ansVenue = item.venue || show.venue || "";
    const ansLoc   = item.location || show.location || "";

    // 5) Choose playable MP3; prefer >=180s
    const mp3s = files.filter(f => typeof f.name === "string" && f.name.toLowerCase().endsWith(".mp3"));
    if (!mp3s.length) throw new Error("No MP3 files for chosen show");

    const longMp3s = mp3s.filter(f => {
      const sec = parseLenSeconds(f.length);
      return !isNaN(sec) && sec >= 180;
    });

    const pool = longMp3s.length ? longMp3s : mp3s;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const url = itemDownloadUrl(show.identifier, chosen.name);

    res.json({
      identifier: show.identifier,
      date: ansDate,
      title: ansTitle,
      venue: ansVenue,
      location: ansLoc,
      file: { name: chosen.name, title: chosen.title || "", length: chosen.length || "" },
      url
    });
  } catch (err) {
    console.error("random-clip failed:", err);
    res.status(500).json({ error: "Could not load a random clip" });
  }
});

// ---------- API: Exact show (meta + tracks) ----------
app.get("/api/show/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const metaUrl = `https://archive.org/metadata/${encodeURIComponent(id)}`;
    const mr = await fetch(metaUrl);
    const meta = await mr.json();

    const item = (meta && meta.metadata) || {};
    const files = (meta && meta.files) || [];

    const tracks = files
      .filter(f => typeof f.name === "string" && f.name.toLowerCase().endsWith(".mp3"))
      .map(f => ({
        name: f.name,
        title: f.title || "",
        length: f.length || "",
        url: itemDownloadUrl(id, f.name)
      }));

    res.json({
      meta: {
        identifier: id,
        title: item.title || "",
        date: item.date || "",
        venue: item.venue || "",
        location: item.location || ""
      },
      tracks
    });
  } catch (err) {
    console.error("api/show failed:", err);
    res.status(500).json({ error: "Could not load show details" });
  }
});

// ---------- Simple browse by year (HTML page) ----------
app.get("/year/:year", async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    if (isNaN(year)) return res.status(400).send("Invalid year");

    const q = `collection:GratefulDead AND date:[${year}-01-01 TO ${year}-12-31]`;
    const url =
      `https://archive.org/advancedsearch.php` +
      `?q=${encodeURIComponent(q)}` +
      `&fl[]=identifier&fl[]=date&fl[]=title&fl[]=venue&fl[]=location` +
      `&rows=500&sort[]=date+asc&output=json`;

    const r = await fetch(url);
    const data = await r.json();
    const docs = (data.response && data.response.docs) || [];

    let html = `<h1>Shows in ${year}</h1><p><a href="/">← Back</a></p><ul>`;
    for (const d of docs) {
      const date = (d.date || "").split("T")[0];
      const title = d.title || "";
      const venue = d.venue || "";
      html += `<li>${date} — ${title}${venue ? " — " + venue : ""}</li>`;
    }
    html += `</ul>`;
    res.send(html);
  } catch (err) {
    console.error("year route failed:", err);
    res.status(500).send("Error fetching shows");
  }
});

// ---------- Simple search (HTML page) ----------
app.get("/search", async (req, res) => {
  try {
    const qRaw = (req.query.q || "").trim();
    const term = qRaw ? qRaw : ""; // empty = show a lot
    // Search within collection by title/venue/date
    const q = term
      ? `collection:GratefulDead AND (title:${term} OR venue:${term} OR date:${term})`
      : `collection:GratefulDead`;

    const url =
      `https://archive.org/advancedsearch.php` +
      `?q=${encodeURIComponent(q)}` +
      `&fl[]=identifier&fl[]=date&fl[]=title&fl[]=venue&fl[]=location` +
      `&rows=200&sort[]=date+asc&output=json`;

    const r = await fetch(url);
    const data = await r.json();
    const docs = (data.response && data.response.docs) || [];

    let html = `<h1>Search Results ${qRaw ? `for “${qRaw}”` : ""}</h1><p><a href="/">← Back</a></p><ul>`;
    for (const d of docs) {
      const date = (d.date || "").split("T")[0];
      const title = d.title || "";
      const venue = d.venue || "";
      html += `<li>${date} — ${title}${venue ? " — " + venue : ""}</li>`;
    }
    html += `</ul>`;
    res.send(html);
  } catch (err) {
    console.error("search route failed:", err);
    res.status(500).send("Error fetching shows");
  }
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});