BEGIN;

-- ============================================
-- 1) NUKE DATA (but keep schema)
-- ============================================
-- Order doesn't matter with CASCADE; RESTART IDENTITY only affects serials (safe anyway)
TRUNCATE TABLE
  ticket_tag_map,
  comment,
  attachment,
  ticket,
  ticket_tag,
  project_stream,
  project,
  user_client_map,
  tenant_membership,
  client_company,
  "user",
  tenant
RESTART IDENTITY CASCADE;

-- ============================================
-- 2) SEED DATA
-- ============================================

-- Tenants
WITH t_acme AS (
  INSERT INTO tenant (name) VALUES ('Acme Agency')
  RETURNING id AS tenant_id
),
t_beta AS (
  INSERT INTO tenant (name) VALUES ('Beta Studio')
  RETURNING id AS tenant_id
),

-- Users (global)
u_ins AS (
  INSERT INTO "user" (email, name, password_hash, role)
  VALUES
    ('admin@acme.com',  'Admin User',   '$2b$12$examplehashadmin', 'ADMIN'),
    ('user@acme.com',   'Regular User', '$2b$12$examplehashuser',  'USER'),
    ('owner@beta.com',  'Beta Owner',   '$2b$12$examplehashbeta',  'ADMIN')
  RETURNING id, email
),
u AS (
  SELECT * FROM u_ins
),

-- Client companies (per tenant)
c_acme AS (
  INSERT INTO client_company (tenant_id, name, domain)
  SELECT tenant_id, 'DataClient', 'dataclient.com' FROM t_acme
  RETURNING id AS client_id, tenant_id
),
c_beta AS (
  INSERT INTO client_company (tenant_id, name, domain)
  SELECT tenant_id, 'MainClient', 'mainclient.io' FROM t_beta
  RETURNING id AS client_id, tenant_id
),

-- Tenant memberships (roles in tenant; default client context optional)
tm_acme_owner AS (
  INSERT INTO tenant_membership (tenant_id, user_id, role, client_id)
  SELECT a.tenant_id,
         (SELECT id FROM u WHERE email='admin@acme.com'),
         'OWNER',
         c.client_id
  FROM t_acme a JOIN c_acme c ON c.tenant_id = a.tenant_id
  RETURNING id
),
tm_acme_member AS (
  INSERT INTO tenant_membership (tenant_id, user_id, role, client_id)
  SELECT a.tenant_id,
         (SELECT id FROM u WHERE email='user@acme.com'),
         'MEMBER',
         c.client_id
  FROM t_acme a JOIN c_acme c ON c.tenant_id = a.tenant_id
  RETURNING id
),
tm_beta_owner AS (
  INSERT INTO tenant_membership (tenant_id, user_id, role, client_id)
  SELECT b.tenant_id,
         (SELECT id FROM u WHERE email='owner@beta.com'),
         'OWNER',
         c.client_id
  FROM t_beta b JOIN c_beta c ON c.tenant_id = b.tenant_id
  RETURNING id
),

-- User ↔ Client maps (who can access which client)
ucm_acme_user_dataclient AS (
  INSERT INTO user_client_map (tenant_id, user_id, client_id)
  SELECT a.tenant_id,
         (SELECT id FROM u WHERE email='user@acme.com'),
         c.client_id
  FROM t_acme a JOIN c_acme c ON c.tenant_id = a.tenant_id
  RETURNING id
),

-- Projects
p_acme_mdash AS (
  INSERT INTO project (tenant_id, client_id, name, code)
  SELECT a.tenant_id, c.client_id, 'Marketing Dashboard', 'MDASH'
  FROM t_acme a JOIN c_acme c ON c.tenant_id = a.tenant_id
  RETURNING id AS project_id, tenant_id, client_id
),
p_beta_site AS (
  INSERT INTO project (tenant_id, client_id, name, code)
  SELECT b.tenant_id, c.client_id, 'Website Revamp', 'WSITE'
  FROM t_beta b JOIN c_beta c ON c.tenant_id = b.tenant_id
  RETURNING id AS project_id, tenant_id, client_id
),

-- Project streams
s_acme_frontend AS (
  INSERT INTO project_stream (tenant_id, project_id, name)
  SELECT tenant_id, project_id, 'Frontend Tasks' FROM p_acme_mdash
  RETURNING id AS stream_id, tenant_id, project_id
),
s_acme_backend AS (
  INSERT INTO project_stream (tenant_id, project_id, name)
  SELECT tenant_id, project_id, 'Backend Tasks' FROM p_acme_mdash
  RETURNING id AS stream_id, tenant_id, project_id
),
s_beta_design AS (
  INSERT INTO project_stream (tenant_id, project_id, name)
  SELECT tenant_id, project_id, 'Design' FROM p_beta_site
  RETURNING id AS stream_id, tenant_id, project_id
),

