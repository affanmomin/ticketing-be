-- ============================================
-- Rebuild canonical schema (snake_case)
-- Safe to re-run (idempotent)
-- ============================================

BEGIN;

-- ---- Extensions & helper ----
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$;

-- ---- Enums (create if missing) ----
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ticket_status') THEN
    CREATE TYPE ticket_status AS ENUM ('BACKLOG','TODO','IN_PROGRESS','REVIEW','BLOCKED','DONE','ARCHIVED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ticket_priority') THEN
    CREATE TYPE ticket_priority AS ENUM ('P0','P1','P2','P3');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='ticket_type') THEN
    CREATE TYPE ticket_type AS ENUM ('TASK','BUG','STORY','EPIC','SPIKE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='tenant_role') THEN
    CREATE TYPE tenant_role AS ENUM ('OWNER','ADMIN','MEMBER','GUEST');
  END IF;
END $$;

-- ============================================
-- Tables
-- ============================================

-- TENANT
CREATE TABLE IF NOT EXISTS tenant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- USER (global)
CREATE TABLE IF NOT EXISTS "user" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  role text DEFAULT 'USER',
  active boolean NOT NULL DEFAULT true,
  last_sign_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CLIENT COMPANY (tenant-owned)
CREATE TABLE IF NOT EXISTS client_company (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  domain varchar,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
-- composite uniqueness to support tenant-safe FKs
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_company_tenant_id_id
  ON client_company(tenant_id, id);

-- TENANT MEMBERSHIP
CREATE TABLE IF NOT EXISTS tenant_membership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role tenant_role NOT NULL,
  client_id uuid NULL, -- optional default client context
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
-- ensure optional client belongs to same tenant
ALTER TABLE tenant_membership
  DROP CONSTRAINT IF EXISTS tenant_membership_client_fk,
  ADD CONSTRAINT tenant_membership_client_fk
  FOREIGN KEY (tenant_id, client_id)
  REFERENCES client_company(tenant_id, id)
  ON DELETE SET NULL;

-- USER ↔ CLIENT (scoped by tenant)
CREATE TABLE IF NOT EXISTS user_client_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  UNIQUE (tenant_id, user_id, client_id)
);
ALTER TABLE user_client_map
  DROP CONSTRAINT IF EXISTS user_client_client_fk,
  ADD CONSTRAINT user_client_client_fk
  FOREIGN KEY (tenant_id, client_id)
  REFERENCES client_company(tenant_id, id)
  ON DELETE CASCADE;

-- PROJECT
CREATE TABLE IF NOT EXISTS project (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  name text NOT NULL,
  code varchar NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id, code)
);
ALTER TABLE project
  DROP CONSTRAINT IF EXISTS project_client_fk,
  ADD CONSTRAINT project_client_fk
  FOREIGN KEY (tenant_id, client_id)
  REFERENCES client_company(tenant_id, id)
  ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_tenant_id_id
  ON project(tenant_id, id);

-- PROJECT STREAM
CREATE TABLE IF NOT EXISTS project_stream (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, project_id, name)
);
ALTER TABLE project_stream
  DROP CONSTRAINT IF EXISTS project_stream_project_fk,
  ADD CONSTRAINT project_stream_project_fk
  FOREIGN KEY (tenant_id, project_id)
  REFERENCES project(tenant_id, id)
  ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_stream_tenant_id_id
  ON project_stream(tenant_id, id);

-- TICKET TAG  (expression-based uniqueness via index)
CREATE TABLE IF NOT EXISTS ticket_tag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  client_id uuid NULL,
  name text NOT NULL,
  color varchar NOT NULL
);
-- tenant + (client or global) + name unique
CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_tag_scope_name
  ON ticket_tag (
    tenant_id,
    COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid),
    name
  );
-- case-insensitive alternative (uncomment to enforce lower(name) uniqueness)
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_tag_scope_name_ci
--   ON ticket_tag (
--     tenant_id,
--     COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid),
--     lower(name)
--   );
ALTER TABLE ticket_tag
  DROP CONSTRAINT IF EXISTS ticket_tag_client_fk,
  ADD CONSTRAINT ticket_tag_client_fk
  FOREIGN KEY (tenant_id, client_id)
  REFERENCES client_company(tenant_id, id)
  ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_tag_tenant_id_id
  ON ticket_tag(tenant_id, id);

-- TICKET
CREATE TABLE IF NOT EXISTS ticket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  project_id uuid NOT NULL,
  stream_id uuid NULL,
  reporter_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  assignee_id uuid NULL   REFERENCES "user"(id) ON DELETE SET NULL,
  title varchar NOT NULL,
  description_md text NOT NULL DEFAULT '',
  status ticket_status NOT NULL DEFAULT 'BACKLOG',
  priority ticket_priority NOT NULL DEFAULT 'P2',
  type ticket_type NOT NULL DEFAULT 'TASK',
  points integer,
  due_date timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ticket
  DROP CONSTRAINT IF EXISTS ticket_client_fk,
  ADD CONSTRAINT ticket_client_fk
  FOREIGN KEY (tenant_id, client_id)
  REFERENCES client_company(tenant_id, id)
  ON DELETE CASCADE;
