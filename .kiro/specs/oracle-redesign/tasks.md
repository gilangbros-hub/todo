# Implementation Plan: Oracle Redesign — Tactical Command Interface

## Overview

This plan implements the Oracle Redesign as a multi-chapter Next.js App Router section under `/oracle/`. Work is organized in phases: theme setup, shell layout, individual chapter pages, animations, and responsive polish. Each task builds incrementally on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. Set up Oracle design system and theme tokens
  - [x] 1.1 Extend Tailwind config with Oracle theme tokens
    - Add `oracle-*` color tokens, font families, font sizes, and box shadows to `tailwind.config.ts`
    - Ensure existing RPG tokens (`rpg-dark`, `rpg-card`, `font-pixel`, etc.) remain unchanged
    - _Requirements: 14.1, 14.3, 14.4_
  - [x] 1.2 Configure Oracle fonts via next/font
    - Load Cinzel (display), Inter (body), JetBrains Mono (mono) in the Oracle layout using `next/font/google`
    - Bind to CSS variables (`--font-oracle-display`, `--font-oracle-body`, `--font-oracle-mono`)
    - _Requirements: 14.2_
  - [x] 1.3 Add Material Symbols Outlined icon font
    - Add `<link>` for Material Symbols Outlined in Oracle layout head or load via next/font
    - Create a reusable `OracleIcon` component wrapping `<span className="material-symbols-outlined">`
    - _Requirements: 14.5_
  - [x] 1.4 Create Oracle type definitions
    - Create `lib/oracle/types.ts` with `ChapterSlug`, `ChapterMeta`, `CHAPTERS` constant, `AnalysisExtras`, `ImprovementItem`, `QuestionItem`, `ImpactedSystem`, `FsdDesignItem` types
    - _Requirements: 2.1_
  - [x] 1.5 Write property test for Oracle theme isolation
    - **Property 12: Oracle theme does not override RPG tokens**
    - **Validates: Requirements 14.3**

- [x] 2. Build Oracle Shell layout (TopAppBar + SideNav + Context)
  - [x] 2.1 Create OracleContext provider
    - Create `lib/oracle/context.tsx` with `OracleContext` providing activeDocument, features, extras, isAnalyzing, and setActiveDocument
    - Fetch active document and features on mount using existing `getBrdDocuments()` and `getBrdFeatures()`
    - _Requirements: 1.2_
  - [x] 2.2 Create Oracle layout file
    - Create `app/oracle/layout.tsx` wrapping children with OracleContext, TopAppBar, and SideNavBar
    - Apply `oracle-surface` background, font variables, and full-height flex layout
    - Add redirect logic: `/oracle` → `/oracle/gatehouse`
    - _Requirements: 1.1, 1.5, 2.5_
  - [x] 2.3 Build TopAppBar component
    - Create `components/oracle/TopAppBar.tsx` — 64px fixed, backdrop-blur, gold border-bottom
    - Render horizontal chapter rail (scrollable) with active gold pill indicator
    - Display document title and analysis status badge
    - _Requirements: 1.1, 2.1, 2.4, 16.5_
  - [x] 2.4 Build SideNavBar component
    - Create `components/oracle/SideNavBar.tsx` — 256px fixed left, chapter links with left-border accent
    - Include user avatar section, document info, and "TRANSCRIBE BRD" gold button
    - _Requirements: 2.2_
  - [x] 2.5 Implement empty-document guard redirect
    - In Oracle layout, redirect to `/oracle/gatehouse` when no activeDocument and path is not gatehouse
    - _Requirements: 2.3_
  - [x] 2.6 Write property tests for navigation and guard
    - **Property 3: Chapter navigation produces correct URL and active state**
    - **Property 5: Empty document guard redirect**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 3. Checkpoint — Shell layout complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Gatehouse (Ch 0 — Upload page)
  - [x] 4.1 Create Gatehouse page
    - Create `app/oracle/gatehouse/page.tsx` with file drop zone (PDF/TXT, max 10MB), text paste area, and submit button
    - Wire to existing streaming analysis API (`/api/brd/stream`)
    - Display analyzing state with elapsed time, phase, and reasoning stream
    - On completion, set activeDocument in context and navigate to `/oracle/codex`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 4.2 Add document history list to Gatehouse
    - Display previously analyzed documents with view/delete actions
    - Wire to `getBrdDocuments()` and `deleteBrdDocument()`
    - _Requirements: 3.8_
  - [x] 4.3 Implement file validation
    - Reject files > 10MB or non-PDF/TXT with error message
    - _Requirements: 3.7_
  - [ ]* 4.4 Write property test for file validation
    - **Property 9: File validation rejects invalid uploads**
    - **Validates: Requirements 3.7**

