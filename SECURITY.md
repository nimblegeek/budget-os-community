# Security

Budget OS stores sensitive financial data. Open source does not make a deployment
automatically secure. The maintainer of each installation is responsible for
its identity-provider settings, database access, HTTPS, backups and upgrades.

## Boundaries

- Clerk verifies identity; the server requires a verified primary email.
- Each provider subject has a personal workspace.
- Budget reads, writes, backup access, audit history and membership management
  enforce workspace membership in bound SQL queries.
- Owners may explicitly grant read-only access to a workspace; this does not
  grant them access to the advisor's personal workspace.
- Changing a browser header/record ID does not establish membership.
- Writes require same-origin requests, owner permission and a matching revision.
- Exports and restores are owner-only. Backup lookups are workspace-scoped.
- Authorization is enforced by application queries, not a claim of PostgreSQL
  row-level-security policies or end-to-end encryption. Database administrators
  and server operators can access plaintext records.
- Legacy household tables are accessible only to the gated owner migration, not
  to ordinary workspace endpoints.

Use your own Clerk instance and database. Do not point a community deployment at
another person's production credentials. Do not deploy development test fixtures.

## Reporting

Do not post financial records, backup files, credentials or exploit details in a
public issue. If the repository's Security tab offers private vulnerability
reporting, use it. Otherwise contact the maintainer through their published
contact page to arrange a private report before sharing details. There is no
guaranteed response time or external security certification.

## Tests are not a complete audit

Automated tests cover separate accounts, forged workspace IDs/roles, read-only
advisors, revocation, scoped backups, migration preservation, stale writes and
transaction rollback. They do not replace an independent penetration test,
identity-provider review or production configuration review.
