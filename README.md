# Proactive Wellness

A Durban home-care software prototype with a responsive member portal, staff workspace and Expo mobile client. All bundled records are fictional. Working name: **Proactive Wellness**.

## Run locally

Requires Node.js 24+ and pnpm 11. Install with `pnpm install`, then `pnpm build` and `pnpm start`. Open http://localhost:4173 and choose **Explore the member demo**. The role selector demonstrates the member, family, doctor, nurse, back-office, pharmacy and driver views.

The first start creates an encrypted local SQLite database and local development key in ignored `data/`. `.env.example` documents the optional PostgreSQL configuration. Do not put real records or credentials into the demo.

Commands:

- `pnpm test`: API workflow and review-mode tests.
- `pnpm typecheck`: web/API and mobile TypeScript checks.
- `pnpm build`: normal web build in `dist/`, served by the local API.
- `node scripts/build.mjs --preview`: separate static, fictional-only review build in `dist-preview/`.
- `node scripts/create-preview-fixture.mjs`: regenerate sample snapshots from a fresh temporary database. This never reads the running database.
- `pnpm mobile`: start the Expo client. Set `EXPO_PUBLIC_API_URL` for the device's reachable development server; see `apps/mobile/.env.example`.

## What is implemented

Local OTP account flow, versioned consents, an empty record for new members, member ownership and staff role checks, encrypted records, append-only audit entries, readings with clinician-set flag thresholds, family grants/revocation, document upload and staff verification, emergency summaries and expiring one-use links, exports, deletion requests, fixed-price membership/test billing, home-visit completion billing, consultation requests and signed notes, nurse review/escalation, delivery status transitions and a demonstration proof-of-delivery flow.

Fixed fees are held in cents: Connect R995, Monitor R1,700, Concierge R2,650 per month and home visit R1,850, VAT inclusive. Monitor devices are intended to be supplied on loan. No payment is collected by this prototype.

The mobile client includes member home/vault/care/delivery and selected settings/billing flows, plus a driver view. It is not yet feature-equivalent to the web portal. Phone/emulator acceptance testing is outstanding.

## Private review build

`dist-preview/` has no API, credentials or database connection. It contains only generated fictional fixtures. Navigation, sample role selection, colour selection, sample readings, consultation requests, reminders and plan selection work in browser memory. Refresh resets sample changes. Other actions explain that they require the local application. Hosting access control belongs to Sites; the sample role selector is not authentication.

The normal build never uses this adapter. Built web files and safe fixtures are tracked at the user's request. Runtime SQLite data, keys, sessions, environment files and dependencies are excluded from Git.

Choose **Colour direction** to compare the original sage design and three alternatives. [Colour screenshots](docs/colour-options/) and the [home-monitoring partner research](docs/home-monitoring-partners.md) are included.

## Deployment and scope

This is a reviewable prototype, not a live clinical service. Production startup deliberately fails until provider and operational release requirements are satisfied. See [release requirements](docs/RELEASE.md). The private static review does not satisfy the specification's South African hosting requirement for real patient data.

The local record store supports SQLite and a PostgreSQL adapter, with encrypted payloads and ownership indexes. PostgreSQL requires integration/performance testing before production. `apps/api/migrations/001_domain.sql` is the generated domain schema reference; the current migrator creates the schema and audit triggers on startup.
