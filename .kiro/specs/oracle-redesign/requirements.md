# Requirements Document

## Introduction

This document specifies the requirements for the Oracle Redesign — a full UI transformation of the BRD (Business Requirements Document) analysis section into a multi-chapter "Tactical Command Interface." The redesign replaces the existing single-page Oracle view with 11 themed chapter pages under a unified shell layout, using a dark-gold design system that coexists with the existing RPG Quest Board theme.

## Glossary

- **Oracle_Shell**: The layout wrapper providing TopAppBar, SideNavBar, and content slot for all Oracle chapter pages
- **TopAppBar**: Fixed 64px navigation bar with chapter rail and document context
- **SideNavBar**: 256px fixed left sidebar with chapter links and primary action button
- **Chapter_Page**: An individual route under `/oracle/` representing one facet of BRD analysis
- **Gatehouse**: The upload/entry chapter page (Ch 0) where users submit BRD documents
- **Active_Document**: The currently selected BrdDocument whose analysis data populates chapter pages
- **Oracle_Context**: React context providing active document state to all chapter pages
- **Requirement_Card**: UI component displaying a single BrdFeature with priority badge and action/reaction split
- **Risk_Card**: UI component displaying a risk item with severity-colored border
- **Flow_Stepper**: Vertical timeline component visualizing user journey steps
- **Score_Orb**: Animated circular score indicator on the Codex summary page
- **Particle_Background**: Canvas-based animated particle effect for the Gatehouse
- **Architecture_Canvas**: Interactive pannable/zoomable Mermaid diagram renderer
- **Chapter_Slug**: URL-safe identifier for each chapter (e.g., 'gatehouse', 'scroll', 'trials')
- **Severity_Level**: Risk impact classification: 'critical', 'high', 'medium', or 'low'
- **Oracle_Theme**: Tailwind CSS extension with `oracle-*` color, font, and shadow tokens

## Requirements

### Requirement 1: Oracle Shell Layout

**User Story:** As a user, I want a consistent navigation shell across all Oracle pages, so that I can easily move between chapters and maintain context of my active BRD analysis.

#### Acceptance Criteria