- [x] 5. Implement The Scroll (Ch 2 — Functional Requirements)
  - [x] 5.1 Create Scroll page and RequirementCard component
    - Create `app/oracle/scroll/page.tsx` filtering features by `requirement_type === 'functional'`
    - Create `components/oracle/RequirementCard.tsx` with index, name, priority badge, description, and Aksi User / Reaksi Sistem split
    - Navigate to `/oracle/reveal/{featureId}` on card click
    - Display empty state when no functional features
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 5.2 Write property tests for feature partition and card rendering
    - **Property 1: Feature partition is exhaustive and disjoint**
    - **Property 6: Requirement card renders all required fields**
    - **Validates: Requirements 4.1, 4.3, 4.4, 5.1**

- [x] 6. Implement Silent Laws (Ch 3 — Non-Functional Requirements)
  - [x] 6.1 Create Silent Laws page
    - Create `app/oracle/silent-laws/page.tsx` filtering features by `requirement_type === 'non_functional'`
    - Reuse RequirementCard component
    - Display hourglass animation empty state when no non-functional features
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Implement Oracle's Reveal (Ch 1 — Requirement Detail)
  - [x] 7.1 Create Reveal page with 3-panel layout
    - Create `app/oracle/reveal/[featureId]/page.tsx` with left (flow context), center (full detail), right (oracle notes) panels
    - Center panel: name, description, business_flow, precondition, postcondition, user_roles, impacted_process, scope, accounting_impact
    - Right panel: risks, suggested_priority, pilot_status
    - Handle invalid featureId with error state and link back to Scroll
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Implement Flow of Fate (Ch 4 — User Journey)
  - [x] 8.1 Create FlowStepper component and Flow page
    - Create `components/oracle/FlowStepper.tsx` — vertical timeline with gold thread, expandable steps
    - Create `app/oracle/flow/page.tsx` rendering flow_process from extras
    - Color-code step types (start=green, end=red, decision=yellow, process=default)
    - Expand/collapse on click (only one step expanded at a time)
    - Display empty state when flow_process is empty
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ] 8.2 Write property test for step type color mapping
    - **Property 2: Severity and step-type color mapping is total**
    - **Validates: Requirements 7.4, 8.2**

- [x] 9. Implement Trials & Tribulations (Ch 7 — Risk Analysis)
  - [x] 9.1 Create RiskCard component and Trials page
    - Create `components/oracle/RiskCard.tsx` — left border by severity, badge, description, mitigation
    - Create `app/oracle/trials/page.tsx` with masonry grid (1/2/3 cols responsive)
    - Add severity filter buttons (critical, high, medium, low toggles)
    - Sort by severity (critical first) by default
    - Display empty state when risk_analysis is empty
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [ ] 9.2 Write property tests for risk sorting and filtering
    - **Property 4: Risk sort is stable by severity**
    - **Property 8: Severity filter produces correct subset**
    - **Validates: Requirements 8.3, 8.5**

