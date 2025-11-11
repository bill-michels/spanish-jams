require('dotenv').config();
console.log("SESSION_SECRET loaded in Node:", !!process.env.SESSION_SECRET);
console.log("NODE_ENV:", process.env.NODE_ENV);

console.log("BOOT: using", __filename);

// Minimal Express backend for Spanish Jams (Guess the Year game)

const path = require("path");
const express = require("express");
const cookieSession = require("cookie-session");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const rateLimit = require('express-rate-limit');
const helmet = require("helmet");
const compression = require("compression");

// Node 18+ has global fetch (your Node is v22.x), so no polyfill needed.

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));

// ---------- Sessions ----------
app.use(cookieSession({
  name: 'session',
  secret: process.env.SESSION_SECRET,
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production'
}));

// ---------- Security & compression ----------
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],                 // no inline scripts allowed
      "style-src": ["'self'", "'unsafe-inline'"], // keep inline styles for now
      "img-src": ["'self'", "data:", "https://archive.org", "https://*.archive.org"],
      "media-src": ["'self'", "https://archive.org", "https://*.archive.org"],
      "connect-src": ["'self'", "https://archive.org", "https://*.archive.org"],
      "frame-ancestors": ["'self'"]
    }
  }
}));
app.use(compression());

// ---------- Global rate limiting for all /api routes ----------
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,            // not "limit"
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', apiLimiter);

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

// Enforce case-insensitive uniqueness at the database level
db.prepare(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_nocase
  ON users(lower(username))
`).run();

// Note: usernames are normalized to lowercase in code for consistent lookups.

db.prepare(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`).run();
// add display_name if it doesn't exist yet
try {
  db.prepare(`ALTER TABLE users ADD COLUMN display_name TEXT`).run();
} catch (e) {
  // will throw if column already exists → ignore
}
// Prepared statements
const getUserByName = db.prepare(`SELECT * FROM users WHERE username = ?`);
const createUser    = db.prepare(`INSERT INTO users (username, password) VALUES (?, ?)`);
const getUserById   = db.prepare(`SELECT * FROM users WHERE id = ?`);
const insertScore   = db.prepare(`INSERT INTO scores (user_id, points) VALUES (?, ?)`);

const topLeaderboard = db.prepare(`
  SELECT
    COALESCE(u.display_name, u.username) AS name,
    SUM(s.points) AS total_points,
    COUNT(*) AS games
  FROM scores s
  JOIN users u ON u.id = s.user_id
  GROUP BY s.user_id
  ORDER BY total_points DESC, games DESC, name ASC
  LIMIT 20
`);
// ---------- Rate limiting for auth endpoints ----------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // limit each IP to 100 auth requests per window
  standardHeaders: true,
  legacyHeaders: false
});

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
const startY = Math.max(1965, Math.min(1995, parseInt(req.query.start || "1966", 10)));
const endY   = Math.max(startY, Math.min(1995, parseInt(req.query.end || "1995", 10)));

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
    if (!/^[A-Za-z0-9._\-]+$/.test(id)) {
  return res.status(400).json({ error: "Invalid show id" });
}
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
app.post("/api/register", authLimiter, express.json(), async (req, res) => {
  try {
    let { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Username and password required" });
    }

    const displayName = username.trim();         // what they typed
    const uname = displayName.toLowerCase();     // canonical

    if (uname.length < 3 || uname.length > 24) {
      return res.status(400).json({ error: "Username must be 3–24 characters" });
    }
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: "Password must be 6–128 characters" });
    }

    const hashed = await bcrypt.hash(password, 10);

    try {
      // insert canonical
      const info = createUser.run(uname, hashed);

      // store pretty version
      db.prepare(`UPDATE users SET display_name = ? WHERE id = ?`).run(displayName, info.lastInsertRowid);

      req.session.userId = info.lastInsertRowid;
      res.json({ success: true, user: { id: info.lastInsertRowid, username: displayName } });
    } catch (e) {
      return res.status(409).json({ error: "Username already taken" });
    }
  } catch (e) {
    console.error("register failed:", e);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/login", authLimiter, express.json(), async (req, res) => {
  try {
    let { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Username and password required" });
    }
    const uname = username.trim().toLowerCase();
    if (uname.length < 3 || uname.length > 24) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = getUserByName.get(uname);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    req.session.userId = user.id;
   const shownName = user.display_name || user.username;
res.json({ success: true, user: { id: user.id, username: shownName } });
  } catch (e) {
    console.error("login failed:", e);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/me", (req, res) => {
  try {
    const id = req.session?.userId;
    console.log("/api/me → session.userId =", id);
    if (!id) {
      return res.json({ user: null });
    }
    const user = getUserById.get(id);
    if (!user) {
      console.log(`/api/me → no user found for id ${id}`);
      return res.json({ user: null });
    }
    const shownName = user.display_name || user.username;
res.json({ user: { id: user.id, username: shownName, name: shownName } });
  } catch (err) {
    console.error("/api/me failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// ---------- Score & Leaderboard ----------
app.post('/api/score', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  // accept different payload shapes from the front end
  const rawScore =
    (req.body && (req.body.score ?? req.body.points ?? req.body.value)) ?? null;

  if (rawScore === null) {
    console.log('/api/score → missing score. body was:', req.body);
    return res.status(400).json({ error: 'score is required' });
  }

  const numericScore = Number(rawScore);
  if (Number.isNaN(numericScore)) {
    return res.status(400).json({ error: 'score must be a number' });
  }

  if (numericScore < 0 || numericScore > 100000) {
    return res.status(400).json({ error: 'score out of range' });
  }

  const userId = req.session.userId;
  try {
    const stmt = db.prepare(`
      INSERT INTO scores (user_id, points)
      VALUES (?, ?)
    `);
    stmt.run(userId, numericScore);
  } catch (err) {
    console.error('/api/score insert failed:', err);
    return res.status(500).json({ error: 'failed to save score' });
  }

  return res.json({ ok: true });
});

app.get("/api/leaderboard", (_req, res) => {
  const rows = topLeaderboard.all();
  const leaderboard = rows.map(r => ({
    username: r.name,
    points: r.total_points,
    games: r.games
  }));
  res.json({ leaderboard });
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
    const qRaw = (req.query.q || "").trim().slice(0, 200);
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