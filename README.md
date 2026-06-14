<p align="center">
  <img src="public/logo.png" alt="Renata Logo" width="120" height="120" />
</p>

<h1 align="center">Renata</h1>

<p align="center">
  <strong>AI-powered Business Requirements Document analysis. Upload a BRD, get structured requirements, architecture diagrams, risks, and actionable insights in seconds.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?style=flat-square&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/DeepSeek-V4-6366f1?style=flat-square" alt="DeepSeek V4" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" />
</p>

---

## What It Does

Renata (Requirement Analytica) takes a Business Requirements Document — paste text or upload a PDF — and runs it through a two-phase AI analysis pipeline:

1. **Core phase** — Extracts functional and non-functional requirements as structured objects with BABOK classification and MoSCoW prioritization
2. **Advisory phase** — Generates process flows, system architecture, risks, improvement suggestions, technical solutions, and discovery questions

Results are surfaced across six interactive tabs so business analysts, architects, and PMs can act on them immediately.

---

## Features

### Mission Control
- Drag-and-drop or click-to-upload PDF/TXT documents (up to 10 MB)
- Paste raw BRD text directly
- Live streaming analysis with real-time AI reasoning output, phase indicators, and elapsed timer
- Recent analysis history on the same screen

### Results Dashboard (6 Tabs)

| Tab | Contents |
|-----|----------|
| **Requirements Matrix** | Functional & non-functional requirements with business value, acceptance criteria, dependencies, and stakeholder mapping |
| **Process & Architecture** | Business process flow stepper + Mermaid system architecture diagram + impacted systems list |
| **Discovery Questions** | Stakeholder-targeted questions to clarify ambiguities before implementation |
| **AI Optimization** | AI-generated suggestions to improve and harden requirements |
| **AI Solutions** | Technical solution mapping per feature with recommended stacks and effort estimates |
| **BA Deep-Dive** | Risk watchlist (impact/likelihood/mitigation) and strategic advisory |

### Feature Detail View
- Per-feature deep-dive page with full context, dependencies, and AI-generated implementation notes

### Analysis History
- Full paginated list of all past analyses
- Status, date, view, and delete actions per entry

### Authentication
- Email/password sign-up and login via Supabase Auth
- All data is private per user — enforced at the database level via RLS

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), React 18 |
| Language | TypeScript 5 (strict mode) |
| Database & Auth | Supabase (PostgreSQL + RLS + Realtime) |
| AI / LLM | DeepSeek V4 Pro via OpenAI-compatible SDK |
| Document Parsing | `pdf-parse` (server-side PDF text extraction) |
| Diagrams | Mermaid (system architecture rendering) |
| Styling | Tailwind CSS 3 with custom design tokens |
| Icons | Lucide React |
| Testing | Vitest + fast-check (property-based) |
| Fonts | Geist, Outfit (via `next/font`) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [DeepSeek](https://platform.deepseek.com) API key

### Installation

```bash
git clone https://github.com/your-username/renata.git
cd renata
npm install
```

### Environment Setup

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### Database Migrations

Run the SQL migrations in `supabase/migrations/` against your Supabase project in order:

```
001_initial_schema.sql
002_add_subtasks.sql
003_add_user_auth.sql
004_battle_log.sql
005_forfeit_quest.sql
006_brd_analysis.sql
007_brd_requirement_type.sql
008_brd_feature_fields.sql
010_parallel_analysis.sql
012_advisory_extras.sql
013_clipboard.sql
014_brd_documents_update_policy.sql
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in to start analyzing documents.

---

## Project Structure

```
app/
├── page.tsx                      → Redirects to /renata/mission-control
├── renata/
│   ├── layout.tsx                → App shell (sidebar, top bar, document context)
│   ├── mission-control/          → BRD upload, model selector, streaming analysis
│   ├── results/                  → 6-tab results dashboard
│   ├── history/                  → Full analysis history
│   └── insights/[featureId]/     → Per-feature detail view
├── login/                        → Authentication (sign in)
├── register/                     → Authentication (sign up)
└── api/
    ├── brd/stream/               → POST — streaming AI analysis (SSE)
    ├── brd/parse-pdf/            → POST — server-side PDF text extraction
    ├── brd/analyze/              → POST — additional analysis endpoint
    └── auth/                     → Auth routes (login, logout, profile)

components/
├── renata/
│   ├── SideNavBar.tsx            → Collapsible sidebar with nav links
│   ├── DocumentGuard.tsx         → Blocks routes when no document is active
│   ├── ExpandableCard.tsx        → Accordion-style requirement/advisory card
│   ├── FlowStepper.tsx           → Business process flow renderer
│   ├── ArchitectureCanvas.tsx    → Mermaid diagram renderer
│   ├── RequirementCard.tsx       → Structured requirement display
│   ├── RiskCard.tsx              → Risk item display
│   └── ScoreOrb.tsx              → Visual score indicator
└── auth/                         → Login/register form components

lib/
├── services/brd.ts               → BRD data access layer (Supabase queries)
├── types.ts                      → Domain types and constants
├── supabase/                     → Supabase client setup (server + browser)
├── auth/                         → Auth validation utilities
└── security.ts                   → Input validation and string capping
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

---

## Security

- OWASP-aligned security headers (CSP, HSTS, X-Frame-Options, nosniff)
- Supabase RLS on all tables — per-user data isolation at the database level
- Input validation and string capping on all user inputs
- Middleware-enforced route protection — unauthenticated users redirected to `/login`
- No secrets in client bundles (`DEEPSEEK_API_KEY` is server-only)

See [SECURITY.md](SECURITY.md) for the full security posture.

---

## License

MIT

---

<p align="center">
  <em>Turn requirements chaos into structured clarity.</em>
</p>
