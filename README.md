# BA Workbench — self-hosted on Vercel

This is the same BA capacity & sequencing tracker, restructured to run entirely
outside Claude — anyone with the link can open and use it, no Claude account
of any kind required (Enterprise seat, personal plan, nothing).

**What changed from the Claude artifact version:** only the storage layer.
Instead of Claude's `window.storage`, this talks to a tiny serverless
function (`api/state.js`) backed by Upstash Redis (installed via Vercel's
Marketplace — this is the same underlying database the old "Vercel KV"
product used to run on, before Vercel discontinued it as a first-party
product in favor of the Marketplace model). Every other line of the app —
Tracker, BA Availability, Dashboard, Archive, Approvals, Activity Log,
sorting, filters, CSV import — is unchanged.

## File layout

```
├── package.json          dependency: @upstash/redis
├── api/
│   └── state.js          serverless function: GET/POST the shared state
├── public/
│   └── index.html        the entire app (frontend, unchanged logic)
├── .env.example           shows the two credential names it needs
└── .gitignore
```

## Step 1 — Create a free Vercel account

Go to https://vercel.com/signup if you don't already have one. The Hobby
(free) tier is plenty for this — a database with this much data is nowhere
near any usage limit.

## Step 2 — Get the project onto Vercel

Two ways to do this — pick whichever you're more comfortable with:

### Option A: Vercel CLI (fastest, no GitHub needed)
```bash
npm install -g vercel      # one-time install
cd ba-work-tracker         # this folder
vercel                     # follow the prompts, accept defaults
vercel --prod              # deploy to your permanent production URL
```

### Option B: GitHub + Vercel dashboard (better if you'll want updates later)
1. Create a new GitHub repository and upload this folder's contents to it
   (GitHub's website supports drag-and-drop file upload — no Git command
   line needed).
2. In the Vercel dashboard, click **Add New... → Project**, then
   **Import** the repo you just created.
3. Leave all build settings as default (Vercel auto-detects this project
   type) and click **Deploy**.

Either way, the deploy will likely show an error on first run — that's
expected, because the database doesn't exist yet. Continue to Step 3.

## Step 3 — Create the Upstash Redis database and connect it

Vercel discontinued its own "Vercel KV" product, so this step now goes
through the **Marketplace** instead of a direct "KV" button — if you've
seen older tutorials mention "Create Database → KV", that option no longer
exists; use these steps instead:

1. In your Vercel project dashboard, open the **Storage** tab.
2. Click **Create Database**.
3. You'll see first-party options like **Blob** and **Edge Config** at the
   top — skip those, they're for files and config data, not this. Scroll
   down to the **Marketplace Database Providers** section.
4. Find **Upstash** and select it. Choose **Redis** as the database type.
5. Give it any name (e.g. `ba-tracker-redis`) and create it — you may be
   asked to authorize the Upstash integration the first time; that's normal.
6. Once created, click **Connect Project**, select this project, and
   confirm. **This automatically adds the required environment variables
   to your project for you** — nothing to copy or paste for the live
   deployment.
7. **If you also want to paste the credentials in yourself** (for local
   testing, or if auto-connect doesn't apply to your setup): open the new
   database's own page and look for its REST API credentials —
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Copy those into
   a file named `.env.local` in this project folder (there's an
   `.env.example` already here showing the exact format), or paste them
   into **Project Settings → Environment Variables** in the Vercel
   dashboard if you skipped auto-connect.
8. **Redeploy** (Vercel dashboard → Deployments → ⋯ → Redeploy, or run
   `vercel --prod` again from the CLI) so the new environment variables
   take effect.

## Step 4 — Confirm it works

Open your deployment URL (something like `ba-work-tracker.vercel.app`).
You should see the dashboard load with the sample data. Add or edit a
request, then reload the page — if your change is still there, storage is
wired up correctly. Share that URL with your EM/PMs and BAs; that's the
whole rollout.

## Updating the app later

If you come back and ask for more changes, I'll hand you an updated
`public/index.html` (and/or `api/state.js`) to swap into this same project —
just replace the file and redeploy (`vercel --prod`, or push to GitHub if
using Option B). The database and its data are untouched by a redeploy;
only deleting the database itself would erase the data.

## Notes

- **No seats, no logins, no Claude account needed for anyone** — this is now
  a completely independent web app on your own infrastructure.
- **Data limits:** Upstash's free tier is generous for this use case (a
  single JSON blob holding all requests, names, and activity log) — you
  won't come close to hitting it at this team's scale.
- **Custom domain:** if you'd rather this live at something like
  `tracker.yourcompany.com` instead of a `.vercel.app` address, that's a
  Vercel Project Settings → Domains step — ask if you'd like help with that.
