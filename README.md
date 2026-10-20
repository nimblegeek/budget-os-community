# Budget OS

A clean, mobile-friendly personal-finance workspace. Swedish UI, SEK amounts,
minimal mono styling, and no automatic bank access or payment execution.

MIT-licensed. Self-host the app and database with your own identity-provider keys.

Community source: [nimblegeek/budget-os-community](https://github.com/nimblegeek/budget-os-community).

## What it does

- **Spara:** savings goals, registered capital and monthly saving plans.
- **Planera:** monthly budget, priority expenses, manual transactions, Nordea CSV,
  income sources, actual-versus-plan overview, scenario simulation and backups.
- **Skulder & stöd:** loans, repayment forecasts, manual debt progress and optional
  creditor/advisor workflows. Drafts and agreements do not execute payments or
  automatically contact creditors.
- **Investera:** a clearly marked future area, not a portfolio manager.
- Desktop Cmd/Ctrl+K search, collapsible sidebar, arbitrary date ranges and dark mode.
- Public landing page with creator credit to [JAS](https://jonasasihlen.com).

## Separate private accounts

Every verified account starts with its own empty workspace. Users do not inherit
somebody else's budget. Owners can explicitly share read-only access with an
advisor; invited users still have their own private workspace by default.

Financial records, source profiles, audit entries and backups are scoped to the
workspace. An owner cannot see an advisor's private finances in return.
Workspace IDs supplied by a client are not trusted as authorization.

Read [SECURITY.md](SECURITY.md) for the boundaries and operational limitations.

## Run it yourself

Stack: Next.js 16 / React 19, Clerk identity, PostgreSQL, Node.js 24.

You need **your own** Clerk application and PostgreSQL credentials. No production
records, account statements, keys or existing workspace are distributed.

See [SELF_HOSTING.md](SELF_HOSTING.md) for:
- Docker Compose with a local PostgreSQL database and non-root app container.
- Direct Node deployment or an existing PostgreSQL/Neon database.
- Environment configuration, migrations, HTTPS and backups.
- Safe transition from an older single-household installation.

Quick local setup after configuring `.env.local` from `.env.example`:

```sh
npm ci
npm run db:migrate
npm run dev
```

Verification:

```sh
npm test
npm run build
```

The isolated `npm run dev:local` fixture uses synthetic data, not Clerk or a
production database. It is for development **only** and must not be deployed.

## Data semantics

Planned income/costs are separate from actual transactions. Income is positive,
expenses negative, refunds retain their sign and transfers do not count as income
or expenses. Values must be representable as whole öre; validation rejects finer
fractions. Workspace budgets and immutable snapshots are stored as versioned JSON
in PostgreSQL, with optimistic revisions, atomic writes and SHA-256 checksums.
Legacy normalized tables remain only for a gated one-time migration/recovery.

Debt forecasts are hypothetical calculations, not lender offers or financial
advice. Savings balances are manually recorded, not bank-synced. There is no
automatic tax/VAT calculation. Exported snapshots contain private financial data.

## License

[MIT](LICENSE). Third-party dependencies/assets retain their respective licenses;
see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
