# GDS Pull Request Review Checklist

Use this checklist when reviewing UI changes in KIDEX.

## Pattern reuse

- [ ] Uses an existing local contract (`PageHeader`, `DetailActionBar`, `MetricCard`, `DataToolbar`, `LoadingState`, `EmptyState`, `ErrorState`, `SectionCard`) instead of inventing a page-local variant
- [ ] Shell, header, card, metric, toolbar, and state-block paths in [design-system.md](./design-system.md) still match the implementation

## Mantine-only and tokens

- [ ] New UI uses Mantine primitives or approved thin wrappers only
- [ ] No imports from `@/theme/brand-colors` or removed `@/theme/tokens` in `app/` or `components/`
- [ ] No raw hex/rgb in feature UI outside `components/analytics/chart-series-colors.ts`

## States

- [ ] Loading, empty, error, disabled, and success states are explicit
- [ ] Detail pages with multiple actions use `DetailActionBar` (primary + overflow menu on mobile)

## Responsive conductor UX

- [ ] Mobile surfaces expose one obvious primary action where the workflow is operational (child cards, detail headers)
- [ ] Dashboard mobile order remains operational-first when touched

## Documentation

- [ ] User-facing strings added to `messages/en.json`, `messages/hu.json`, and `messages/ar.json`
- [ ] [gds-compliance-checklist.md](./gds-compliance-checklist.md) updated if contract maturity or backlog changed
