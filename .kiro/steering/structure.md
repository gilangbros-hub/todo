# Project Structure

```
├── app/                    # Next.js App Router pages and API routes
│   ├── layout.tsx          # Root layout (fonts, global styles)
│   ├── page.tsx            # Dashboard (quest board)
│   ├── not-found.tsx       # 404 page
│   ├── globals.css         # Tailwind directives + custom CSS
│   ├── account/            # Account settings page
│   ├── login/              # Login page
│   ├── register/           # Registration page
│   ├── master/             # Master data management (types, PICs)
│   │   ├── types/          # Task type CRUD
│   │   └── pics/           # PIC CRUD
│   ├── tasks/
│   │   └── [id]/           # Task detail/edit page
│   └── api/
│       └── auth/           # Auth API routes (login, logout, profile)
├── components/             # Reusable React components
│   ├── auth/               # Auth-specific components
│   ├── KanbanBoard.tsx     # Kanban view
│   ├── FolderView.tsx      # Folder/grouped view
│   ├── QuestCard.tsx       # Task card component
│   ├── WizardModal.tsx     # Task creation wizard
│   ├── Sidebar.tsx         # Navigation + player stats
│   └── ...                 # Filter, sort, progress, XP UI
├── lib/                    # Shared logic and utilities
│   ├── types.ts            # Core TypeScript interfaces and constants
│   ├── supabase/           # Supabase client setup
│   │   ├── client.ts       # Browser client
│   │   ├── server.ts       # Server-side client
│   │   └── middleware.ts   # Session refresh middleware
│   ├── services/           # Data access layer (Supabase queries)
│   │   ├── tasks.ts        # Task CRUD operations
│   │   ├── types.ts        # TaskType operations
│   │   ├── pics.ts         # PIC operations
│   │   ├── player-stats.ts # Player stats operations
│   │   └── realtime.ts     # Real-time subscription helpers
│   ├── auth/               # Auth validation utilities
│   ├── hooks/              # Custom React hooks
│   ├── filters.ts          # Task filtering logic
│   ├── xp.ts              # XP calculation logic
│   ├── streak.ts          # Streak calculation logic
│   ├── overdue.ts         # Overdue detection logic
│   └── validation.ts      # Input validation
├── supabase/
│   └── migrations/         # SQL migration files (numbered)
├── __tests__/
│   ├── unit/               # Unit tests
│   └── properties/         # Property-based tests (fast-check)
├── middleware.ts           # Next.js middleware (auth route protection)
├── tailwind.config.ts      # Tailwind theme (RPG colors, fonts, shadows)
└── vitest.config.ts        # Test configuration
```

## Conventions

- **Path alias**: Use `@/` to import from project root (e.g., `@/lib/types`, `@/components/Sidebar`)
- **Services layer**: All Supabase queries go through `lib/services/` — components never call Supabase directly
- **Types**: Domain types live in `lib/types.ts`; keep interfaces co-located only when component-specific
- **Components**: Flat in `components/` unless they form a logical group (e.g., `auth/`)
- **Pages**: Each route is a directory under `app/` with a `page.tsx`
- **Client components**: Mark with `'use client'` directive; server components are the default
- **Migrations**: Numbered sequentially (`001_`, `002_`, etc.) in `supabase/migrations/`
- **Tests**: Mirror source structure under `__tests__/unit/` and `__tests__/properties/`