ALTER TABLE ticket
  DROP CONSTRAINT IF EXISTS ticket_project_fk,
  ADD CONSTRAINT ticket_project_fk
  FOREIGN KEY (tenant_id, project_id)
  REFERENCES project(tenant_id, id)
  ON DELETE CASCADE;
ALTER TABLE ticket
  DROP CONSTRAINT IF EXISTS ticket_stream_fk,
  ADD CONSTRAINT ticket_stream_fk
  FOREIGN KEY (tenant_id, stream_id)
  REFERENCES project_stream(tenant_id, id)
  ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_tenant_id_id
  ON ticket(tenant_id, id);

-- TAG MAP
CREATE TABLE IF NOT EXISTS ticket_tag_map (
  ticket_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);
ALTER TABLE ticket_tag_map
  DROP CONSTRAINT IF EXISTS ttm_ticket_fk,
  ADD CONSTRAINT ttm_ticket_fk
  FOREIGN KEY (tenant_id, ticket_id)
  REFERENCES ticket(tenant_id, id)
  ON DELETE CASCADE;
ALTER TABLE ticket_tag_map
  DROP CONSTRAINT IF EXISTS ttm_tag_fk,
  ADD CONSTRAINT ttm_tag_fk
  FOREIGN KEY (tenant_id, tag_id)
  REFERENCES ticket_tag(tenant_id, id)
  ON DELETE CASCADE;

-- COMMENT
CREATE TABLE IF NOT EXISTS comment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL,
  author_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  body_md text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE comment
  DROP CONSTRAINT IF EXISTS comment_ticket_fk,
  ADD CONSTRAINT comment_ticket_fk
  FOREIGN KEY (tenant_id, ticket_id)
  REFERENCES ticket(tenant_id, id)
  ON DELETE CASCADE;

-- ATTACHMENT
CREATE TABLE IF NOT EXISTS attachment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL,
  uploader_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime text NOT NULL,
  size integer NOT NULL CHECK (size >= 0),
  s3_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE attachment
  DROP CONSTRAINT IF EXISTS attachment_ticket_fk,
  ADD CONSTRAINT attachment_ticket_fk
  FOREIGN KEY (tenant_id, ticket_id)
  REFERENCES ticket(tenant_id, id)
  ON DELETE CASCADE;

-- ============================================
-- Indexes for performance
-- ============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_user_email_lower ON "user"(lower(email));

-- Client company
CREATE INDEX IF NOT EXISTS idx_client_company_tenant_name
  ON client_company(tenant_id, lower(name));

-- Project / stream
CREATE INDEX IF NOT EXISTS idx_project_code
  ON project(tenant_id, client_id, code);
CREATE INDEX IF NOT EXISTS idx_stream_name
  ON project_stream(tenant_id, project_id, name);

-- Tickets
CREATE INDEX IF NOT EXISTS idx_ticket_status      ON ticket(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ticket_priority    ON ticket(tenant_id, priority);
CREATE INDEX IF NOT EXISTS idx_ticket_due_date    ON ticket(tenant_id, due_date);
CREATE INDEX IF NOT EXISTS idx_ticket_assignee_t  ON ticket(tenant_id, assignee_id);
CREATE INDEX IF NOT EXISTS idx_ticket_created_at  ON ticket(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_project     ON ticket(project_id);
CREATE INDEX IF NOT EXISTS idx_ticket_stream      ON ticket(stream_id);

-- Tags & maps
CREATE INDEX IF NOT EXISTS idx_tagmap_ticket ON ticket_tag_map(ticket_id);
-- If you expect case-insensitive tag lookups, also:
CREATE INDEX IF NOT EXISTS idx_ticket_tag_scope_name_search
  ON ticket_tag(tenant_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

-- Comments / Attachments
CREATE INDEX IF NOT EXISTS idx_comment_ticket ON comment(ticket_id);
CREATE INDEX IF NOT EXISTS idx_attachment_ticket ON attachment(ticket_id);

-- ============================================
-- updated_at triggers
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_tenant_updated_at'
  ) THEN
    CREATE TRIGGER trg_tenant_updated_at BEFORE UPDATE ON tenant
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_user_updated_at'
  ) THEN
    CREATE TRIGGER trg_user_updated_at BEFORE UPDATE ON "user"
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_client_company_updated_at'
  ) THEN
    CREATE TRIGGER trg_client_company_updated_at BEFORE UPDATE ON client_company
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_project_updated_at'
  ) THEN
    CREATE TRIGGER trg_project_updated_at BEFORE UPDATE ON project
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_project_stream_updated_at'
  ) THEN
    CREATE TRIGGER trg_project_stream_updated_at BEFORE UPDATE ON project_stream
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='trg_ticket_updated_at'
  ) THEN
    CREATE TRIGGER trg_ticket_updated_at BEFORE UPDATE ON ticket
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

COMMIT;
