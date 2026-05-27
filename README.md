# Aira Labs Admin Dashboard

A Claude-powered analytics chat interface with direct PostgreSQL access, Google auth, and full charting/mapping capabilities.

---

## Stack

- **Next.js 14** (App Router) — Vercel-native
- **NextAuth v5** — Google OAuth with admin email allowlist
- **Anthropic Claude** — agentic tool use (query DB + generate charts)
- **PostgreSQL** — direct connection via `pg`
- **Recharts** — line, bar, area, scatter, pie, donut, composed
- **Plotly.js** — heatmap, map_points, map_heatmap, map_choropleth
- **Mapbox/OSM** tiles via Plotly mapbox

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Random 32-byte secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `ADMIN_EMAILS` | Comma-separated allowed Google emails |
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Claude API key |

### 3. Google OAuth setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Authorised redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://your-app.vercel.app/api/auth/callback/google` (prod)

### 4. Database access

The app connects directly to your PostgreSQL instance. Make sure:
- Your EC2 security group allows inbound 5432 from Vercel's IP ranges (or use `0.0.0.0/0` with strong password)
- Or use an SSH tunnel / VPC peering for production

### 5. Run locally

```bash
npm run dev
```

---

## Deploying to Vercel

```bash
npx vercel
```

Set all env vars in **Vercel Dashboard → Settings → Environment Variables**.

The `vercel.json` gives the `/api/chat` route a 60s timeout (needed for multi-tool Claude responses).

---

## How it works

1. User signs in with Google → email checked against `ADMIN_EMAILS`
2. Chat message sent to `/api/chat`
3. Claude receives your full DB schema in the system prompt
4. Claude calls `query_database` → runs read-only SQL server-side
5. Claude calls `generate_chart` → spec sent to client for rendering
6. Claude calls `summarise_insight` → stat card rendered in thread
7. All streamed via SSE

---

## Adding more admin users

Update `ADMIN_EMAILS` in your Vercel env vars and redeploy (or just update `.env.local` locally).

---

## Security notes

- Only `SELECT` queries are permitted — all others are blocked server-side
- DB credentials never leave the server
- Sessions are short-lived JWT tokens
- All routes except `/login` and `/api/auth/*` require an active session
