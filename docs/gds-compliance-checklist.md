# KIDEX GDS Compliance Checklist

Aligned GDS line: `3.0.0 / 2026-06-01`
Manifest: [gds-adoption.json](../gds-adoption.json)  
Adapter: [design-system.md](./design-system.md)

## Governance

- [x] Shared SSOT documented with public GDS source links
- [x] Local adapter states that GDS is the authority
- [x] Adoption manifest exists and is versioned in-repo
- [x] Local primitive adapters are either removed or explicitly justified
- [x] Exception surfaces are explicit and temporary where required

## Runtime

- [x] Root provider comes from `@doneisbetter/gds/client`
- [x] Theme extension comes from `@doneisbetter/gds/server`
- [x] Root notifications and modals are mounted through GDS provider runtime
- [x] GDS locale/message bridge is wired in app layout
- [x] Runtime imports prefer the umbrella `@doneisbetter/gds` client/server surface

## Surface adoption

- [x] Authenticated dashboard shell is built on `@doneisbetter/gds`
- [x] Children and records registries use `ResponsiveDataView`
- [x] Major route headers use GDS `PageHeader`
- [x] Assessment workflow uses GDS `EditorScaffold` and `FormSection`
- [x] Shared cards/toolbars/state surfaces use direct GDS runtime components

## Repo compliance

- [x] `@doneisbetter/gds-eslint-config` is wired into ESLint
- [x] `@doneisbetter/gds-compliance` CLI is installed
- [x] Manifest validation script exists
- [x] Compliance check script exists
- [x] No legacy placeholder GDS imports remain
- [x] No obsolete local adapter imports remain in app and component surfaces
- [x] No `@/components/ui/*` imports remain in app and component surfaces

## Exceptions

- [x] Recharts documented as an approved rendering exception
- [x] PDF/export rendering documented as an approved exception
- [x] Searchable selection documented as a bounded page-level exception
- [x] Product-authored KIDEX experience blocks are documented as GDS-compliant compositions, not design-system exceptions

## Verification gates

- [x] `npm run gds:manifest`
- [x] `npm run gds:compliance`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
