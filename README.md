# Meeting Intelligence Hub

AI-powered meeting analytics that turns hours of transcripts into actionable decisions, tracked action items, sentiment insights, and a contextual query engine—eliminating "Double Work" after meetings.

Meeting Intelligence Hub solves the problem of information loss in long meeting transcripts. Instead of forcing team members to read 20+ pages of dialogue, the system automatically extracts decisions, action items, speaker sentiment, and lets anyone ask natural-language questions across all their meetings—with source-cited answers.

## Project Title

Meeting Intelligence Hub

## The Problem

Organizations hold dozens of internal and client meetings every week, producing hours of audio and video content. Speech-to-text tools can generate transcripts, but a single one-hour meeting can produce a 20+ page document. Nobody has time to read through these to find the specific decisions, action items, or strategic reasoning buried within.

This creates "Double Work"—instead of executing tasks discussed in meetings, team members waste time asking each other, *"What happened in that meeting?"* or *"Did we decide to go ahead with that approach?"* This wastes time, creates confusion, and slows down the entire team.

## The Solution

Meeting Intelligence Hub combines multi-transcript ingestion, AI-powered decision and action-item extraction, speaker sentiment analysis, and a contextual chatbot into a single workflow. Users upload transcripts, the system parses and analyzes them with Google Gemini, and stakeholders get a structured dashboard with decisions, action items, sentiment visualizations, and a chat interface that answers cross-meeting questions with citations.

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Next.js 14 (App Router, Server Components, Server Actions) |
| **Language** | TypeScript 5, React 18 |
| **Authentication** | Clerk (@clerk/nextjs ^5.0.0) |
| **Database** | PostgreSQL, Prisma ORM ^5.14.0 |
| **File Storage** | Supabase Storage (bucket: "transcripts") |
| **AI / LLM** | Google Gemini API (@google/generative-ai, model: gemini-2.5-flash) |
| **Styling** | Tailwind CSS ^3.4.1, shadcn/ui, Radix UI, class-variance-authority |
| **Charts** | Recharts ^2.12.7 (Bar, Pie, Line charts) |
| **Icons** | Lucide React, HugeIcons |
| **UX** | react-dropzone, react-hot-toast, react-joyride (onboarding) |
| **Visual Effects** | OGL (WebGL animated plasma background) |

## Screenshots

| Area | Preview |
|------|---------|
| Landing page with animated plasma background | ![Landing Page](assets/LandingPage.png) |
| Sign-in page (Clerk authentication) | ![Sign In](assets/SignInPage.png) |
| Dashboard with project cards and stats | ![Dashboard](assets/DashboardPagewithMyProjects.png) |
| Interactive onboarding tour (react-joyride) | ![Onboarding](assets/OnboardingTour.png) |
| Project page with meeting list, charts, and AI insights | ![Project Page](assets/ProjectPagewithStats.png) |
| Action Items component with status tracking | ![Action Items](assets/ActionItemsComponent.png) |
| Decisions extraction component | ![Decisions](assets/DecisionsTakenComponent.png) |
| Sentiment analysis dashboard with speaker breakdowns | ![Sentiment](assets/SentimentAnalysis.png) |
| AI chatbot interface with source citations | ![Chatbot](assets/AIChatbotComponent.png) |
| Chat source references linked back to transcript segments | ![Chat Sources](assets/ChatSourceLinkedWithTranscript.png) |

## What Ships Today

### Multi-Transcript Ingestion Portal

- Drag-and-drop and browse-to-select file upload for `.txt` and `.vtt` (WebVTT) transcripts
- Multi-file upload in a single session with 10 MB per-file validation
- File-type validation with clear error messages for unsupported formats
- Automatic meeting date detection from filenames and header content
- Speaker identification and word-count detection during parsing
- Upload summary showing file name, detected meeting date, speaker count, and total word count
- Two-step upload wizard: (1) select or create a project, (2) upload transcript files
- Transcripts stored in Supabase Storage with metadata tracked in PostgreSQL

### Decision and Action Item Extractor

- Gemini-powered AI extraction of decisions and action items from uploaded transcripts
- Action items structured with three fields: **Who** (responsible person), **What** (task), **By When** (deadline)
- Clear differentiation between **Decisions** (team agreements) and **Action Items** (assigned tasks)
- Tabbed table view with clean, readable formatting
- Three-state action-item lifecycle: `PENDING` → `IN_PROGRESS` → `DONE` with clickable status cycling and optimistic UI updates
- CSV export of decisions and action items
- PDF export support
- `ResetMeetingAI` button to clear all AI data and re-analyze a meeting
- Toast notifications with progress feedback during AI analysis

### Contextual Query Engine (Chatbot)

