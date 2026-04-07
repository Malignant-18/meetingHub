# Mr.Minutes

An AI-powered meeting intelligence hub for turning long transcript files into searchable decisions, action items, sentiment insights, and contextual chat.

## Project Title

Mr.Minutes: Meeting Intelligence Hub

## The Problem

Modern teams generate long meeting transcripts, but very few people have time to read them end to end. Important decisions, action items, concerns, and reasoning often get buried in pages of dialogue, which leads to repeated follow-up questions, missed context, and execution delays.

## The Solution

Mr.Minutes provides a structured workflow for uploading meeting transcripts, organizing them by project, extracting decisions and action items, analyzing speaker sentiment, and querying the content through a chat interface with transcript references. The platform supports both meeting-level and project-level analysis so teams can review a single discussion or understand patterns across multiple meetings.

## Tech Stack

- Programming Languages
  - TypeScript
  - JavaScript
- Frameworks and Libraries
  - Next.js 14
  - React
  - Tailwind CSS
  - Recharts
  - React Joyride
  - Lucide React
- Authentication
  - Clerk
- Database and ORM
  - PostgreSQL via Supabase
  - Prisma
- Storage
  - Supabase Storage
- AI and External APIs
  - Google Gemini API
- Hosting
  - Vercel

## Key Features

- Multi-transcript upload with `.txt` and `.vtt` support
- New project or existing project upload flow
- Transcript parsing with speaker and segment extraction
- Decision and action item extraction
- Meeting-level and project-level sentiment analysis
- Meeting and project chat with source-linked transcript references
- Dashboard, project workspace, meeting detail view, and dedicated chat workspace

## Setup Instructions

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

Create a `.env.local` file in the project root and add:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SERVICE_ROLE_KEY=

DATABASE_URL=
DIRECT_URL=

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Generate Prisma client

```bash
npx prisma generate
```

### 4. Sync the database schema

```bash
npx prisma db push
```

### 5. Run the project locally

```bash
npm run dev
```

Then open:

```bash
http://localhost:3000
```

## Deployment Notes

For Vercel deployment:

- add all environment variables in the Vercel dashboard
- use `prisma generate && next build` as the build command if needed
- run `npx prisma db push` against the production database after first deploy
- update Clerk redirect URLs and allowed origins to match the deployed domain

## Demo Flow

1. Sign up or log in
2. Create a project and upload one or more transcripts
3. Open a meeting and run AI analysis
4. View extracted decisions, action items, and sentiment insights
5. Open the chat workspace and ask questions with transcript-backed references
