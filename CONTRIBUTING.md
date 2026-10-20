# Contributing

Use Node 24. See README and SELF_HOSTING for local setup.
Run `npm test` and `npm run build` before submitting a change.

Use synthetic fixtures only. Never commit account statements, exports, local
databases, user email addresses, access tokens or environment files.

Changes touching auth, workspace selection, storage, backups or invitations need
tests with at least two unrelated users and an explicitly invited read-only
advisor. Verify that revoked access and forged IDs cannot bypass the boundary.

Keep the interface small, mobile-friendly and accessible. Preserve the distinction
between planned budgets, actual payments, savings balances and debt forecasts.
Do not silently initiate payments or creditor communications.

Project code is MIT-licensed. Dependencies and third-party assets keep their own
licenses. Only contribute material you have the right to share.
