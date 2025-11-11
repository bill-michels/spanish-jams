# 🎸 Live Music App (“Mind Left Body”)

A web app that is a music game that tests a players knowledge of live Grateful Dead shows. It plays a random song, and the player has to guess the year. There is scoring and leaderboard. The music is powered by Archive.org content — built with **Node.js**, **Express**, and a simple browser UI (`index.html`, `styles.css`, `game.js`).

---

## 📁 Repository

**GitHub:** [bill-michels/spanish-jams](https://github.com/bill-michels/spanish-jams)

**Primary branch:** `main`  
**Entry point:** `server.js`

---

## ⚙️ Project Overview

| Component | Path | Description |
|------------|------|--------------|
| Server | `server.js` | Express app serving static files and fetching random clips from Archive.org |
| Client | `/public/index.html` | Main front-end page |
| Script | `/public/game.js` | Client logic for user interaction, clip playback, etc. |
| Styles | `/public/styles.css` | Basic styling |
| Database | `better-sqlite3` | Lightweight local storage for users, scores, or favorites |
| Auth | `cookie-session`, `bcryptjs`, `validator`, optional `google-auth-library` |

---

## 🧩 Dependencies

**Runtime:**
```json
"bcryptjs": "^3.0.2",
"better-sqlite3": "^12.2.0",
"cookie-session": "^2.1.1",
"express": "^5.1.0",
"google-auth-library": "^10.3.0",
"node-fetch": "^2.7.0",
"validator": "^13.15.15"
```

**Dev:**
```json
"nodemon": "^3.1.10"
```

---

## 🧠 How to Run Locally

```bash
git clone https://github.com/bill-michels/spanish-jams.git
cd spanish-jams
npm install
node server.js
```

or during development:

```bash
npm run dev
```

Then open:  
👉 http://localhost:3000

---

## 🧰 VS Code Setup

### Debugging
Add a `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Server: npm run dev",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "dev"],
  "console": "integratedTerminal"
}
```

### Formatting & Linting
Add `.prettierrc` and `.eslintrc.json` (see project setup doc for samples).  
Enable **Format on Save** in VS Code preferences.

---

## 🌐 Environment Variables

Create a `.env` file at the root:
```
PORT=3000
NODE_ENV=development
ARCHIVE_API_BASE=https://archive.org
SESSION_SECRET=your_secret_here
```

Add `.env.example` (without secrets) to your repo.

---

## 🧪 GitHub Workflow

When ready, create `.github/workflows/ci.yml` to lint/test automatically on push:
```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci || npm install
      - run: npm run lint --if-present
      - run: npm test --if-present
```

---

## ⚠️ Known Issues

### `archive.org` Timeout
```
ConnectTimeoutError: Connect Timeout Error (archive.org:443, timeout: 10000ms)
```
This means the Archive.org API occasionally stalls or rate-limits.  
**Workarounds:**
- Increase the timeout in your `fetch` request (`AbortController` → 20000 ms).  
- Add retry logic with backoff.  
- Cache successful clip responses locally.

---

## 🚀 Next Steps

- [ ] Push to a live url.
- [ ] Add retry + caching for Archive.org requests.  
- [ ] Connect user sessions (with cookie-session).  
- [ ] Style front-end hero section (via Figma mockup).  
- [ ] Add optional “Buy Me a Coffee” donation link.  
- [ ] Deploy to Render or Vercel for demo access.

---
---
### 🔒 Hardening & Security Notes (Nov 2025)

**Backend:**
- Added **bcrypt** password hashing  
- Added **Helmet** for security headers + strong Content Security Policy (CSP)  
- Added **rate limiting** on `/api/*` routes  
- Added **input validation** for all API endpoints (especially `/api/show/:id` and `/api/score`)  
- Sessions use `.env`-defined `SESSION_SECRET` (excluded via `.gitignore`)  
- CSP tightened with external allowances for Archive.org media  

**Environment:**
- `.env` now required locally; template provided as `.env.example`
- `NODE_ENV` respected for dev/prod  

**Repo hygiene:**
- `.gitignore` excludes sensitive files (`.env`, `.sqlite`, logs)
- `.env.example` added
- Stable snapshot committed on branch: `main`
- Current design work continues on branch: `feature/figma-integration`

## 🧭 Credits

Created by **Bill Michels**  
Grateful Dead inspired • Node.js + Express + Archive.org API