# KIDEX GDS Compliance Checklist

Aligned SSOT: `2.2.0 / 2026-05-23`  
Local adapter: [design-system.md](./design-system.md)  
Active implementation track: [#50](https://github.com/moldovancsaba/kidex/issues/50)

Use this checklist to track progress from **migrating** to **governed** per [GOVERNANCE_AND_ADOPTION.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/GOVERNANCE_AND_ADOPTION.md).

**Legend:** `[ ]` not started · `[~]` in progress · `[x]` done

---

## A. Governance & documentation

- [x] Shared SSOT path documented; local file is adapter-only
- [x] Aligned SSOT version `2.2.0` recorded in adapter docs
- [x] Pattern contract inventory documented with maturity states
- [x] Narrow exceptions documented (charts, PDF, legacy CSS bridge)
- [ ] Adapter inventory reviewed on each major UI PR (shell, header, card, toolbar paths still accurate)
- [x] No project-local doc treats `theme/tokens.ts` or `globals.css` brand vars as competing authority

---

## B. Root platform (Phase 1 baseline)

- [x] Single root `MantineProvider` with locale/direction and color mode
- [x] `ModalsProvider` at app root
- [x] Root `Notifications` mounted
- [x] Provider stack matches [providers.tsx.template](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/TEMPLATES/providers.tsx.template)
- [ ] Overlay/modal usage audited: page-local `Modal` only where contract allows; destructive flows use consistent patterns
- [x] `@gds/*` packages: remain **not adopted** until Mantine 8 alignment (documented exception)

---

## C. Token & styling authority

- [x] **One token source in feature code:** no `KIDEX_COLORS` / `theme/tokens` in `app/` or `components/`
- [x] Remove `theme/tokens.ts`; canonical palette in `theme/brand-colors.ts` (theme-internal)
- [x] Remove parallel brand tokens from `app/globals.css` `:root`
- [~] No raw hex/rgb in feature TSX (dashboard chart helpers still use series hex via `AnalyticsConstants`; longitudinal charts use Mantine CSS vars)
- [x] Shell (`DashboardShell`) uses Mantine theme tokens via `useMantineTheme` + `alpha`
- [x] Landing/public pages use Mantine semantic colors, not direct token imports

**Verification commands:**

```bash
rg 'KIDEX_COLORS|from "@/theme/tokens"' --glob '*.{ts,tsx}' app components
rg '#[0-9a-fA-F]{3,8}' --glob '*.{ts,tsx}' app components
wc -l app/globals.css
```

---

## D. Pattern contracts

### D1. Conductor app shell — `components/layout/DashboardShell.tsx`

- [x] Mobile footer exposes primary conductor destinations
- [x] Secondary destinations in drawer/overflow only (settings + logout in mobile drawer)
- [x] Routine work reachable without drawer-only navigation
- [x] No parallel brand color system in shell styles
- [x] Contract maturity: `pilot` → `active`

### D2. Page header — `components/ui/PageHeader.tsx`

- [x] Used on major dashboard routes
- [ ] Consistent title / subtitle / primary / secondary action placement on child detail, record detail, settings
- [~] Contract maturity: `pilot` → `active`

### D3. Product card (child registry) — `app/[locale]/dashboard/children/page.tsx`

- [x] One obvious primary action per card on mobile
- [x] Secondary actions in menu only
- [~] Status/badge density reduced to clear hierarchy
- [~] Contract maturity: `planned` → `active`

### D4. Metric / dashboard blocks — `components/ui/MetricCard.tsx`, `components/dashboard/MainDashboard.tsx`

- [x] Mobile: operational blocks before analytics
- [x] Mobile: follow-up metric strip immediately after operational queue
- [x] Shared metric block component (`MetricCard`)
- [~] Contract maturity: `planned` → `active`

### D5. Data toolbar / responsive data view — children & records lists

- [x] Filter toolbar uses `DataToolbar` on children and records lists
- [ ] Tables/lists have mobile fallback (stacked rows or cards, not horizontal scroll traps)
- [~] Contract maturity: `backlog` → `active`

### D6. State blocks (empty / loading / error / success)

- [x] `LoadingState` used on shell gate, dashboard, children, records
- [ ] Repeated empty/error patterns standardized beyond loading
- [~] Contract maturity: `backlog` → `active`

### D7. Supporting wrappers

- [x] `PageContainer` — content width/padding
- [x] `SectionCard` — grouped sections
- [x] `SearchableSelect` — reusable select

---

## E. Surface-specific work (#50 phases)

| Phase | Focus | Key files | Status |
|-------|--------|-----------|--------|
| 1 | Mobile shell & navigation | `DashboardShell.tsx`, `PageHeader.tsx` | [x] |
| 2 | Dashboard mobile priority | `MainDashboard.tsx` | [x] |
| 3 | Child registry cards & filters | `dashboard/children/page.tsx` | [~] |
| 4 | Record & child detail headers | `children/[id]/page.tsx`, `records/[id]/page.tsx` | [ ] |
| 5 | Survey start/resume UX | `KidexAssessmentApp.tsx`, `dashboard/assessment/*` | [ ] |
| 6 | CSS & exception reduction | `globals.css`, page-level style bridges | [~] |

---

## F. Enforcement (GDS minimum layers)

- [x] Block imports from `legacy-form-primitives`
- [x] Restrict some hardcoded `borderRadius` / `size="xs"` patterns
- [x] ESLint: forbid `@/theme/brand-colors` and `@/theme/tokens` in `app/` and `components/`
- [ ] ESLint or script: forbid raw hex/rgb in feature UI paths (exclude chart adapters)
- [ ] PR review checklist: uses existing local contract vs new page-local shell/card/header
- [ ] PR review checklist: loading, empty, error, disabled states explicit
- [ ] Optional: visual/contrast spot-check on dashboard shell in light and dark mode

---

## G. Documented exceptions (must stay narrow)

| Exception | Allowed | Review |
|-----------|---------|--------|
| Recharts | Chart rendering only; Mantine owns chrome, layout, controls | [x] documented |
| PDF/export | Non-runtime report output | [x] documented |
| Global CSS | Reset, print, Recharts font, narrow utilities | [~] shrink to target |
| Chart series hex | `AnalyticsConstants` and inline dashboard chart series until chart contract | [x] documented |

---

## H. Release gates (run before closing #50)

```bash
npm test
npm run lint
npm run build
npm run typecheck
```

Manual smoke (conductor, mobile width):

- [x] Primary nav destinations reachable from footer without opening drawer
- [x] Dashboard: overdue / due soon / start-resume visible before deep analytics scroll
- [x] Child card: one clear primary action on phone
- [ ] Record/child detail: header actions consistent and tappable
- [ ] Dark and light mode: shell and dashboard text readable (no mixed-mode islands)

---

## Compliance summary

| Level | Meaning | KIDEX today |
|-------|---------|-------------|
| **Adopting** | SSOT referenced; Mantine present | Passed |
| **Migrating** | Adapter + partial contracts; known debt | **Current** |
| **Governed** | Single token source, active contracts, enforcement, narrow exceptions | Target (Phases 4–5 + remaining D2/D5/D6) |

When all sections **A–G** are checked and section **H** passes, update [design-system.md](./design-system.md) `Local status` from `migrating` to `governed`.
