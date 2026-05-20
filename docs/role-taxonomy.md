# KIDEX Role Taxonomy

This document defines the canonical role model for the current runtime.

## Active runtime roles

These roles are accepted by the product today:

| Role | Scope | Purpose |
| --- | --- | --- |
| `admin` | platform | configuration, governance, standards, user access, audit, and high-sensitivity actions |
| `conductor` | institution / practitioner | creates and manages children, assessments, plans, support, and governed communications within allowed scope |
| `observer` | institution / reviewer | read-oriented access for review, history lookup, and report visibility without mutation powers |

## Reserved future roles

These are documented directionally but are not active runtime roles:

| Role | Purpose |
| --- | --- |
| `institution_admin` | future institution-scoped administration |
| `reviewer` | future structured quality-review role |
| `guardian_viewer` | future family-facing limited account type |
| `auditor` | future compliance-focused oversight role |

## Guardrails

- only active runtime roles are accepted into stored user data
- reserved roles must not be persisted or granted implicitly
- header parsing normalizes active roles and rejects unknown or reserved ones

## Bootstrap rule

If the system has no users at all, the first successful SSO login is bootstrapped with:

- `admin`
- `conductor`

This preserves both initial setup ability and day-to-day practitioner capability.

## When a new role is justified

A new role should only move from reserved to active when KIDEX needs a materially different boundary for:

- ownership scope
- child or assessment visibility
- standards, export, or governance actions
- family-facing access
- review or compliance duties

Before activation, define:

1. scope of authority
2. permission matrix
3. API enforcement behavior
4. dashboard visibility and route gating
5. audit requirements

## Related documents

- [Access Model](./access-model.md)
- [API Reference](./api.md)