1. THE Oracle_Shell SHALL render a TopAppBar (64px fixed height) and SideNavBar (256px fixed width on desktop) wrapping the chapter content slot
2. THE Oracle_Shell SHALL provide Oracle_Context containing the Active_Document, features array, analysis extras, and analyzing state to all child Chapter_Pages
3. WHEN the viewport width is below 1024px, THE SideNavBar SHALL collapse to a hamburger menu overlay
4. WHEN the viewport width is below 1024px, THE TopAppBar SHALL display a horizontal scrollable chapter rail
5. THE Oracle_Shell SHALL apply the Oracle_Theme background color (`oracle-surface` #141311) to the root container

### Requirement 2: Chapter Navigation

**User Story:** As a user, I want to navigate between Oracle chapters, so that I can view different aspects of my BRD analysis.

#### Acceptance Criteria

1. WHEN a user clicks a chapter link in the SideNavBar or TopAppBar, THE Oracle_Shell SHALL navigate to `/oracle/{chapter_slug}` and update the active chapter state
2. THE SideNavBar SHALL highlight the active chapter with a left border accent (4px, oracle-gold color)
3. WHEN no Active_Document is set and a user navigates to any Chapter_Page other than Gatehouse, THE Oracle_Shell SHALL redirect to `/oracle/gatehouse`
4. THE TopAppBar SHALL highlight the active chapter with a gold pill indicator (`bg-oracle-gold-container text-oracle-gold-fixed rounded-full`)
5. WHEN a user navigates to `/oracle` without a chapter slug, THE Oracle_Shell SHALL redirect to `/oracle/gatehouse`

### Requirement 3: Gatehouse (Upload Page)

**User Story:** As a user, I want to upload or paste a BRD document, so that The Oracle can analyze it and populate all chapter pages.

#### Acceptance Criteria

1. THE Gatehouse SHALL display a file drop zone accepting PDF and TXT files (max 10MB)
2. THE Gatehouse SHALL display a text input area for pasting BRD content directly
3. WHEN a user submits a document, THE Gatehouse SHALL initiate streaming analysis and navigate to an analyzing state
4. WHILE analysis is in progress, THE Gatehouse SHALL display a loading animation with elapsed time, phase indicator, and streaming reasoning text
5. WHEN analysis completes successfully, THE Oracle_Shell SHALL set the Active_Document and navigate to `/oracle/codex`
6. THE Gatehouse SHALL display a Particle_Background animation behind the upload interface
7. IF the uploaded file exceeds 10MB or is not PDF/TXT format, THEN THE Gatehouse SHALL display a validation error and reject the upload
8. THE Gatehouse SHALL display a history list of previously analyzed documents with options to view or delete

### Requirement 4: The Scroll (Functional Requirements)

**User Story:** As a user, I want to view all functional requirements extracted from my BRD, so that I can review the system behaviors identified by the analysis.

#### Acceptance Criteria

1. THE Scroll page SHALL display all BrdFeature items where `requirement_type` equals 'functional' as Requirement_Cards
2. WHEN a user clicks a Requirement_Card, THE Scroll page SHALL navigate to `/oracle/reveal/{featureId}` showing the detailed view
3. EACH Requirement_Card SHALL display: feature index, name, priority badge (colored by suggested_priority), and description
4. EACH Requirement_Card SHALL display an "Aksi User" / "Reaksi Sistem" split panel showing `as_is` and `to_be` content
5. WHEN the functional features list is empty, THE Scroll page SHALL display a themed empty state with descriptive message

### Requirement 5: Silent Laws (Non-Functional Requirements)

**User Story:** As a user, I want to view non-functional requirements separately, so that I can assess quality attributes and constraints.

#### Acceptance Criteria

1. THE Silent_Laws page SHALL display all BrdFeature items where `requirement_type` equals 'non_functional' as Requirement_Cards
2. WHEN the non-functional features list is empty, THE Silent_Laws page SHALL display an hourglass animation with the message "No non-functional requirements identified"
3. EACH Requirement_Card on Silent_Laws SHALL display the same structure as The Scroll (index, name, priority badge, description, action/reaction split)

### Requirement 6: Oracle's Reveal (Requirement Detail)

**User Story:** As a user, I want to view a single requirement in detail with full context, so that I can understand its complete specification.

#### Acceptance Criteria

1. THE Reveal page SHALL display a 3-panel layout: left (flow process context), center (main requirement content), right (oracle's notes)
2. THE center panel SHALL display: name, description, business_flow, precondition, postcondition, user_roles, impacted_process, scope, and accounting_impact
3. THE left panel SHALL display the flow_process steps relevant to the selected requirement
4. THE right panel SHALL display risks, suggested_priority, and pilot_status as oracle annotations
5. WHEN the feature ID in the URL does not match any BrdFeature, THE Reveal page SHALL display a "Requirement not found" error and link back to The Scroll

### Requirement 7: Flow of Fate (User Journey)

**User Story:** As a user, I want to visualize the user journey as a vertical flow, so that I can understand the process sequence.

#### Acceptance Criteria

1. THE Flow page SHALL render all flow_process steps as a vertical Flow_Stepper with a gold thread connector line
2. EACH step node SHALL display: step ID, actor name, action description, and type indicator (start/process/decision/end)
3. WHEN a user clicks a step node, THE Flow_Stepper SHALL expand that step to show full content and collapse the previously active step
4. THE Flow_Stepper SHALL color-code step types: start (green border), end (red border), decision (yellow border), process (default border)
5. WHEN flow_process is empty, THE Flow page SHALL display a themed empty state

### Requirement 8: Trials & Tribulations (Risk Analysis)

**User Story:** As a user, I want to view risks in a filterable masonry grid, so that I can assess threats by severity.

#### Acceptance Criteria

1. THE Trials page SHALL display all risk_analysis items as Risk_Cards in a masonry grid layout (1 column mobile, 2 columns tablet, 3 columns desktop)
2. EACH Risk_Card SHALL have a left border colored by Severity_Level: critical (#e74c3c), high (#e67e22), medium (#f39c12), low (#27ae60)
3. THE Trials page SHALL provide severity filter buttons allowing users to show/hide risks by Severity_Level
4. EACH Risk_Card SHALL display: severity badge, risk description, and mitigation protocol text
5. THE Trials page SHALL sort risks by severity (critical first, low last) by default
6. WHEN risk_analysis is empty, THE Trials page SHALL display a themed empty state

### Requirement 9: The Grand Map (Architecture Diagram)

**User Story:** As a user, I want to view the system architecture as an interactive diagram, so that I can understand component relationships.

#### Acceptance Criteria

1. THE Grand_Map page SHALL render the architecture_diagram (Mermaid syntax) in an Architecture_Canvas component
2. THE Architecture_Canvas SHALL support pan (drag) and zoom (scroll/pinch) interactions
3. THE Architecture_Canvas SHALL provide zoom-in, zoom-out, and reset-view control buttons
4. THE Architecture_Canvas SHALL apply Oracle_Theme styling to diagram nodes (dark backgrounds, gold borders)
5. WHEN architecture_diagram is empty, THE Grand_Map page SHALL display a themed empty state
6. THE Architecture_Canvas SHALL provide a fullscreen toggle button

### Requirement 10: Affected Realms (System Dependencies)

**User Story:** As a user, I want to see which systems are impacted by the BRD changes, so that I can plan integration work.

#### Acceptance Criteria

1. THE Realms page SHALL display all impacted_systems as Integration_Cards in a responsive grid (1 col mobile, 2 cols tablet, 3 cols desktop)
2. EACH Integration_Card SHALL display: system name, impact type badge, and description
3. WHEN impacted_systems is empty, THE Realms page SHALL display a themed empty state

### Requirement 11: Tome of Artifacts (Feature Cards)

**User Story:** As a user, I want to view features as tactical cards with user action and system reaction, so that I can understand the functional design.

#### Acceptance Criteria

1. THE Tome page SHALL display all BrdFeature items (both functional and non-functional) as feature cards with tactical split layout
2. EACH feature card SHALL display: feature name, description, "Aksi User" panel (as_is content), and "Reaksi Sistem" panel (to_be content)
3. EACH feature card SHALL display scope badge, user_roles tags, and priority indicator
4. WHEN features list is empty, THE Tome page SHALL display a themed empty state

### Requirement 12: Oracle's Counsel (Improvements & Questions)

**User Story:** As a user, I want to see improvement suggestions and unanswered questions, so that I can refine the BRD.

#### Acceptance Criteria

1. THE Counsel page SHALL display improvements in a card list with title, description, category, and priority badge
2. THE Counsel page SHALL display unanswered questions in a separate section with question text, context, category, and target_role
3. EACH question card SHALL provide a text input for the user to enter a resolution/answer
4. WHEN a user submits a resolution for a question, THE Counsel page SHALL persist the resolution text (stored client-side or in document metadata)
5. WHEN improvements list is empty, THE Counsel page SHALL display a themed empty state for that section
6. WHEN questions list is empty, THE Counsel page SHALL display a themed empty state for that section

### Requirement 13: The Codex (Summary Page)

**User Story:** As a user, I want a synthesis overview of the entire BRD analysis, so that I can quickly assess completeness and quality.

#### Acceptance Criteria

1. THE Codex page SHALL display a Score_Orb showing an overall analysis completeness score (0-100)
2. THE Codex page SHALL display a chapter overview grid showing each chapter with its item count and status indicator
3. THE Score_Orb SHALL animate its fill on mount with a gold gradient effect
4. EACH chapter card in the overview grid SHALL be clickable, navigating to that chapter
5. THE Codex page SHALL display the document title, analysis date, and total feature count as header metadata

### Requirement 14: Design System & Theming

**User Story:** As a developer, I want Oracle-specific theme tokens that coexist with the RPG theme, so that the Oracle section has its own visual identity without breaking existing pages.

#### Acceptance Criteria

1. THE Oracle_Theme SHALL extend the Tailwind configuration with `oracle-*` prefixed color tokens, font families, font sizes, and box shadows
2. THE Oracle_Theme SHALL load Cinzel (display), Inter (body), and JetBrains Mono (labels) via next/font with CSS variable binding
3. THE Oracle_Theme SHALL NOT modify or override existing RPG theme tokens (`rpg-dark`, `rpg-card`, `font-pixel`, etc.)
4. THE Oracle_Theme SHALL define gold glow box shadows: `oracle-glow` (15px), `oracle-glow-sm` (8px), `oracle-glow-lg` (30px)
5. THE Oracle_Theme SHALL use Material Symbols Outlined as the icon system throughout all Oracle pages

### Requirement 15: Animations & Motion

**User Story:** As a user, I want subtle animations that enhance the tactical interface feel, so that the experience feels polished and immersive.

#### Acceptance Criteria

1. THE Requirement_Cards SHALL animate with a flip-in effect on initial mount (staggered by index)
2. THE Gatehouse SHALL display a Particle_Background with gold-tinted floating particles
3. WHILE `prefers-reduced-motion` is set to 'reduce', THE Oracle_Shell SHALL disable all non-essential animations (particles, flip-in, fade-up)
4. THE Score_Orb SHALL animate its fill progress over 1.5 seconds on mount
5. THE Flow_Stepper SHALL animate step expansion/collapse with a 300ms ease transition
6. THE Particle_Background SHALL render at maximum 30fps to minimize CPU usage

### Requirement 16: Responsive Layout

**User Story:** As a user, I want the Oracle interface to work on both desktop and mobile, so that I can review BRD analysis on any device.

#### Acceptance Criteria

1. WHEN viewport width is 1024px or above, THE Oracle_Shell SHALL display SideNavBar (256px) and full TopAppBar with chapter labels
2. WHEN viewport width is below 1024px, THE SideNavBar SHALL collapse to a slide-out overlay triggered by a hamburger button
3. WHEN viewport width is below 768px, THE masonry grids (Trials, Realms) SHALL collapse to single-column layout
4. WHEN viewport width is below 768px, THE 3-panel layout (Reveal page) SHALL stack vertically
5. THE TopAppBar chapter rail SHALL be horizontally scrollable on all viewport sizes
