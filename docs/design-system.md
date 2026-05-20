# KIDEX Design System

KIDEX uses Mantine as the UI foundation with a small set of shared layout and presentation primitives.

## Core structure

| Layer | Responsibility |
| --- | --- |
| `theme/mantine-theme.ts` | app theme, colors, typography, component defaults |
| `components/theme/ThemeRegistry.tsx` | Mantine provider wiring |
| `components/theme/ThemeModeContext.tsx` | color mode state and persistence |
| `components/layout/DashboardShell.tsx` | dashboard shell, nav, route gating, responsive layout |
| `components/ui/PageContainer.tsx` | content width and padding |
| `components/ui/PageHeader.tsx` | page-level heading and actions |
| `components/ui/SectionCard.tsx` | standard grouped content container |
| `components/ui/SearchableSelect.tsx` | reusable searchable select wrapper |

## Analytics components

Current analytics components include:

- `ReadinessGauge`
- `LongitudinalChart`
- `BenchmarkChart`
- `MaturityRadarChart`
- `SparklineChart`

These components are reused across dashboard, child-history, and record-detail surfaces.

## Design rules

### 1. Prefer shared Mantine primitives

Use Mantine components such as:

- `Box`
- `Stack`
- `Group`
- `Paper`
- `Alert`
- `Button`
- `TextInput`
- `Textarea`
- `Select`
- `Table`

Avoid introducing parallel raw-CSS component systems for normal dashboard UI.

### 2. Reuse the shell and cards

New dashboard routes should normally use:

- `DashboardShell`
- `PageHeader`
- `SectionCard`

This keeps settings, records, child history, and analytics visually consistent.

### 3. Keep assessment UX low-friction

The assessment workflow is a production surface, not only an admin form.

When changing assessment UI:

- keep scoring inputs fast
- keep guidance concise
- avoid turning the page into training material
- make uncertainty visible without adding noise

### 4. Keep family and practitioner language separate

Professional review surfaces may show:

- reliability context
- scorer confidence
- operational cautions

Family-facing sections should stay:

- supportive
- plain-language
- non-diagnostic

### 5. Keep global CSS minimal

Global CSS should remain limited to:

- resets
- shared variables
- print helpers
- small layout utilities

Do not reintroduce large bespoke CSS islands when a component-level Mantine solution is sufficient.

## i18n expectations

Use the `next-intl` routing and translation setup already in the app.

All new user-facing strings should be added to the `messages` files rather than hard-coded into pages.

## Accessibility expectations

- preserve labels for form fields
- preserve semantic structure and readable text hierarchy
- avoid hiding important state only in color
- keep keyboard and screen-reader behavior intact when adding modals or action controls

## Print and export surfaces

KIDEX uses client-side PDF generation for reports.

Record pages may still include print-related classes, but the product-standard export path is PDF generation rather than browser printing.
