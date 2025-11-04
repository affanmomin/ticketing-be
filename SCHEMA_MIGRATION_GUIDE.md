# Schema Migration Guide: Tenant → Organization/Client/User

## Overview

This document describes the migration from the tenant-based multi-tenancy model to the new organization-based model with explicit CLIENT/EMPLOYEE/ADMIN roles and organization scoping.

## Key Changes

### 1. Authentication Context (Types)

**Old:**
```typescript
interface AuthContext {
  userId: string;
  tenantId: string;
  role: Role;
  clientId?: string | null;
}
```

**New:**
```typescript
interface AuthContext {
  userId: string;
  organizationId: string;  // replaces tenantId
  role: Role;              // ADMIN | EMPLOYEE | CLIENT
  clientId?: string | null; // Only for CLIENT users
}
```

### 2. User Model (Database)

**Schema Changes:**
- Table `app_user` replaces `user`
- Direct fields: `organization_id`, `client_id`, `user_type`, `email`, `full_name`, `password_hash`, `is_active`
- Removed: `tenant_id` from "user" (now uses `organization_id`)
- Removed: `tenant_membership` table (roles embedded in `app_user`)

**Role Semantics:**
- ADMIN/EMPLOYEE: `client_id` MUST be NULL
- CLIENT: `client_id` MUST be NOT NULL and must match organization

### 3. Authorization Rules

#### ADMIN (Internal)
- Full access within organization
- Can manage clients, projects, streams, subjects, users
- Can see PUBLIC and INTERNAL comments
- Can change priorities/statuses (global)

#### EMPLOYEE (Internal)
- Scoped to organization
- Can only work on projects where they're members
- Can raise tickets if `can_raise = true`
- Can be assigned if `can_be_assigned = true`
- Can see PUBLIC and INTERNAL comments

#### CLIENT (Customer)
- Scoped to their `client_id`
- Can raise/view tickets via their client's projects only
- Can see PUBLIC comments only
- Cannot access internal operations

### 4. Ticket Workflow

**Who can raise a ticket:**
- Must be a `project_member` with `can_raise = true`
- For CLIENT users: project must belong to their client

**Who can be assigned:**
- Must be a `project_member` with `can_be_assigned = true`

**Audit Trail:**
- All ticket changes create `ticket_event` records
- Events track: created, status_changed, priority_changed, assignee_changed, comments, etc.

### 5. Comment Visibility

- **PUBLIC**: Visible to all roles (including CLIENT)
- **INTERNAL**: Visible only to ADMIN/EMPLOYEE

### 6. Endpoints Structure

#### Auth
- `POST /auth/signup` - Admin signup (public)
- `POST /auth/login` - Login (public)
- `GET /auth/me` - Current user info

#### Users (ADMIN)
- `GET /users` - List users in organization
- `POST /employees` - Create employee
- `POST /client-users` - Create client user
- `PATCH /users/:id` - Update user
- `POST /users/:id/password` - Change password

#### Clients (ADMIN scoped)
- `GET /clients` - List clients in organization
- `POST /clients` - Create client
- `PATCH /clients/:id` - Update client

#### Projects (Scoped)
- `GET /projects` - List projects (scoped by role)
- `POST /projects` - Create (ADMIN only)
- `PATCH /projects/:id` - Update (ADMIN only)

#### Project Members
- `GET /projects/:id/members`
- `POST /projects/:id/members`
- `PATCH /projects/:id/members/:userId`
- `DELETE /projects/:id/members/:userId`

#### Tickets (Scoped)
- `GET /tickets` - List (scoped by role/client)
- `POST /tickets` - Create (respects can_raise)
- `PATCH /tickets/:id` - Update (respects assignment rules)

#### Comments
- `GET /tickets/:id/comments` - List (CLIENT sees PUBLIC only)
- `POST /tickets/:id/comments` - Create (respects visibility rules)

#### Attachments
- `POST /tickets/:id/attachments/presign` - Get upload URL
- `POST /tickets/:id/attachments/confirm` - Confirm upload
- `GET /tickets/:id/attachments` - List attachments

#### Outbox (Notifications)
- `GET /_internal/outbox/pending` - List pending (ADMIN only)
- `POST /_internal/outbox/process` - Process notifications

## Implementation Checklist

### Core Services (Priority)
- [x] Auth Service (signup, login)
- [ ] Users Service (create, list, update)
- [ ] Clients Service (CRUD + org scoping)
- [ ] Projects Service (CRUD + member checks)
- [ ] Tickets Service (CRUD + raise/assign rules + audit events)
- [ ] Comments Service (visibility enforcement)
- [ ] Attachments Service (S3 or local storage)
- [ ] Outbox Service (notification processing)

### Schemas (DTOs)
- [x] Auth Schema
- [ ] Users Schema
- [ ] Clients Schema
- [ ] Projects Schema
- [ ] Tickets Schema
- [ ] Comments Schema
- [ ] Attachments Schema

### Routes & Controllers
- [x] Auth Routes/Controller
- [ ] Users Routes/Controller
- [ ] Clients Routes/Controller
- [ ] Projects Routes/Controller
- [ ] Tickets Routes/Controller
- [ ] Comments Routes/Controller
- [ ] Attachments Routes/Controller

## SQL Query Patterns

### Organization Scope
```sql
WHERE organization_id = $orgId
```

### Client Scope (for CLIENT users via projects)
```sql
WHERE EXISTS (
  SELECT 1 FROM project p 
  WHERE p.id = tickets.project_id 
  AND p.client_id = $clientId
)
```

### Project Membership
```sql
SELECT * FROM project_member 
WHERE project_id = $projectId 
AND user_id = $userId
```

### Can Raise Ticket
```sql
SELECT 1 FROM project_member 
WHERE project_id = $projectId 
AND user_id = $userId 
AND can_raise = true
```

### Can Be Assigned
```sql
SELECT 1 FROM project_member 
WHERE project_id = $projectId 
AND user_id = $userId 
AND can_be_assigned = true
```

## Error Handling

- **400 Bad Request**: Invalid input, email already in use, role validation fails
- **401 Unauthorized**: Invalid credentials, missing token
- **403 Forbidden**: Insufficient permissions, cross-org access, cannot demote last ADMIN
- **404 Not Found**: Resource not found or not in scope
- **409 Conflict**: Duplicate key violation

## Testing Strategy

1. Admin signup → login
2. Admin creates EMPLOYEE user with NULL client_id
3. Admin creates CLIENT user with specific client_id
4. Login tests for each role
5. Scope violations (CLIENT can't see other client's data)
6. Ticket workflow (raise → assign → comment → event trail)
7. Comment visibility (CLIENT sees PUBLIC only)
8. Authorization checks (can_raise, can_be_assigned, etc.)
