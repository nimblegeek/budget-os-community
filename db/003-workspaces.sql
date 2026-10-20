CREATE TABLE workspaces(
 id text PRIMARY KEY,
 owner_user_id text NOT NULL UNIQUE,
 name text NOT NULL,
 created_at text NOT NULL
);
CREATE TABLE workspace_members(
 workspace_id text NOT NULL REFERENCES workspaces(id),
 email text NOT NULL,
 user_id text,
 role text NOT NULL CHECK(role IN ('owner','viewer')),
 created_at text NOT NULL,
 PRIMARY KEY(workspace_id,email)
);
CREATE UNIQUE INDEX workspace_one_owner ON workspace_members(workspace_id) WHERE role='owner';
CREATE INDEX workspace_members_user ON workspace_members(user_id,workspace_id);
CREATE TABLE workspace_budgets(
 workspace_id text PRIMARY KEY REFERENCES workspaces(id),
 payload text NOT NULL,
 sha256 text NOT NULL,
 revision integer NOT NULL CHECK(revision>=0),
 updated_at text NOT NULL,
 write_token text NOT NULL
);
CREATE TABLE workspace_backups(
 workspace_id text NOT NULL REFERENCES workspaces(id),
 id text NOT NULL,
 revision integer NOT NULL,
 created_at text NOT NULL,
 reason text NOT NULL,
 sha256 text NOT NULL,
 payload text NOT NULL,
 PRIMARY KEY(workspace_id,id)
);
CREATE INDEX workspace_backups_recent ON workspace_backups(workspace_id,created_at DESC);
CREATE TABLE workspace_activity(
 workspace_id text NOT NULL REFERENCES workspaces(id),
 id text NOT NULL,
 actor text NOT NULL,
 action text NOT NULL,
 created_at text NOT NULL,
 PRIMARY KEY(workspace_id,id)
);
