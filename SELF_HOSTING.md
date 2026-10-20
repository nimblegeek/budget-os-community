# Self-hosting Budget OS

This is a Next.js app, not a static website. You need Node.js 24, PostgreSQL,
and your own Clerk application for registration, sign-in and verified email.
The repository contains no production financial data, default household,
preconfigured owner account or deployment credentials.

## 1. Configure your own identity provider

Create/configure your own Clerk application using Clerk's dashboard and documentation.
Enable the signup methods you want, require email verification, and configure your
application's domain. Use development keys only for localhost and production keys
for a real deployment. The app requires a verified primary email.

Set the public key and secret key for the **same** Clerk application.
The public key is embedded at build time; the secret key is runtime-only.
Never paste keys into an issue or commit them.

## 2. Run with Docker Compose

Copy `.env.example` to `.env`. Set your Clerk keys, `APP_URL`, and a strong,
random **hexadecimal** `POSTGRES_PASSWORD` (for example, generate one with
`openssl rand -hex 24`). Hex avoids URL-encoding ambiguity in the internal DB URL.
Leave `BUDGET_OWNER_EMAIL` unset for a fresh installation.

```sh
docker compose build migrate
docker compose up -d
docker compose ps -a
```

The migration job must exit successfully before the app starts. Open
`http://localhost:3000` for a local setup. PostgreSQL is on the internal Docker
network and is not published on a host port. Its data is in the named
`budget-postgres` volume. Ordinary `docker compose down` retains that volume;
do not delete it unless you intend to lose the database.

For an internet-facing installation, use your own HTTPS reverse proxy in front
of `127.0.0.1:3000`, set `APP_URL=https://your-domain.example`, and configure
that exact domain in Clerk. Do not expose the database publicly. A different
public Clerk key requires rebuilding the image.

## 3. Or run directly with Node

Install Node 24. Copy `.env.example` to `.env.local` and fill in your own values.
For a conventional PostgreSQL server use `DATABASE_DRIVER=pg` and a valid
`DATABASE_URL`. Use TLS with certificate verification for remote databases.
For Neon HTTP connections, use `DATABASE_DRIVER=neon`.

```sh
npm ci
npm run db:migrate
npm test
npm run build
npm start
```

For local development, use `npm run dev` instead of build/start. A process
manager must load your runtime environment in production; Next.js loads
`.env.local` when present. Never put `CLERK_SECRET_KEY` in a
`NEXT_PUBLIC_*` variable.

The migration runner uses checksum-verified, ordered migrations and supports
both drivers. Run only one migration job at a time. Migrations are not exposed
as an HTTP endpoint.

## Accounts and privacy

Each verified Clerk user gets exactly one empty personal workspace. Imported
payments, loans, savings, source profiles, audit logs and backups belong to that
workspace. Users default to their own workspace, even when invited to advise
somebody else.

An owner can explicitly invite a verified email as a read-only advisor. No
invitation email is sent by the app: share your app's signup URL yourself.
The advisor selects the shared workspace in the workspace selector. They
cannot save, restore, export backups, or invite others in that workspace.
Revocation is checked server-side on subsequent requests.

Registration does not grant access to any other user's workspace. The server
never trusts the role or workspace ID sent by a browser as authorization.

## Upgrading an older single-household installation

Export an external backup first. Keep a database backup and the previous schema.
Apply all three migrations before running the new code. For the initial
transition only, set `BUDGET_OWNER_EMAIL` to the existing owner's verified email.
The first matching provider subject must also match the already-bound owner ID.

On that owner's first authorized request, the app copies the original budget,
revision, all historical backups, audit log and existing explicit advisor
memberships into that owner's workspace. Original tables remain untouched.
Other accounts always start empty. Subsequent requests never re-seed the workspace.
After confirming the new workspace and recovery history, remove the legacy
bootstrap variable. Do not roll back to the old application after new saves:
the old tables are retained recovery material, not a live mirror.

## Operations

- Use HTTPS, restrictive database access and separate development/production keys.
- Back up PostgreSQL separately. In-app snapshots live in the same database and
  do not protect against database/volume loss.
- Restoring a budget replaces that workspace's financial records, not memberships.
- Snapshots contain sensitive plaintext financial information. They are
  checksummed for corruption detection, not end-to-end encrypted.
- Configure storage limits/monitoring and appropriate infrastructure-level rate
  limits before opening a busy public registration service. Backups are not
  automatically pruned.
- Keep the app/dependencies current. Read `SECURITY.md` before exposing it.
- Deleting an identity-provider account does not automatically purge workspace
  records. Operators must provide their own verified account/data-deletion process.
- The development-only `tests/local-preview` identity adapter must never be deployed.

References: [Clerk documentation](https://clerk.com/docs),
[node-postgres transactions](https://node-postgres.com/features/transactions).
