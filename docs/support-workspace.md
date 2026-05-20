# KIDEX Support Workspace

The support workspace is the child-scoped follow-through layer that sits after assessment and interpretation.

It turns:

- recommendations
- parent guidance
- development plans
- caregiver partnership tools
- coach guidance

into an operational record the team can update over time.

## Purpose

The support workspace exists so KIDEX does not stop at “what was measured.”

It helps the team track:

- what families were asked to support
- what coaches or conductors should reinforce
- what short learning or reflection sequence is active
- whether referral follow-up is open
- what evidence moments should be kept with the child timeline

## Current data model

The runtime model lives in [`lib/support-workspace.ts`](../lib/support-workspace.ts).

Each workspace can contain:

- `caregiverTools`
  - short caregiver education items
  - partnership prompts
  - optional commitment or pledge language
  - progress status and notes
- `coachTools`
  - practical guidance cards for the next coached cycle
  - progress status and notes
- `microLearning`
  - short child-scoped lesson sequences
  - lesson completion
  - simple reflection text
  - current streak calculation
- `referrals`
  - concern type
  - urgency
  - explanation
  - resource and locality fields
  - follow-up and resolution status
- `evidenceJournal`
  - structured development moments
  - domain tags
  - skill tags
  - optional attachment references
  - links back to assessment or plan context

## How the first workspace is created

If no saved workspace exists yet, the child history page derives a default draft from:

- the latest recommendation summary
- the latest assessment
- the current development plan
- mental wellbeing signals
- child and caregiver context

That draft can then be edited and saved.

## Relationship to other modules

The support workspace is not standalone. It is linked to:

- child state summary
- parent improvement guidance
- development plan
- family-safe reporting
- governed communications
- referral-safe escalation handling

## Main UI surfaces

### Child history

Primary operational surface:

- `/{locale}/dashboard/children/[id]`

This page supports:

- editing caregiver tools
- editing coach tools
- progressing micro-learning
- adding and updating referrals
- capturing evidence moments
- reviewing the support context beside state summaries and plans

### Record detail

Compact review surface:

- `/{locale}/dashboard/records/[id]`

This page shows support follow-through summary signals so assessment review stays connected to action.

### Family report

The family report can include selected support context, including:

- parent improvement guidance
- next steps from the plan
- helpful support notes
- open referral-safe follow-up notes
- recent evidence moments

## Boundaries

The current implementation does not provide:

- a public caregiver editing portal for the full workspace
- outcome claims based only on task completion
- a standalone course platform
- clinical endorsement of referral-directory content

## Permissions and governance

The workspace stays inside the child access model:

- read requires child read access
- write requires child write access

Support-workspace saves are audit logged.

Reports and exports that reference support data still remain subject to:

- consent governance
- export permissions
- child visibility rules

## Related documents

- [Product Overview](./product-overview.md)
- [API Reference](./api.md)
- [Access Model](./access-model.md)