- Chatbot-style interface for natural-language questions across uploaded transcripts
- Two chat scopes: **Meeting-scoped** (single meeting context) and **Project-scoped** (all meetings in a project)
- Gemini-powered answers based on transcript context with source citations
- Source references displayed as clickable chips that open the TranscriptPanel at the cited segment
- Up to 5 chats per project with chat creation limit enforcement
- Chat rename and delete functionality
- Collapsible sidebar navigation between meetings and projects
- Starter suggested questions for empty chats
- Transcript panel integration: click a source citation to jump directly to the relevant transcript segment

### Speaker Sentiment and Tone Analysis

- Gemini-powered sentiment analysis scored 0–100 per speaker per time period (early/mid/late)
- Sentiment labels: `positive`, `neutral`, `negative`, `conflict`
- Overall meeting sentiment score with visual progress bar
- Average sentiment by speaker (bar chart)
- Segment sentiment distribution (stacked bar chart)
- Speaker activity cards with individual sentiment breakdowns
- Sentiment Over Time timeline showing early/mid/late blocks per speaker
- Clickable sentiment blocks that open a modal with the original transcript quote
- Color-coded visual indicators (green for consensus, red for conflict, yellow for uncertainty)

### Dashboard and Project Management

- Dashboard home page with project cards showing quick stats: meeting count, action items, decisions
- Activity charts (Recharts): segments, actions, and decisions per meeting (bar chart)
- Cumulative decisions over time (line chart)
- Cross-meeting decision extractor and action tracker (Project Insights)
- Cross-meeting sentiment summary with speaker breakdowns and meeting timeline
- Full meeting detail view with tabs for Insights, Sentiment, and Chat
- Interactive 3-step onboarding tour (react-joyride) on first dashboard visit

### Authentication and User Management

- Clerk authentication with custom sign-in and sign-up flows
- Middleware-protected routes (all routes except `/`, `/sign-in`, `/sign-up`, and `/api/webhooks` require auth)
- Automatic Clerk-to-PostgreSQL user sync via upsert
- Clerk UserButton in navigation

### Visual Design

- Dark green theme (`#050a00` background, `#26a269` accent, `#69FF97` highlights, `#00E4FF` secondary)
- Animated WebGL Plasma background on landing page (OGL-based fractal shader)
- Custom "plasma-button" CSS with animated gradient borders
- Rounded card design system with backdrop-blur glass effects
- Custom scrollbar styling
- Chat-bubble style transcript viewer with speaker color coding and text highlighting

## Bonus Features (Beyond Minimum Requirements)

These features go beyond the stated minimum requirements:

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Project-Based Organization** | Meetings are grouped into user-defined projects, enabling cross-meeting analysis and project-scoped chat |
| 2 | **Action Item Status Tracking** | Three-state lifecycle (`PENDING` → `IN_PROGRESS` → `DONE`) with optimistic UI updates and clickable status cycling |
| 3 | **Project-Level Analytics Dashboard** | Recharts-powered bar and line charts showing segments, actions, decisions per meeting, and cumulative decisions over time |
| 4 | **Cross-Meeting Insights** | Project-level AI insights that aggregate decisions and sentiment across all meetings in a project |
| 5 | **Dual Chat Scopes** | Meeting-scoped and Project-scoped chats, allowing users to ask questions about a single meeting or across all project meetings |
| 6 | **Chat Management** | Chat rename, delete, and a 5-chat-per-project limit with enforced UI restrictions |
| 7 | **Source-Citation Deep Linking** | Clicking a chat source citation opens the TranscriptPanel at the exact cited segment, not just the file |
| 8 | **Suggested Questions** | Starter prompts for empty chats to guide users on what to ask |
| 9 | **Reset AI Analysis** | `ResetMeetingAI` button to clear all AI-generated data (decisions, actions, sentiment) and re-analyze a meeting |
| 10 | **Interactive Onboarding Tour** | React-joyride guided 3-step tour on first dashboard visit with session persistence |
| 11 | **Animated Plasma Landing Page** | WebGL-powered fractal shader background (OGL) with custom animated gradient button styling |
| 12 | **PDF Export** | In addition to CSV export, PDF export is supported for decisions and action items |
| 13 | **Toast Progress Notifications** | Real-time toast feedback during AI analysis and sentiment processing |
| 14 | **Meeting Status Pipeline** | Meeting model with a status enum (`UPLOADED` → `PARSING` → `PARSED` → `ANALYZING` → `ANALYZED` → `ERROR`) for upload/processing state tracking |
| 15 | **Speaker Search & Filter** | Transcript panel supports text and speaker search/filter with highlighting |
| 16 | **Collapsible Chat Sidebar** | Full-width collapsible sidebar for chat navigation across meetings and projects |
| 17 | **Dark Green Design System** | Custom branded dark theme with glassmorphism cards, custom scrollbar, and animated plasma buttons |

## Database Schema

The schema (`prisma/schema.prisma`) defines 9 models across 3 enums:

