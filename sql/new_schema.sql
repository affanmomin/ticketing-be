-- ========= Extensions & Helpers =========
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- updated_at helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END$$;

-- ========= Organization / Client / Users =========

CREATE TABLE organization (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_organization_updated_at
BEFORE UPDATE ON organization
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE client (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text,
  phone           text,
  address         text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_client_org_name UNIQUE (organization_id, name)
);
CREATE INDEX ix_client_org ON client(organization_id);
CREATE TRIGGER trg_client_updated_at
BEFORE UPDATE ON client
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- System users (admins + client users)
CREATE TABLE app_user (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  client_id       uuid NULL REFERENCES client(id) ON DELETE SET NULL,  -- NULL => internal/admin-side
  user_type       text NOT NULL CHECK (user_type IN ('ADMIN','EMPLOYEE','CLIENT')),
  email           citext NOT NULL UNIQUE,
  full_name       text NOT NULL,
  password_hash   text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_app_user_org    ON app_user(organization_id);
CREATE INDEX ix_app_user_client ON app_user(client_id);
CREATE TRIGGER trg_app_user_updated_at
BEFORE UPDATE ON app_user
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= Projects & Membership =========

CREATE TABLE project (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  start_date    date,
  end_date      date,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_project_client_name UNIQUE (client_id, name)
);
CREATE INDEX ix_project_client ON project(client_id);
CREATE TRIGGER trg_project_updated_at
BEFORE UPDATE ON project
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Per-project permissions
CREATE TABLE project_member (
  project_id        uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role              text NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('MEMBER','MANAGER','VIEWER')),
  can_raise         boolean NOT NULL DEFAULT false,
  can_be_assigned   boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX ix_project_member_user ON project_member(user_id);

-- ========= Taxonomies (Project-scoped) =========

CREATE TABLE stream (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_stream_project_name UNIQUE (project_id, name)
);
-- Target for composite FK from ticket
CREATE UNIQUE INDEX ux_stream_id_project ON stream(id, project_id);
CREATE INDEX ix_stream_project ON stream(project_id);
CREATE TRIGGER trg_stream_updated_at
BEFORE UPDATE ON stream
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE subject (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_subject_project_name UNIQUE (project_id, name)
);
-- Target for composite FK from ticket
CREATE UNIQUE INDEX ux_subject_id_project ON subject(id, project_id);
CREATE INDEX ix_subject_project ON subject(project_id);
CREATE TRIGGER trg_subject_updated_at
BEFORE UPDATE ON subject
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= Global (system-wide) LOOKUPS =========

CREATE TABLE priority (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,        -- Low/Medium/High/Urgent
  rank        int  NOT NULL CHECK (rank BETWEEN 1 AND 100),
  color_hex   text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_priority_updated_at
BEFORE UPDATE ON priority
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE status (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,        -- New/In Progress/Resolved/Closed
  is_closed   boolean NOT NULL DEFAULT false,
  sequence    int NOT NULL DEFAULT 100,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_status_updated_at
BEFORE UPDATE ON status
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========= Tickets & Workflow =========

CREATE TABLE ticket (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  raised_by_user_id    uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  assigned_to_user_id  uuid NULL REFERENCES app_user(id) ON DELETE SET NULL,
  -- Project-scoped taxonomy FKs with composite integrity
  stream_id            uuid NOT NULL,
  subject_id           uuid NOT NULL,
  priority_id          uuid NOT NULL REFERENCES priority(id) ON DELETE RESTRICT,
  status_id            uuid NOT NULL REFERENCES status(id)   ON DELETE RESTRICT,
  title                text NOT NULL,
  description_md       text,
  is_deleted           boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  closed_at            timestamptz,
  CONSTRAINT fk_ticket_stream_project
    FOREIGN KEY (project_id, stream_id)  REFERENCES stream(project_id, id)  ON DELETE RESTRICT,
  CONSTRAINT fk_ticket_subject_project
    FOREIGN KEY (project_id, subject_id) REFERENCES subject(project_id, id) ON DELETE RESTRICT
);
CREATE INDEX ix_ticket_project   ON ticket(project_id);
CREATE INDEX ix_ticket_assignee  ON ticket(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;
CREATE INDEX ix_ticket_status    ON ticket(status_id);
CREATE INDEX ix_ticket_priority  ON ticket(priority_id);
CREATE INDEX ix_ticket_created   ON ticket(created_at);
CREATE INDEX ix_ticket_stream    ON ticket(stream_id);
CREATE INDEX ix_ticket_subject   ON ticket(subject_id);
CREATE TRIGGER trg_ticket_updated_at
BEFORE UPDATE ON ticket
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Comments (PUBLIC for client-visible, INTERNAL for staff-only)
CREATE TABLE ticket_comment (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  visibility  text NOT NULL CHECK (visibility IN ('PUBLIC','INTERNAL')),
  body_md     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_comment_ticket     ON ticket_comment(ticket_id);
CREATE INDEX ix_comment_author     ON ticket_comment(author_id);
CREATE INDEX ix_comment_visibility ON ticket_comment(visibility);

-- Attachments
CREATE TABLE ticket_attachment (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    uuid NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
  uploaded_by  uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  file_name    text NOT NULL,
  mime_type    text NOT NULL,
  file_size    bigint NOT NULL CHECK (file_size >= 0),
  storage_url  text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_attach_ticket ON ticket_attachment(ticket_id);

-- Immutable audit trail
CREATE TABLE ticket_event (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
  actor_id    uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
  event_type  text NOT NULL CHECK (event_type IN (
                'TICKET_CREATED','STATUS_CHANGED','PRIORITY_CHANGED',
                'ASSIGNEE_CHANGED','COMMENT_ADDED','TITLE_UPDATED',
                'DESCRIPTION_UPDATED','STREAM_CHANGED','SUBJECT_CHANGED'
              )),
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_event_ticket ON ticket_event(ticket_id);
CREATE INDEX ix_event_actor  ON ticket_event(actor_id);
CREATE INDEX ix_event_type   ON ticket_event(event_type);

-- ========= Notification Outbox (for mailers / automations) =========
CREATE TABLE notification_outbox (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic             text NOT NULL CHECK (topic IN (
                       'TICKET_CREATED','TICKET_UPDATED','TICKET_ASSIGNED',
                       'STATUS_CHANGED','COMMENT_ADDED'
                     )),
  ticket_id         uuid NOT NULL REFERENCES ticket(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  payload           jsonb NOT NULL,   -- {subject, body, template, variables}
  attempts          int NOT NULL DEFAULT 0,
  delivered_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_outbox_ticket    ON notification_outbox(ticket_id);
CREATE INDEX ix_outbox_recipient ON notification_outbox(recipient_user_id);
CREATE INDEX ix_outbox_pending   ON notification_outbox(delivered_at) WHERE delivered_at IS NULL;

-- ========= Views (handy for APIs) =========

-- Client-visible ticket rows (adds client_id; filters soft-deleted)
CREATE OR REPLACE VIEW v_ticket_client_visible AS
SELECT t.*, p.client_id
FROM ticket t
JOIN project p ON p.id = t.project_id
WHERE t.is_deleted = false;

-- Search-friendly view with resolved names
CREATE OR REPLACE VIEW v_ticket_search AS
SELECT
  t.id,
  t.title,
  t.created_at,
  t.updated_at,
  p.name   AS project_name,
  c.name   AS client_name,
  s2.name  AS status_name,
  pr.name  AS priority_name,
  st.name  AS stream_name,
  sbj.name AS subject_name,
  t.assigned_to_user_id
FROM ticket t
JOIN project  p   ON p.id  = t.project_id
JOIN client   c   ON c.id  = p.client_id
JOIN status   s2  ON s2.id = t.status_id
JOIN priority pr  ON pr.id = t.priority_id
JOIN stream   st  ON st.id = t.stream_id  AND st.project_id  = t.project_id
JOIN subject  sbj ON sbj.id = t.subject_id AND sbj.project_id = t.project_id
WHERE t.is_deleted = false;

-- ========= Global Seed (status/priority) =========
INSERT INTO priority (name, rank, color_hex) VALUES
  ('Low',10,'#8BC34A'),
  ('Medium',20,'#FFC107'),
  ('High',30,'#FF9800'),
  ('Urgent',40,'#F44336')
ON CONFLICT (name) DO NOTHING;

INSERT INTO status (name, is_closed, sequence) VALUES
  ('New', false, 10),
  ('In Progress', false, 20),
  ('Resolved', true, 90),
  ('Closed', true, 100)
ON CONFLICT (name) DO NOTHING;
