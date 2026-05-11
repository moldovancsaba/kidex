# KIDEX Role Taxonomy

This document is the canonical role policy for the current KIDEX application.

## Current active runtime roles

These roles are implemented in the product today and can be assigned to users:

| Role | Scope | Purpose |
| --- | --- | --- |
| `admin` | platform | Global administrator for configuration, user access, and high-sensitivity operations. |
| `conductor` | assessment | Primary practitioner who creates, updates, and manages child development records and assessments. |
| `observer` | assessment | Read-oriented practitioner role used for review, history lookup, and limited collaboration. |

## Reserved future roles

These roles are part of the platform direction but are **not assignable in the current runtime**:

| Role | Scope | Purpose |
| --- | --- | --- |
| `institution_admin` | institution | Future organization-scoped administrator for local membership and visibility governance. |
| `reviewer` | assessment | Future specialist reviewer for structured quality review without broad system administration. |
| `guardian_viewer` | family | Future family-facing read-limited access role. |
| `auditor` | oversight | Future compliance and audit review role. |

## Extension policy

New roles must not be added casually. A new role is justified only if at least one of the following is true:

- a user group needs a materially different permission boundary that cannot be expressed safely with the current roles
- a role needs a different scope of ownership, such as institution-scoped versus platform-scoped
- a role exists primarily for governance, review, or family access and should not inherit practitioner powers

Before a new role moves from reserved to active, KIDEX must define:

1. The role's scope of authority.
2. The child, assessment, media, report, benchmark, and export actions it may perform.
3. The server-side authorization behavior for those actions.
4. The UI visibility and route-gating behavior for that role.
5. The audit requirements for sensitive actions performed by that role.

## Guardrails

- Current runtime persistence accepts only active runtime roles.
- Reserved roles may appear in roadmap and design documents, but they must not be silently accepted into stored user data.
- Header-based role parsing must normalize and reject unknown or reserved values until those roles are explicitly activated.

## Bootstrap policy

If the system has no users, the first authenticated user is bootstrapped with:

- `admin`
- `conductor`

This preserves both platform setup ability and day-to-day practitioner capability for the initial operator.