- **User** — linked to Clerk via `clerkUserId`, owns Projects
- **Project** — owned by a User, contains Meetings and Chats
- **Meeting** — title, file URL, speaker/word counts, status enum (`UPLOADED`/`PARSING`/`PARSED`/`ANALYZING`/`ANALYZED`/`ERROR`)
- **TranscriptSegment** — speaker, text, timestamps, sequence number
- **ActionItem** — task, responsible person, deadline, status (`PENDING`/`IN_PROGRESS`/`DONE`)
- **Decision** — decision text, optional link to context segment
- **Sentiment** — per-segment score (0–100) and label (`positive`/`neutral`/`negative`/`conflict`)
- **Chat** — scoped to `MEETING` or `PROJECT`, has messages and context links
- **ChatMessage** — role (`user`/`assistant`), content, references (JSON of segment IDs)
- **ChatContext** — junction linking chats to meetings

## Monorepo Layout

```
meeting-hub/
|-- app/                    # Next.js App Router pages and API routes
|   |-- dashboard/          # Dashboard: project overview, stats, onboarding
|   |-- upload/             # Two-step upload wizard
|   |-- chat/               # Chat workspace (list + individual chat detail)
|   |-- projects/[id]/      # Project page with meetings, charts, insights
|   `-- api/                # API routes: upload, analyze, sentiment, projects, chats, action-items
|-- components/             # 17 React components (UI, chat, sentiment, upload, charts, etc.)
|-- lib/                    # 8 utility modules (Gemini AI, parsers, Supabase, Prisma, auth, types)
|-- prisma/
|   `-- schema.prisma       # Database schema (9 models)
|-- assets/                 # 10 screenshot PNGs
|-- middleware.ts            # Clerk auth middleware
|-- next.config.js
|-- tailwind.config.ts
`-- package.json
```

## Architecture

### Frontend

- Next.js 14 App Router with Server Components and Server Actions
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui for styling
- Recharts for data visualization
- Clerk React for authentication
- react-dropzone for file uploads
- react-joyride for onboarding
- react-hot-toast for notifications
- OGL for WebGL animated background

### Backend

- Next.js API Routes (serverless functions)
- PostgreSQL + Prisma ORM
- Supabase Storage for transcript files
- Google Gemini AI for:
  - Decision and action item extraction
  - Speaker sentiment analysis (per-segment, per-speaker)
  - Contextual chatbot Q&A with source citations

### Authentication

- Clerk for user authentication and session management
- Middleware protecting all routes except public pages
- Automatic user sync from Clerk to PostgreSQL

## Local Development

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- PostgreSQL database
- Supabase project with Storage bucket named "transcripts"
- Clerk account and application
- Google Gemini API key

### 1. Install dependencies

```bash
cd meeting-hub
npm install
```

### 2. Configure environment variables

Create a `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/meeting_hub"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# Google Gemini
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Set up the database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 4. Start the development server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Open Prisma Studio (database GUI)
npm run db:studio

# Push schema changes to database
npm run db:push

# Regenerate Prisma client
npm run db:generate
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/upload` | POST | Upload transcript files, parse, save to Supabase + Postgres |
| `/api/analyze` | POST | Run Gemini AI decision + action item extraction on a meeting |
| `/api/sentiment` | GET/POST | Fetch or run sentiment analysis on a meeting |
| `/api/projects` | GET/POST | List or create projects |
| `/api/projects/[id]/decisions` | GET | Get decisions for a project |
| `/api/projects/[id]/sentiment` | GET | Get sentiment for a project |
| `/api/meetings/[id]/reset-ai` | POST | Clear all AI data for a meeting |
| `/api/chats` | GET/POST | List or create chats (5-chat limit per project) |
| `/api/chats/[id]` | GET/DELETE/PATCH | Get, delete, or update a chat |
| `/api/chats/[id]/messages` | GET/POST | Get or send chat messages |
| `/api/action-items/[id]` | PATCH | Update action item status |

## Deployment

This project is built on Next.js and can be deployed to any platform that supports Node.js:

- **Vercel** (recommended for Next.js)
- **Railway**
- **Render**
- **AWS / GCP / Azure**

Required services for production:

- PostgreSQL database
- Supabase project for file storage
- Clerk application for authentication
- Google Gemini API key for AI features

## Recommended Next Product Steps

1. Add risk scoring for action items and rank by urgency
2. Add analytics dashboards with CSV/PDF export for meeting summaries
3. Add real-time transcription support for live meetings
4. Add multi-language transcript support beyond English
5. Add notification system for upcoming action item deadlines
6. Add meeting recurrence detection and templating
7. Add team collaboration features (comments, mentions, shared workspaces)
8. Add calendar integration to auto-import meeting recordings
9. Add custom AI model fine-tuning for organization-specific terminology
10. Add SSO and role-based access control for enterprise teams

## License

This repository is licensed under the terms in `LICENSE`.
