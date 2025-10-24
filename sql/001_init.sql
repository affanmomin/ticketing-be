-- Init schema for Code Companion API (PascalCase tables)
create extension if not exists pgcrypto;

-- Users
create table if not exists "User" (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  "passwordHash" text not null,
  "active" boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Tenants & membership
create table if not exists "Tenant" (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists "tenant_membership" (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references "Tenant"(id) on delete cascade,
  "userId" uuid not null references "User"(id) on delete cascade,
  role text not null check (role in ('ADMIN','EMPLOYEE','CLIENT')),
  "clientId" uuid,
  "createdAt" timestamptz not null default now(),
  unique ("tenantId", "userId")
);

-- Clients and mappings
create table if not exists "ClientCompany" (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references "Tenant"(id) on delete cascade,
  name text not null,
  domain text,
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("tenantId", name)
);

create table if not exists "UserClientMap" (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references "Tenant"(id) on delete cascade,
  "userId" uuid not null references "User"(id) on delete cascade,
  "clientId" uuid not null references "ClientCompany"(id) on delete cascade,
  unique ("userId", "clientId")
);

-- Projects & streams
create table if not exists "Project" (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references "Tenant"(id) on delete cascade,
  "clientId" uuid not null references "ClientCompany"(id) on delete cascade,
  name text not null,
  code varchar(12) not null,
  active boolean not null default true,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("tenantId","clientId", code)
);

create table if not exists "ProjectStream" (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references "Tenant"(id) on delete cascade,
  "projectId" uuid not null references "Project"(id) on delete cascade,
  name text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  unique ("projectId", name)
);

-- Tickets
create type if not exists ticket_status as enum ('BACKLOG','TODO','IN_PROGRESS','REVIEW','DONE','CANCELLED');
create type if not exists ticket_priority as enum ('P0','P1','P2','P3');
create type if not exists ticket_type as enum ('TASK','BUG','STORY','EPIC');

create table if not exists "Ticket" (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references "Tenant"(id) on delete cascade,
  "clientId" uuid not null references "ClientCompany"(id) on delete cascade,
  "projectId" uuid not null references "Project"(id) on delete cascade,
  "streamId" uuid references "ProjectStream"(id) on delete set null,
  "reporterId" uuid not null references "User"(id) on delete restrict,
  "assigneeId" uuid references "User"(id) on delete set null,
  title varchar(200) not null,
  "descriptionMd" text not null default '',
  status ticket_status not null default 'BACKLOG',
  priority ticket_priority not null default 'P2',
  type ticket_type not null default 'TASK',
  points int,
  "dueDate" timestamptz,
  "archivedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- Tags
create table if not exists "TicketTag" (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references "Tenant"(id) on delete cascade,
  "clientId" uuid references "ClientCompany"(id) on delete cascade,
  name text not null,
  color varchar(16) not null,
  unique ("tenantId","clientId", name)
);

create table if not exists "TicketTagMap" (
  "ticketId" uuid not null references "Ticket"(id) on delete cascade,
  "tagId" uuid not null references "TicketTag"(id) on delete cascade,
  "tenantId" uuid not null references "Tenant"(id) on delete cascade,
  primary key ("ticketId","tagId")
);

-- Comments
create table if not exists "Comment" (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references "Tenant"(id) on delete cascade,
  "ticketId" uuid not null references "Ticket"(id) on delete cascade,
  "authorId" uuid not null references "User"(id) on delete restrict,
  "bodyMd" text not null,
  "createdAt" timestamptz not null default now()
);

-- Attachments
create table if not exists "Attachment" (
  id uuid primary key default gen_random_uuid(),
  "tenantId" uuid not null references "Tenant"(id) on delete cascade,
  "ticketId" uuid not null references "Ticket"(id) on delete cascade,
  "uploaderId" uuid not null references "User"(id) on delete restrict,
  filename text not null,
  mime text not null,
  size int not null,
  "s3Key" text not null,
  "createdAt" timestamptz not null default now()
);

-- Basic indexes
create index if not exists idx_ticket_tenant_client_status on "Ticket"("tenantId","clientId", status);
create index if not exists idx_ticket_assignee_status on "Ticket"("assigneeId", status);
create index if not exists idx_project_tenant_client on "Project"("tenantId","clientId");
create index if not exists idx_stream_tenant_project on "ProjectStream"("tenantId","projectId");
create index if not exists idx_map_tenant_client on "UserClientMap"("tenantId","clientId");
