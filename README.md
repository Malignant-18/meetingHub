# Meeting Intelligence Hub

AI-powered meeting analysis platform. Upload transcripts → extract decisions, action items, sentiment, and chat with your meetings.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js 14 (App Router) |
| Auth | Clerk |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma |
| File Storage | Supabase Storage |
| AI | Google Gemini 1.5 Flash |
| Hosting | Vercel |

---

## Day 1 Setup — Do these in order

### Step 1 — Clone and install

```bash
# After unzipping the project folder:
cd meeting-intelligence-hub
npm install
```

---

### Step 2 — Create a Clerk account (Auth)

1. Go to https://clerk.com and click **"Start building for free"**
2. Sign up with GitHub or Google
3. Click **"Create application"**
4. Name it: `Meeting Intelligence Hub`
5. Choose sign-in methods: **Email** and **Google** (recommended)
6. Click **Create application**
7. You'll land on the **API Keys** page — copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → starts with `pk_test_`
   - `CLERK_SECRET_KEY` → starts with `sk_test_`

---

### Step 3 — Create a Supabase project (Database + Storage)

1. Go to https://supabase.com and click **"Start your project"**
2. Sign up with GitHub
3. Click **"New project"**
4. Fill in:
   - Name: `meeting-hub`
   - Database Password: choose a strong password (save it — you'll need it)
   - Region: choose closest to you
5. Click **Create new project** — wait ~2 minutes for it to spin up

#### Get your API keys:
6. Go to **Settings → API**
7. Copy:
   - `Project URL` → your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → your `SUPABASE_SERVICE_ROLE_KEY` (⚠️ keep this secret)

#### Get your database connection strings:
8. Go to **Settings → Database**
9. Scroll to **Connection string** section
10. Select **Transaction mode** (port 6543) → copy → this is your `DATABASE_URL`
    - Replace `[YOUR-PASSWORD]` with the password you chose in step 4
    - Add `?pgbouncer=true` at the end if not already there
11. Select **Session mode** (port 5432) → copy → this is your `DIRECT_URL`
    - Replace `[YOUR-PASSWORD]` with the same password

#### Create storage bucket:
12. Go to **Storage** in the left sidebar
13. Click **"New bucket"**
14. Name: `transcripts`
15. Toggle **Public bucket** to ON (so file URLs work)
16. Click **Create bucket**

---

### Step 4 — Get a Gemini API key

1. Go to https://aistudio.google.com
2. Sign in with Google
3. Click **"Get API key"** in the top left
4. Click **"Create API key"**
5. Select **"Create API key in new project"**
6. Copy the key → this is your `GEMINI_API_KEY`

> The free tier gives you 1,500 requests/day and 1M token context — more than enough.

---

### Step 5 — Configure environment variables

```bash
# Copy the example file
cp .env.local.example .env.local
```

Now open `.env.local` and fill in all the values from the steps above:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres
GEMINI_API_KEY=AIza...
```

---

### Step 6 — Push database schema

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Supabase
npx prisma db push
```

You should see: `Your database is now in sync with your Prisma schema.`

To verify tables were created:
```bash
npx prisma studio
# Opens a browser UI at localhost:5555 showing all tables
```

---

### Step 7 — Run the development server

```bash
npm run dev
```

Open http://localhost:3000

You should see the landing page. Click **"Get started"** to test Clerk auth.

---

## Project Structure

```
app/
  page.tsx              ← Landing page
  dashboard/page.tsx    ← Project list
  upload/page.tsx       ← Transcript uploader
  projects/[id]/page.tsx ← Project detail
  api/
    projects/route.ts   ← POST create project, GET list
    upload/route.ts     ← POST upload + parse transcript
    analyze/route.ts    ← POST extract decisions + actions (Gemini)
    sentiment/route.ts  ← POST tone analysis (Gemini)
    chat/route.ts       ← POST chatbot Q&A (Gemini)
components/
  Navbar.tsx            ← Top navigation with Clerk user button
  UploadForm.tsx        ← Full drag-drop upload UI
lib/
  prisma.ts             ← Prisma client singleton
  supabase.ts           ← Supabase browser + server clients
  gemini.ts             ← All Gemini API calls
  parser.ts             ← .txt and .vtt transcript parser
  types.ts              ← Shared TypeScript types
  utils.ts              ← cn(), formatDate(), formatFileSize()
prisma/
  schema.prisma         ← Full database schema (7 tables)
```

---

## What works today (Day 1)

- [x] Full auth (sign up, sign in, sign out) via Clerk
- [x] Create projects
- [x] Upload .txt and .vtt transcript files
- [x] Auto-parse speakers, segments, word count
- [x] Store files in Supabase Storage
- [x] Store segments in PostgreSQL
- [x] Dashboard with project cards and stats
- [x] Project detail page with meeting list

## Placeholder endpoints (ready for next sessions)

- [ ] `/api/analyze` — wired to Gemini, needs UI component
- [ ] `/api/sentiment` — wired to Gemini, needs chart UI
- [ ] `/api/chat` — wired to Gemini, needs chat panel UI

---

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts — then add all env vars in Vercel dashboard:
# Settings → Environment Variables → add each key from .env.local
```

> After deploying, update your Clerk dashboard:
> Settings → Domains → add your Vercel URL (e.g. `https://your-app.vercel.app`)

---

## Useful commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npx prisma studio    # Visual DB browser
npx prisma db push   # Sync schema changes to Supabase
npx prisma generate  # Regenerate Prisma client after schema changes
```

---

## Supported transcript formats

### Plain text (.txt)
```
John: We should delay the API launch.
Sarah: I agree, let's push to Q3.
[00:10] Mike: What are the risks?
```

### WebVTT (.vtt)
```
WEBVTT

00:00:10.000 --> 00:00:13.000
<v John>We should delay the API launch.

00:00:13.500 --> 00:00:16.000
<v Sarah>I agree, let's push to Q3.
```
