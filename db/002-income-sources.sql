ALTER TABLE budget_state ADD COLUMN income_sources_enabled integer NOT NULL DEFAULT 0;
CREATE TABLE income_sources(
 id text PRIMARY KEY,
 household_id text NOT NULL REFERENCES budget_state(id),
 name text NOT NULL,
 channel text NOT NULL,
 type text NOT NULL,
 monthly_target_cents bigint NOT NULL CHECK(monthly_target_cents >= 0),
 notes text NOT NULL,
 archived integer NOT NULL,
 position integer NOT NULL
);
ALTER TABLE transactions ADD COLUMN income_source_id text REFERENCES income_sources(id) DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX transactions_income_source_idx ON transactions(household_id,income_source_id,date);
