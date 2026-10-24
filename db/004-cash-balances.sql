CREATE TABLE cash_balance_anchors(
 household_id text NOT NULL REFERENCES budget_state(id),
 month text NOT NULL,
 opening_cents bigint NOT NULL,
 PRIMARY KEY(household_id,month)
);
