# KIDEX Definition of Done

This DoD is for product and platform changes in the current repository.

## Verification

Required before closing implementation work unless a constraint is explicitly documented:

- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`

If one check cannot be completed, the reason must be stated explicitly.

## Build and runtime expectations

- the app must build successfully
- the relevant route or workflow must still render after the change
- auth, consent, and export constraints must not be bypassed accidentally

## Data and governance expectations

- new persisted data must be validated
- sensitive actions must remain permission-checked
- if the change affects a governed workflow, audit behavior must be preserved or extended deliberately
- if the change affects reporting or interpretation, family-safe wording must remain separate from practitioner wording where needed

## UI expectations

- all new user-facing strings must live in `messages/*`
- new UI must align with the shared design/UI/UX SSOT at [sovereignsquad/general-design-system](https://github.com/sovereignsquad/general-design-system)
- project-local UI docs are adapters only; they must not redefine shared design-system behavior (aligned GDS line `2.6.3`)
- new product UI primitives must be Mantine primitives or thin Mantine wrappers only
- workflow additions should avoid unnecessary friction, especially inside assessment and child-history surfaces

## Documentation expectations

- update docs when behavior, routes, env vars, permissions, or major workflows change
- keep README and the affected docs aligned with the shipped code, not roadmap assumptions

## Communication expectations

- describe what changed factually
- only claim something works when it was actually verified
- mention known residual risks or repository quirks when relevant