-- Tags (scoped per tenant/client; unique via expression index)
tag_bugfix AS (
  INSERT INTO ticket_tag (tenant_id, client_id, name, color)
  SELECT a.tenant_id, c.client_id, 'bugfix', '#FF0000'
  FROM t_acme a JOIN c_acme c ON c.tenant_id = a.tenant_id
  RETURNING id AS tag_id, tenant_id
),
tag_perf AS (
  INSERT INTO ticket_tag (tenant_id, client_id, name, color)
  SELECT a.tenant_id, c.client_id, 'performance', '#FF9900'
  FROM t_acme a JOIN c_acme c ON c.tenant_id = a.tenant_id
  RETURNING id AS tag_id, tenant_id
),

-- Tickets (Acme)
tk1 AS (
  INSERT INTO ticket (
    tenant_id, client_id, project_id, stream_id,
    reporter_id, assignee_id, title, description_md,
    status, priority, type, points
  )
  SELECT
    p.tenant_id, p.client_id, p.project_id, s.stream_id,
    (SELECT id FROM u WHERE email='admin@acme.com'),
    (SELECT id FROM u WHERE email='user@acme.com'),
    'Fix dashboard load issue',
    '### Steps to Reproduce
- Login
- Open dashboard
- Observe slowness',
    'TODO', 'P1', 'BUG', 5
  FROM p_acme_mdash p
  JOIN s_acme_frontend s ON s.project_id = p.project_id
  RETURNING id AS ticket_id, tenant_id
),
tk2 AS (
  INSERT INTO ticket (
    tenant_id, client_id, project_id, stream_id,
    reporter_id, assignee_id, title, description_md,
    status, priority, type, points
  )
  SELECT
    p.tenant_id, p.client_id, p.project_id, s.stream_id,
    (SELECT id FROM u WHERE email='user@acme.com'),
    (SELECT id FROM u WHERE email='admin@acme.com'),
    'Optimize API response',
    'Return only required fields; add pagination & caching.',
    'IN_PROGRESS', 'P2', 'TASK', 3
  FROM p_acme_mdash p
  JOIN s_acme_backend s ON s.project_id = p.project_id
  RETURNING id AS ticket_id, tenant_id
),

-- Ticket ↔ Tag maps
ttm1 AS (
  INSERT INTO ticket_tag_map (ticket_id, tag_id, tenant_id)
  SELECT tk.ticket_id, tb.tag_id, tk.tenant_id
  FROM tk1 tk CROSS JOIN tag_bugfix tb
  RETURNING ticket_id
),
ttm2 AS (
  INSERT INTO ticket_tag_map (ticket_id, tag_id, tenant_id)
  SELECT tk.ticket_id, tp.tag_id, tk.tenant_id
  FROM tk2 tk CROSS JOIN tag_perf tp
  RETURNING ticket_id
),

-- Comments
cmt1 AS (
  INSERT INTO comment (tenant_id, ticket_id, author_id, body_md)
  SELECT tk.tenant_id, tk.ticket_id, (SELECT id FROM u WHERE email='user@acme.com'),
         'This seems to happen only on Chrome 118+.'
  FROM tk1 tk
  RETURNING id
),
cmt2 AS (
  INSERT INTO comment (tenant_id, ticket_id, author_id, body_md)
  SELECT tk.tenant_id, tk.ticket_id, (SELECT id FROM u WHERE email='admin@acme.com'),
         'Profiling suggests DB query N+1; will add a join + index.'
  FROM tk2 tk
  RETURNING id
)

-- Attachments (final INSERTs outside CTE chain for clarity)
INSERT INTO attachment (tenant_id, ticket_id, uploader_id, filename, mime, size, s3_key)
SELECT tk.tenant_id, tk.ticket_id, (SELECT id FROM u WHERE email='user@acme.com'),
       'screenshot.png', 'image/png', 204800, 'attachments/screenshot.png'
FROM tk1 tk;

INSERT INTO attachment (tenant_id, ticket_id, uploader_id, filename, mime, size, s3_key)
SELECT tk.tenant_id, tk.ticket_id, (SELECT id FROM u WHERE email='admin@acme.com'),
       'profile.json', 'application/json', 5120, 'attachments/profile.json'
FROM tk2 tk;

COMMIT;

-- (Optional) Quick sanity checks:
-- SELECT * FROM tenant;
-- SELECT email, id FROM "user";
-- SELECT tenant_id, name FROM client_company;
-- SELECT tenant_id, user_id, role FROM tenant_membership;
-- SELECT tenant_id, client_id, name, code FROM project;
-- SELECT tenant_id, project_id, name FROM project_stream;
-- SELECT title, status, priority FROM ticket ORDER BY created_at DESC;
-- SELECT name, color FROM ticket_tag;
-- SELECT * FROM ticket_tag_map;
-- SELECT * FROM comment;
-- SELECT * FROM attachment;