- [~] 10. Checkpoint — Core chapter pages complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement The Grand Map (Ch 8 — Architecture Diagram)
  - [x] 11.1 Create ArchitectureCanvas component and Grand Map page
    - Create `components/oracle/ArchitectureCanvas.tsx` wrapping existing MermaidDiagram with pan/zoom (CSS transform + pointer events)
    - Add zoom-in, zoom-out, reset-view, and fullscreen toggle buttons
    - Apply Oracle theme styling to container
    - Create `app/oracle/grand-map/page.tsx` rendering architecture_diagram from extras
    - Display empty state when architecture_diagram is empty
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 12. Implement Affected Realms (Ch 6 — System Dependencies)
  - [x] 12.1 Create IntegrationCard component and Realms page
    - Create `components/oracle/IntegrationCard.tsx` — system name, impact type badge, description
    - Create `app/oracle/realms/page.tsx` with responsive grid (1/2/3 cols)
    - Display empty state when impacted_systems is empty
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 13. Implement Tome of Artifacts (Ch 5 — Feature Cards)
  - [x] 13.1 Create Tome page
    - Create `app/oracle/tome/page.tsx` displaying all features (functional + non-functional) as tactical cards
    - Each card: feature name, description, Aksi User / Reaksi Sistem panels, scope badge, user_roles tags, priority indicator
    - Display empty state when features list is empty
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 14. Implement Oracle's Counsel (Ch 9 — Improvements & Questions)
  - [x] 14.1 Create Counsel page
    - Create `app/oracle/counsel/page.tsx` with two sections: improvements and questions
    - Improvements: card list with title, description, category, priority badge
    - Questions: card list with question, context, category, target_role, and resolution text input
    - Persist resolution text client-side (localStorage keyed by document ID + question index)
    - Display empty states for each section independently
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 15. Implement The Codex (Ch 10 — Summary Page)
  - [x] 15.1 Create ScoreOrb component
    - Create `components/oracle/ScoreOrb.tsx` — animated circular score (0-100), gold gradient fill, pulsing glow
    - Animate fill on mount over 1.5s
    - _Requirements: 13.1, 13.3_
  - [x] 15.2 Create Codex page
    - Create `app/oracle/codex/page.tsx` with ScoreOrb, chapter overview grid (clickable cards with item counts), and document metadata header
    - Calculate completeness score based on populated sections
    - Each chapter card navigates to that chapter on click
    - _Requirements: 13.1, 13.2, 13.4, 13.5_
  - [ ] 15.3 Write property test for Codex chapter item counts
    - **Property 11: Codex chapter grid shows correct item counts**
    - **Validates: Requirements 13.2**

- [~] 16. Checkpoint — All chapter pages complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Add animations and motion
  - [x] 17.1 Implement flip-in animation for RequirementCards
    - Add CSS keyframe animation with staggered delay by index
    - _Requirements: 15.1_
  - [x] 17.2 Implement ParticleBackground component
    - Create `components/oracle/ParticleBackground.tsx` — canvas-based gold particles, 30fps cap, `ssr: false` dynamic import
    - _Requirements: 15.2, 15.6_
  - [x] 17.3 Add reduced-motion support
    - Wrap all animations in `motion-safe:` Tailwind variants or check `prefers-reduced-motion` in JS
    - Disable ParticleBackground, flip-in, and ScoreOrb animation when reduced motion is preferred
    - _Requirements: 15.3_
  - [x] 17.4 Add FlowStepper expand/collapse transition
    - 300ms ease transition on step height and opacity
    - _Requirements: 15.5_
  - [ ] 17.5 Write property test for reduced motion
    - **Property 10: Reduced motion disables animations**
    - **Validates: Requirements 15.3**

- [x] 18. Implement responsive layout
  - [x] 18.1 Add SideNavBar mobile collapse
    - Collapse to hamburger button + slide-out overlay below 1024px
    - _Requirements: 1.3, 16.1, 16.2_
  - [x] 18.2 Add responsive grid breakpoints
    - Masonry grids (Trials, Realms): 1 col < 768px, 2 cols < 1024px, 3 cols ≥ 1024px
    - Reveal 3-panel: stack vertically below 768px
    - _Requirements: 16.3, 16.4_
  - [x] 18.3 Ensure TopAppBar chapter rail scrollability
    - Horizontal scroll with `overflow-x-auto` and hidden scrollbar styling
    - _Requirements: 1.4, 16.5_

- [~] 19. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The existing BRD data layer (`lib/services/brd.ts`) and API routes are reused without modification
- All new components go under `components/oracle/` to isolate from existing RPG components
- All new pages go under `app/oracle/` using Next.js App Router conventions

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["1.5", "2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.5"] },
    { "id": 3, "tasks": ["2.6", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 5, "tasks": ["4.4", "5.2", "6.1", "7.1", "8.1"] },
    { "id": 6, "tasks": ["8.2", "9.1", "11.1", "12.1", "13.1", "14.1"] },
    { "id": 7, "tasks": ["9.2", "15.1"] },
    { "id": 8, "tasks": ["15.2"] },
    { "id": 9, "tasks": ["15.3", "17.1", "17.2", "17.3", "17.4"] },
    { "id": 10, "tasks": ["17.5", "18.1", "18.2", "18.3"] }
  ]
}
```
