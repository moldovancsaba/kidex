# Legal and Company Information

KIDEX currently exposes localized public legal pages at:

- `/{locale}/legal/gtc`
- `/{locale}/legal/privacy`

Supported locales:

- `en`
- `hu`
- `ar`

These routes are public even when dashboard auth enforcement is enabled.

## Company profile source

The default company profile is defined in [`services/settings-service.ts`](../services/settings-service.ts) and can be changed through dashboard settings.

Current seeded defaults:

- name: `KIDEX s.r.o.`
- IČO: `57474869`
- registered: `19.02.2026`
- legal form: `Limited Liability Company`
- address: `Želiarsky svah 29, Štúrovo, Slovakia 943 01`
- share capital: `EUR 5 000`
- VAT number: `SK2122770606`
- website: `https://kidex.eu`

## App version source

The displayed app version comes from [`lib/app-version.ts`](../lib/app-version.ts).

Current app version:

- `0.5.0`

## Where company and version data are shown

- dashboard footer
- public GTC page
- public privacy page
- settings-backed legal content flows
