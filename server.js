// server.js

console.log("BOOT: using", __filename);

// Minimal Express backend for Spanish Jams (Guess the Year game)

const path = require("path");
const express = require("express");
const cookieSession = require("cookie-session");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

// Node 18+ has global fetch (your Node is v22.x), so no polyfill needed.

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Sessions ----------
app.use(cookieSession({
  name: "sj_session",
  secret: "replace-with-a-long-random-key",
  httpOnly: true,
  sameSite: "lax",
  maxAge: 1000 * 60 * 60 * 24 * 30
}));

// ---------- Static files ----------
app.use(express.static(path.join(__dirname, "public")));

// ---------- SQLite setup ----------
const db = new Database(path.join(__dirname, "db.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Users table (username + password) and Scores table
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`).run();

// Prepared statements
const getUserByName = db.prepare(`SELECT * FROM users WHERE username = ?`);
const createUser    = db.prepare(`INSERT INTO users (username, password) VALUES (?, ?)`);
const getUserById   = db.prepare(`SELECT * FROM users WHERE id = ?`);
const insertScore   = db.prepare(`INSERT INTO scores (user_id, points) VALUES (?, ?)`);

const topLeaderboard = db.prepare(`
  SELECT u.username AS name, SUM(s.points) AS total_points, COUNT(*) AS games
  FROM scores s
  JOIN users u ON u.id = s.user_id
  GROUP BY s.user_id
  ORDER BY total_points DESC, games DESC, name ASC
  LIMIT 20
`);

// ---------- Root -> index.html ----------
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
    const theFiles = (meta && meta.files) || [];

    // 5) Choose playable MP3; prefer >=180s
    const mp3s = theFiles.filter(f => typeof f.name === "string" && f.name.toLowerCase().endsWith(".mp3"));
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
      date: item.date || show.date || "",
      title: item.title || show.title || "",
      venue: item.venue || show.venue || "",
      location: item.location || show.location || "",
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

// ---------- Auth (username + password) ----------
app.post("/api/register", express.json(), async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    const hashed = await bcrypt.hash(password, 10);

    try {
      const info = createUser.run(username, hashed);
      req.session.userId = info.lastInsertRowid;
      res.json({ success: true, user: { id: info.lastInsertRowid, username } });
    } catch (e) {
      return res.status(409).json({ error: "Username already taken" });
    }
  } catch (e) {
    console.error("register failed:", e);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/login", express.json(), async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = getUserByName.get(username);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    req.session.userId = user.id;
    res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (e) {
    console.error("login failed:", e);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/me", (req, res) => {
  const id = req.session.userId;
  if (!id) return res.json({ user: null });
  const user = getUserById.get(id);
  if (!user) return res.json({ user: null });
  res.json({ user: { id: user.id, username: user.username, name: user.username } });
});

app.post("/api/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// ---------- Score & Leaderboard ----------
app.post("/api/score", express.json(), (req, res) => {
  const id = req.session.userId;
  if (!id) return res.status(401).json({ error: "Sign in required" });
  let { points } = req.body || {};
  points = Number(points);
  if (!Number.isFinite(points) || points < 0) points = 0;
  if (points > 100) points = 100;
  insertScore.run(id, points);
  res.json({ ok: true });
});

app.get("/api/leaderboard", (_req, res) => {
  const rows = topLeaderboard.all();
  res.json({ leaders: rows });
});

// ---------- Simple browse (HTML pages for dev convenience) ----------
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

    let html = `<h1>Shows in ${year}</h1><p><a href=\"/\">← Back</a></p><ul>`;
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

app.get("/search", async (req, res) => {
  try {
    const qRaw = (req.query.q || "").trim();
    const term = qRaw ? qRaw : "";
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

    let html = `<h1>Search Results ${qRaw ? `for “${qRaw}”` : ""}</h1><p><a href=\"/\">← Back</a></p><ul>`;
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

// ---------- Debug helpers ----------
app.get("/debug/routes", (_req, res) => {
  const routes = [];
  app._router?.stack?.forEach(mw => {
    if (mw.route?.path) {
      routes.push({ path: mw.route.path, methods: Object.keys(mw.route.methods).map(m => m.toUpperCase()) });
    }
  });
  res.json(routes);
});

app.get("/_ping", (_req, res) => {
  res.type("text/plain").send("pong");
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});