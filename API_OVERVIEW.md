# Ticketing Platform API Overview

This document summarizes the core workflow, data model, and HTTP endpoints for the new ticketing backend. Share this with frontend teams alongside the updated Swagger spec (`openapi.yaml`).

---

## 1. High-Level Workflow

1. **Admin bootstrap**
   - `POST /auth/signup` creates a new organization and first admin user.
   - Admin receives JWT and proceeds with setup.
2. **Organization setup** (ADMIN role)
   - Create clients (`POST /clients`).
   - Add internal employees (`POST /employees`).
   - Add client users (`POST /client-users`).
3. **Project setup**
   - Create projects under a client (`POST /projects`).
   - Add project members with role flags (`POST /projects/{id}/members`).
   - Define streams and subjects per project (`POST /projects/{id}/streams`, `POST /projects/{id}/subjects`).
4. **Ticket lifecycle**
   - Authorized users (admin/employee/client with `canRaise`) create tickets (`POST /tickets`).
   - Status/Priority updates, assignment workflows, and audit events occur via `PATCH /tickets/{id}`.
   - Comments enforce visibility rules (`POST /tickets/{id}/comments`).
   - Attachments use presign + confirm flow (`POST /tickets/{id}/attachments/presign`, `/confirm`).
5. **Notifications**
   - Ticket changes enqueue records in `notification_outbox`.
   - Background processor (`startNotificationProcessor`) delivers notifications and surfaces manual endpoints (`/_internal/outbox/*`).

---

## 2. Authentication & Authorization

- JWT-based (`Authorization: Bearer <token>`), configured via `@fastify/jwt`.
- `req.user` shape:
  ```ts
  {
    userId: string;
    organizationId: string;
    role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT';
    clientId: string | null; // only for CLIENT role
  }
  ```
- Role rules:
  - **ADMIN**: Full organization access; manages users, clients, taxonomy, projects.
  - **EMPLOYEE**: Access is project-based (must be project member). `clientId` null.
  - **CLIENT**: Restricted to their client’s projects/tickets; only PUBLIC comments.

Key auth endpoints:
- `POST /auth/signup` – bootstrap organization/admin.
- `POST /auth/login` – obtain JWT.
- `GET /auth/me` – current user context.
- `POST /auth/logout` – stateless (client deletes token).

---

## 3. Core Entities & APIs

### Users
- `GET /users` – list internal + client users (ADMIN/EMPLOYEE).
- `POST /employees` – create employee (ADMIN).
- `POST /client-users` – create client-linked user (ADMIN).
- `PATCH /users/{id}` – update name/email/active.
- `POST /users/{id}/password` – change own password.

### Clients
- `GET /clients` / `POST /clients` / `PATCH /clients/{id}`.
- Records scoped per organization; deleting cascades to projects/tickets.

### Streams & Subjects (per project)
- `GET /projects/{id}/streams`, `POST /projects/{id}/streams`, `PATCH /streams/{id}`.
- `GET /projects/{id}/subjects`, `POST /projects/{id}/subjects`, `PATCH /subjects/{id}`.
- Used to categorize tickets within a project.

### Projects & Membership
- `GET /projects` – role-aware listing (admin = org, employee = memberships, client = client projects).
- `POST /projects`, `PATCH /projects/{id}` (ADMIN).
- Membership endpoints:
  - `GET /projects/{id}/members`
  - `POST /projects/{id}/members`
  - `PATCH /projects/{projectId}/members/{userId}`
  - `DELETE /projects/{projectId}/members/{userId}`
- Membership flags:
  - `role`: MEMBER/MANAGER/VIEWER
  - `canRaise`: can create tickets
  - `canBeAssigned`: eligible assignee

### Tickets
- `GET /tickets` – filters on project, status, priority, assignee.
- `POST /tickets` – requires membership + `canRaise`.
- `GET /tickets/{id}` – scoped detail view.
- `PATCH /tickets/{id}` – updates status/priority/assignee/title/description.
  - Audit events stored in `ticket_event`.
- `DELETE /tickets/{id}` – soft delete (`is_deleted`).

### Comments
- `GET /tickets/{id}/comments`
- `POST /tickets/{id}/comments`
- `GET /comments/{id}`
- Visibility rules enforced:
  - ADMIN/EMPLOYEE see all.
  - CLIENT sees/creates PUBLIC only.

### Attachments
- `GET /tickets/{id}/attachments`
- `POST /tickets/{id}/attachments/presign`
- `POST /tickets/{id}/attachments/confirm`
- `DELETE /attachments/{id}`
- Workflow: obtain presigned URL → upload file → confirm to persist metadata.

### Taxonomy (Global read-only)
- `GET /taxonomy/priority`
- `GET /taxonomy/status`

### Notification Outbox
- `GET /_internal/outbox/pending` – list undelivered notifications (ADMIN).
- `POST /_internal/outbox/process` – trigger processing (ADMIN).
- Background job runs every 60s (`startNotificationProcessor` in `src/index.ts`).

---

## 4. Sequenced Example Flow

1. **Admin signup**: `POST /auth/signup` → JWT.
2. **Create Client**: `POST /clients`.
3. **Create Employee**: `POST /employees`.
4. **Create Client User**: `POST /client-users`.
5. **Create Project**: `POST /projects`.
6. **Add Project Members**: `POST /projects/{projectId}/members` (admin & employee).
7. **Define Taxonomy**: `POST /projects/{projectId}/streams`, `POST /projects/{projectId}/subjects`.
8. **Create Ticket**: `POST /tickets` assigned to employee.
9. **Update Ticket**: `PATCH /tickets/{ticketId}` (status/priority/assignee).
10. **Comments**: admin adds INTERNAL, client adds PUBLIC.
11. **Attachments**: presign → upload → confirm.
12. **Audit & Notifications**: events recorded in `ticket_event`, notifications queued in `notification_outbox`.

---

## 5. Authentication & Role Matrix (Quick Reference)

| Endpoint Category | ADMIN | EMPLOYEE | CLIENT |
|------------------|:-----:|:--------:|:------:|
| Auth             | ✅    | ✅       | ✅     |
| Users            | ✅    | ✅ (list only) | 🚫 |
| Clients          | ✅    | 🚫       | 🚫     |
| Projects         | ✅    | memberships only | client projects |
| Tickets          | ✅    | project memberships | client tickets |
| Comments (INTERNAL) | ✅ | ✅ | 🚫 |
| Attachments      | ✅    | ✅       | ✅     |
| Outbox           | ✅    | 🚫       | 🚫     |

---

## 6. Additional Resources

- **Swagger / OpenAPI**: `openapi.yaml` (loaded at `http://localhost:3000/docs/json`).

Share this document and the Swagger spec with frontend collaborators to align on available endpoints and required request/response shapes.
