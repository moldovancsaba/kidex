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
- [ ] No project-local doc treats `theme/tokens.ts` or `globals.css` brand vars as competing authority

---

## B. Root platform (Phase 1 baseline)

- [x] Single root `MantineProvider` with locale/direction and color mode
- [x] `ModalsProvider` at app root
- [x] Root `Notifications` mounted
- [x] Provider stack matches [providers.tsx.template](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/TEMPLATES/providers.tsx.template)
- [ ] Overlay/modal usage audited: page-local `Modal` only where contract allows; destructive flows use consistent patterns
- [ ] `@gds/*` packages: remain **not adopted** until Mantine 8 alignment (documented exception)

---

## C. Token & styling authority

- [ ] **One token source in feature code:** `theme/mantine-theme.ts` only (no `KIDEX_COLORS` in components/pages)
- [ ] Remove or freeze `theme/tokens.ts` as re-export/bridge only, then delete
- [ ] Remove parallel brand tokens from `app/globals.css` `:root` (keep reset, print, chart font helpers only)
- [ ] No raw hex/rgb in feature TSX (except documented chart series until chart contract exists)
- [ ] Shell (`DashboardShell`) uses Mantine theme tokens, not `KIDEX_COLORS`
- [ ] Landing/public pages use theme tokens, not direct token imports

**Verification commands (manual until lint exists):**

```bash
rg 'KIDEX_COLORS|from "@/theme/tokens"' --glob '*.{ts,tsx}' app components
rg '#[0-9a-fA-F]{3,8}' --glob '*.{ts,tsx}' app components
wc -l app/globals.css
```

---

## D. Pattern contracts

### D1. Conductor app shell — `components/layout/DashboardShell.tsx`

- [~] Mobile footer exposes primary conductor destinations
- [ ] Secondary destinations in drawer/overflow only (not competing with page actions)
- [ ] Routine work reachable without drawer-only navigation
- [ ] No parallel brand color system in shell styles
- [ ] Contract maturity: `pilot` → `active`

### D2. Page header — `components/ui/PageHeader.tsx`

- [~] Used on major dashboard routes
- [ ] Consistent title / subtitle / primary / secondary action placement on child detail, record detail, settings
- [ ] Contract maturity: `pilot` → `active`

### D3. Product card (child registry) — `app/[locale]/dashboard/children/page.tsx`

- [ ] One obvious primary action per card on mobile
- [ ] Secondary actions in menu only
- [ ] Status/badge density reduced to clear hierarchy
- [ ] Contract maturity: `planned` → `active`

### D4. Metric / dashboard blocks — `components/dashboard/MainDashboard.tsx`

- [~] Mobile: operational blocks (reassessment queue, watchlist, start/resume) before analytics
- [ ] Mobile: summary metric row and culture/analytics do not bury urgent operational work
- [ ] Shared metric block component or documented thin wrapper (no page-local metric layout invention)
- [ ] Contract maturity: `planned` → `active`

### D5. Data toolbar / responsive data view — children & records lists

- [ ] Filter toolbar matches shared data-toolbar contract
- [ ] Tables/lists have mobile fallback (stacked rows or cards, not horizontal scroll traps)
- [ ] Contract maturity: `backlog` → `active`

### D6. State blocks (empty / loading / error / success)

- [ ] Repeated empty/loading/error patterns use shared thin wrappers or explicit Mantine contract
- [ ] No one-off Alert/Loader layouts per page for the same semantic state
- [ ] Contract maturity: `backlog` → `active`

### D7. Supporting wrappers (already closer)

- [x] `PageContainer` — content width/padding
- [x] `SectionCard` — grouped sections
- [x] `SearchableSelect` — reusable select

---

## E. Surface-specific work (#50 phases)

Map to [KIDEX_MANTINE_REFACTOR.md](/Users/Shared/Projects/GENERAL_DESIGN_SYSTEM/PROJECTS/KIDEX_MANTINE_REFACTOR.md).

| Phase | Focus | Key files | Status |
|-------|--------|-----------|--------|
| 1 | Mobile shell & navigation | `DashboardShell.tsx`, `PageHeader.tsx` | [~] |
| 2 | Dashboard mobile priority | `MainDashboard.tsx` | [~] |
| 3 | Child registry cards & filters | `dashboard/children/page.tsx` | [ ] |
| 4 | Record & child detail headers | `children/[id]/page.tsx`, `records/[id]/page.tsx` | [ ] |
| 5 | Survey start/resume UX | `KidexAssessmentApp.tsx`, `dashboard/assessment/*` | [ ] |
| 6 | CSS & exception reduction | `globals.css`, page-level style bridges | [ ] |

---

## F. Enforcement (GDS minimum layers)

- [x] Block imports from `legacy-form-primitives`
- [x] Restrict some hardcoded `borderRadius` / `size="xs"` patterns
- [ ] ESLint: forbid `KIDEX_COLORS` and `@/theme/tokens` imports in `app/` and `components/` (allow `theme/` only)
- [ ] ESLint or script: forbid raw hex/rgb in feature UI paths (exclude `theme/`, chart adapters)
- [ ] PR review checklist: uses existing local contract vs new page-local shell/card/header
- [ ] PR review checklist: loading, empty, error, disabled states explicit
- [ ] Optional: visual/contrast spot-check on dashboard shell in light and dark mode

---

## G. Documented exceptions (must stay narrow)

| Exception | Allowed | Review |
|-----------|---------|--------|
| Recharts | Chart rendering only; Mantine owns chrome, layout, controls | [x] documented |
| PDF/export | Non-runtime report output | [x] documented |
| Global CSS | Reset, print, Recharts font, narrow utilities | [ ] shrink to target |
| `theme/tokens.ts` bridge | Until theme migration complete | [ ] remove when C complete |

---

## H. Release gates (run before closing #50)

```bash
npm test
npm run lint
npm run build
npm run typecheck
```

Manual smoke (conductor, mobile width):

- [ ] Primary nav destinations reachable from footer without opening drawer
- [ ] Dashboard: overdue / due soon / start-resume visible before deep analytics scroll
- [ ] Child card: one clear primary action on phone
- [ ] Record/child detail: header actions consistent and tappable
- [ ] Dark and light mode: shell and dashboard text readable (no mixed-mode islands)

---

## Compliance summary

| Level | Meaning | KIDEX today |
|-------|---------|-------------|
| **Adopting** | SSOT referenced; Mantine present | Passed |
| **Migrating** | Adapter + partial contracts; known debt | **Current** |
| **Governed** | Single token source, active contracts, enforcement, narrow exceptions | Target |

When all sections **A–G** are checked and section **H** passes, update [design-system.md](./design-system.md) `Local status` from `migrating` to `governed`.
