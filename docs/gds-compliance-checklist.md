# KIDEX GDS Compliance Checklist

Aligned SSOT: `2.4.3 / 2026-05-25`  
Local adapter: [design-system.md](./design-system.md)  
PR review: [gds-pr-review-checklist.md](./gds-pr-review-checklist.md)  
Active implementation track: local delivery complete through [#60](https://github.com/moldovancsaba/kidex/issues/60); current external dependency [#54](https://github.com/moldovancsaba/kidex/issues/54)

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## A. Governance & documentation

- [x] Shared SSOT path documented; local file is adapter-only
- [x] Aligned SSOT version `2.4.3` recorded in adapter docs
- [x] Pattern contract inventory documented with maturity states
- [x] Narrow exceptions documented (charts, PDF, legacy CSS bridge)
- [x] PR review checklist published
- [x] No project-local doc treats removed token files or `globals.css` brand vars as competing authority

---

## B. Root platform (Phase 1 baseline)

- [x] Single root `MantineProvider` with locale/direction and color mode
- [x] `ModalsProvider` at app root
- [x] Root `Notifications` mounted
- [x] Provider stack matches [providers.tsx.template](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/TEMPLATES/providers.tsx.template)
- [x] Overlay/modal usage: page `Modal` for forms/destructive confirms; Mantine root for notifications
- [x] `@gds/*` packages: remain **not adopted** while the public GDS package line still targets Mantine `^7.9.0` (documented exception)

---

## C. Token & styling authority

- [x] **One token source in feature code:** no `KIDEX_COLORS` / `theme/tokens` in `app/` or `components/`
- [x] Canonical palette in `theme/brand-colors.ts` (theme-internal only)
- [x] No parallel brand tokens in `app/globals.css` `:root`
- [x] Chart series use Mantine CSS variables via `components/analytics/chart-series-colors.ts`
- [x] Shell uses Mantine theme tokens via `useMantineTheme` + `alpha`
- [x] Landing/public pages use Mantine semantic colors

---

## D. Pattern contracts

### D1. Conductor app shell — `components/layout/DashboardShell.tsx`

- [x] Mobile footer exposes primary conductor destinations
- [x] Secondary destinations in drawer/overflow only
- [x] Routine work reachable without drawer-only navigation
- [x] Theme-token shell styling
- [x] Local admin `AppShell` compatibility boundary is active
- [x] Contract maturity: **active**

### D2. Page header — `components/gds-local/admin/PageHeader.tsx`

- [x] Used on major dashboard routes
- [x] Detail pages now use `PageHeader` primary/secondary/overflow action slots directly
- [x] Contract maturity: **active**

### D3. Product card (child registry)

- [x] One primary action per card; secondary in menu
- [x] Child and record registries use local `ProductCard` parity surface
- [x] Contract maturity: **active**

### D4. Metric / dashboard blocks

- [x] Operational-first mobile order; shared `MetricCard`
- [x] Contract maturity: **active**

### D5. Data toolbar / responsive data view

- [x] `DataToolbar` on children and records lists
- [x] Card-based list layout on mobile (no table scroll traps on registry)
- [x] Local `ResponsiveDataView` compatibility boundary is active
- [x] Contract maturity: **active**

### D6. State blocks

- [x] `LoadingState`, `EmptyState`, `ErrorState` adopted on conductor surfaces
- [x] Local `StateBlock` compatibility boundary is active
- [x] Contract maturity: **active**

### D7. Supporting wrappers

- [x] `PageContainer`, `SectionCard`, `SearchableSelect`, `DetailActionBar`
- [x] Local `EditorScaffold` and `FormSection` parity surfaces are active in assessment flow

---

## E. Surface-specific work

| Phase | Focus | Status |
|-------|--------|--------|
| 1 | Mobile shell & navigation | [x] |
| 2 | Dashboard mobile priority | [x] |
| 3 | Child registry cards & filters | [x] |
| 4 | Record & child detail headers | [x] |
| 5 | Survey start/resume UX | [x] |
| 6 | CSS & exception reduction | [x] |
| 7 | Local GDS compatibility boundary | [x] |
| 8 | Local editor scaffold parity | [x] |

Delivered issue mapping:

- `#50` mobile shell, dashboard priority, and Mantine runtime completion
- `#51` child registry mobile filters and triage controls
- `#52` survey mobile save bar and faster resume context
- `#53` child and record detail header normalization
- `#56` local GDS compatibility boundary
- `#57` authenticated shell and page-header parity
- `#58` registry responsive-data-view and product-card parity
- `#59` assessment editor scaffold and form-section parity
- `#60` shared primitive normalization and exception-surface parity
- `#54` package adoption remains blocked on GDS Mantine 8 compatibility even after the `2.4.3` SSOT update

---

## F. Enforcement

- [x] Block imports from `legacy-form-primitives`
- [x] Restrict hardcoded `borderRadius` / `size="xs"` patterns
- [x] ESLint: forbid theme token imports in `app/` and `components/`
- [x] Chart colors centralized in `chart-series-colors.ts`
- [x] PR review checklist in repo

---

## G. Documented exceptions

| Exception | Status |
|-----------|--------|
| Recharts rendering | [x] |
| PDF/export | [x] |
| Global CSS (reset, print, fonts) | [x] |
| Chart series via Mantine CSS vars | [x] |

---

## H. Release gates

- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run typecheck`

Manual smoke (conductor, mobile width):

- [x] Primary nav from footer without drawer
- [x] Dashboard operational-first on mobile
- [x] Child and record registries route through local responsive-data-view parity contracts
- [x] Record/child detail headers use the local `PageHeader` action contract directly
- [x] Assessment workflow uses the local editor-scaffold parity contract
- [x] Shell/dashboard use theme body colors (no mixed-mode product islands)

---

## Compliance summary

| Level | KIDEX |
|-------|--------|
| **Governed** | **Current** — update [design-system.md](./design-system.md) `Local status` accordingly |

Interpretation:

- **Yes**: KIDEX is GDS-only for design authority, behavior contracts, responsive rules, and primitive policy.
- **Not yet**: KIDEX is not GDS-package-only until the public `@gds/*` release line supports Mantine `8.x`.
