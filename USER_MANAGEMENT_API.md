# User Management API Documentation

## Overview

This API provides user management for a company ticketing system. The admin creates employee users for their tenant/company.

### User Types

1. **ADMIN** - System administrators (manually created in DB)
2. **EMPLOYEE** - Company employees (created by admins via API)
3. **CLIENT** - Client users (for future use)

## Simplified Schema

The user table now has direct foreign keys to tenant and client_company:

```sql
user:
  - id (uuid)
  - email (text, unique)
  - name (text)
  - password_hash (text)
  - user_type (enum: ADMIN, EMPLOYEE, CLIENT - defaults to EMPLOYEE)
  - tenant_id (uuid FK to tenant)
  - client_company_id (uuid FK to client_company, nullable)
  - active (boolean, default true)
  - created_at, updated_at, last_sign_in_at
```

**Key Changes:**
- No more `tenant_membership` table dependency
- Direct `tenant_id` and `client_company_id` on user table
- Simpler queries, cleaner code
- `user_type` defaults to EMPLOYEE

---

## API Endpoints

### 1. Create User (Employee)
**POST** `/users`

**Authorization:** Admin only

**Request Body:**
```json
{
  "email": "employee@company.com",
  "name": "John Doe",
  "password": "securepassword123",
  "userType": "EMPLOYEE",
  "clientCompanyId": "uuid",  // Optional - assign to a client company
  "active": true              // Optional, default: true
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "employee@company.com",
  "name": "John Doe",
  "userType": "EMPLOYEE",
  "tenantId": "uuid",
  "clientCompanyId": null,
  "active": true,
  "createdAt": "2025-10-29T10:00:00Z",
  "updatedAt": "2025-10-29T10:00:00Z"
}
```

**Validation Rules:**
- Email must be valid format and unique
- Password must be at least 8 characters
- userType defaults to EMPLOYEE if not provided
- clientCompanyId is optional

---

### 2. List Users
**GET** `/users`

**Authorization:** Admin and Employee (Clients cannot list users)

**Query Parameters:**
```
limit: number (1-100, default: 20)
offset: number (default: 0)
userType: "ADMIN" | "EMPLOYEE" | "CLIENT" (optional)
clientCompanyId: uuid (optional)
active: boolean (optional)
search: string (optional) - searches name and email
```

**Example Request:**
```
GET /users?userType=EMPLOYEE&active=true&limit=10&offset=0
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@company.com",
      "name": "John Doe",
      "userType": "EMPLOYEE",
      "tenantId": "uuid",
      "clientCompanyId": "uuid",
      "clientCompanyName": "Acme Corp",
      "active": true,
      "lastSignInAt": "2025-10-29T09:00:00Z",
      "createdAt": "2025-10-20T10:00:00Z",
      "updatedAt": "2025-10-29T10:00:00Z"
    }
  ],
  "total": 25,
  "limit": 10,
  "offset": 0
}
```

---

### 3. Get User by ID
**GET** `/users/:id`

**Authorization:** 
- Admin can view any user
- Employee can view any user
- Client can only view their own profile

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@company.com",
  "name": "John Doe",
  "userType": "EMPLOYEE",
  "tenantId": "uuid",
  "clientCompanyId": "uuid",
  "clientCompanyName": "Acme Corp",
  "active": true,
  "lastSignInAt": "2025-10-29T09:00:00Z",
  "createdAt": "2025-10-20T10:00:00Z",
  "updatedAt": "2025-10-29T10:00:00Z"
}
```

---

### 4. Update User
**PUT** `/users/:id`

**Authorization:**
- Admin can update any user
- Users can update their own profile (limited fields)

**Request Body (Admin):**
```json
{
  "name": "Jane Doe",
  "email": "jane@company.com",
  "password": "newsecurepassword",
  "userType": "EMPLOYEE",
  "clientCompanyId": "uuid",
  "active": false
}
```

**Request Body (Self-Update):**
```json
{
  "name": "Jane Doe",
  "email": "jane@company.com",
  "password": "newsecurepassword"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "jane@company.com",
  "name": "Jane Doe",
  "userType": "EMPLOYEE",
  "tenantId": "uuid",
  "clientCompanyId": "uuid",
  "active": true,
  "createdAt": "2025-10-20T10:00:00Z",
  "updatedAt": "2025-10-29T10:30:00Z"
}
```

**Restrictions:**
- Non-admin users cannot update `userType`, `clientCompanyId`, or `active` status
- All fields are optional
- Password will be hashed automatically

---

### 5. Delete User
**DELETE** `/users/:id`

**Authorization:** Admin only

**Query Parameters:**
```
hard: boolean (optional, default: false)
```

**Soft Delete (default):**
```
DELETE /users/{userId}
```
Sets user's `active` status to `false`

**Hard Delete:**
```
DELETE /users/{userId}?hard=true
```
Permanently removes the user record

**Response:** `200 OK`
```json
{
  "deleted": true,
  "hard": false
}
```

---

### 6. List Assignable Users
**GET** `/users/assignable`

**Authorization:** Any authenticated user

**Query Parameters:**
```
clientId: uuid (required)
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@company.com"
  }
]
```

**Description:** Returns active users associated with a specific client company. Used for populating assignee dropdowns in tickets.

---

## Database Schema

### User Table (Simplified)

```sql
CREATE TABLE "user" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  role text DEFAULT 'USER',
  user_type user_type NOT NULL DEFAULT 'EMPLOYEE',
  tenant_id uuid REFERENCES tenant(id),
  client_company_id uuid REFERENCES client_company(id),
  active boolean NOT NULL DEFAULT true,
  last_sign_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TYPE user_type AS ENUM ('ADMIN', 'EMPLOYEE', 'CLIENT');
```

### Key Benefits of Simplified Schema:
- ✅ No complex joins with tenant_membership
- ✅ Direct relationships via foreign keys
- ✅ Simpler queries and better performance
- ✅ Easier to understand and maintain
- ✅ Clear ownership: user belongs to one tenant

---

## Creating Your First Admin User

Run the included script:

```bash
npm run db:create-admin
```

Or manually in SQL:

```sql
-- 1. Create tenant (if not exists)
INSERT INTO tenant (name) 
VALUES ('My Company')
RETURNING id;

-- 2. Hash password using bcrypt (10 rounds)
-- Use a tool like: https://bcrypt-generator.com/

-- 3. Create admin user
INSERT INTO "user" (email, name, password_hash, user_type, tenant_id, active)
VALUES (
  'admin@company.com',
  'Admin User',
  '$2a$10$...your.hashed.password...',
  'ADMIN',
  '<tenant-id>',
  true
);
```

---

## Example Workflows

### 1. Admin Creates Employee User

```bash
# Admin logs in
POST /auth/login
{
  "email": "admin@company.com",
  "password": "adminpass"
}

# Admin creates employee
POST /users
Authorization: Bearer <admin-token>
{
  "email": "employee@company.com",
  "name": "Employee User",
  "password": "employeepass123",
  "userType": "EMPLOYEE",
  "active": true
}
```

### 2. Assign Employee to Client Company

```bash
# Create or get client company
GET /clients

# Assign employee to client
PUT /users/<employee-id>
{
  "clientCompanyId": "<client-company-id>"
}
```

### 3. Employee Updates Their Profile

```bash
PUT /users/<their-user-id>
Authorization: Bearer <employee-token>
{
  "name": "Updated Name",
  "email": "newemail@company.com",
  "password": "newpassword123"
}
```

### 4. Admin Deactivates User

```bash
# Soft delete
DELETE /users/<user-id>
Authorization: Bearer <admin-token>

# Hard delete
DELETE /users/<user-id>?hard=true
Authorization: Bearer <admin-token>
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "code": "BAD_REQUEST",
  "message": "No fields to update"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "code": "UNAUTHORIZED",
  "message": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "code": "FORBIDDEN",
  "message": "Only admins can create users"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "code": "NOT_FOUND",
  "message": "User not found"
}
```

---

## Security Considerations

1. **Password Storage**: All passwords are hashed using bcrypt with 10 rounds
2. **Role-Based Access**: Endpoints enforce role-based permissions
3. **Tenant Isolation**: Users can only access data within their tenant via `tenant_id`
4. **Email Uniqueness**: Email addresses are unique across the entire system
5. **Soft Delete**: Default delete operation preserves user data for audit
6. **JWT Authentication**: All endpoints require valid JWT tokens (except login)

---

## Testing

```bash
# Run all route tests
npm run test:routes

# Or test manually with curl

# 1. Login as admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"Admin123!"}'

# 2. Create employee user
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"employee@company.com",
    "name":"New Employee",
    "password":"password123",
    "userType":"EMPLOYEE"
  }'

# 3. List users
curl -X GET "http://localhost:3000/users?limit=10" \
  -H "Authorization: Bearer <token>"

# 4. Get specific user
curl -X GET "http://localhost:3000/users/<user-id>" \
  -H "Authorization: Bearer <token>"

# 5. Update user
curl -X PUT "http://localhost:3000/users/<user-id>" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'

# 6. Delete user (soft)
curl -X DELETE "http://localhost:3000/users/<user-id>" \
  -H "Authorization: Bearer <token>"
```

---

## Migration Steps

If migrating from the old schema with `tenant_membership`:

1. **Backup your database**
2. **Add new columns to user table:**
   ```sql
   ALTER TABLE "user" 
     ADD COLUMN user_type user_type DEFAULT 'EMPLOYEE',
     ADD COLUMN tenant_id uuid REFERENCES tenant(id),
     ADD COLUMN client_company_id uuid REFERENCES client_company(id);
   ```
3. **Migrate data:**
   ```sql
   -- Copy tenant_id from tenant_membership
   UPDATE "user" u
   SET tenant_id = tm.tenant_id,
       client_company_id = tm.client_id
   FROM tenant_membership tm
   WHERE u.id = tm.user_id;
   ```
4. **Update existing admin users:**
   ```sql
   UPDATE "user" 
   SET user_type = 'ADMIN' 
   WHERE email IN ('admin@company.com');
   ```
5. **Deploy new application code**
6. **Test thoroughly**

---

## Quick Start

1. **Start the database:**
   ```bash
   npm run db:up
   ```

2. **Run migrations:**
   ```bash
   npm run db:init
   ```

3. **Create admin user:**
   ```bash
   npm run db:create-admin
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

5. **Test the API:**
   - Visit http://localhost:3000/docs for Swagger documentation
   - Use the credentials from step 3 to login

---

## Questions & Support

For questions about this API:
- Check the OpenAPI documentation at `/docs`
- Review the source code:
  - Routes: `src/routes/users.routes.ts`
  - Controllers: `src/controllers/users.controller.ts`
  - Services: `src/services/users.service.ts`
  - Schemas: `src/schemas/users.schema.ts`
- See examples in `scripts/test-all-routes.ts`

1. **ADMIN** - System administrators (manually created in DB)
2. **EMPLOYEE** - Company employees
3. **CLIENT** - Client users

## User Types

### ADMIN
- Full system access
- Can create, update, and delete users
- Can manage all aspects of the system
- Created manually in the database

### EMPLOYEE
- Company staff members
- Can view and manage tickets
- Can be assigned to multiple clients
- Created by ADMIN

### CLIENT
- External users associated with a specific client company
- Limited access to their client's data only
- Must be associated with a client_company
- Created by ADMIN

## API Endpoints

### 1. Create User
**POST** `/users`

**Authorization:** Admin only

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword123",
  "userType": "EMPLOYEE" | "CLIENT",
  "clientId": "uuid", // Required for CLIENT type
  "active": true // Optional, default: true
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "userType": "EMPLOYEE",
  "active": true,
  "createdAt": "2025-10-29T10:00:00Z",
  "updatedAt": "2025-10-29T10:00:00Z"
}
```

**Validation Rules:**
- Email must be valid format
- Password must be at least 8 characters
- CLIENT type users MUST have a clientId
- Email must be unique across the system

---

### 2. List Users
**GET** `/users`

**Authorization:** Admin and Employee (Clients cannot list users)

**Query Parameters:**
```
limit: number (1-100, default: 20)
offset: number (default: 0)
userType: "ADMIN" | "EMPLOYEE" | "CLIENT" (optional)
clientId: uuid (optional)
active: boolean (optional)
search: string (optional) - searches name and email
```

**Example Request:**
```
GET /users?userType=EMPLOYEE&active=true&limit=10&offset=0
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "userType": "EMPLOYEE",
      "active": true,
      "clientId": null,
      "clientName": null,
      "lastSignInAt": "2025-10-29T09:00:00Z",
      "createdAt": "2025-10-20T10:00:00Z",
      "updatedAt": "2025-10-29T10:00:00Z"
    }
  ],
  "total": 25,
  "limit": 10,
  "offset": 0
}
```

---

### 3. Get User by ID
**GET** `/users/:id`

**Authorization:** 
- Admin can view any user
- Employee can view any user
- Client can only view their own profile

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "userType": "EMPLOYEE",
  "active": true,
  "clientId": "uuid",
  "clientName": "Acme Corp",
  "tenantRole": "MEMBER",
  "lastSignInAt": "2025-10-29T09:00:00Z",
  "createdAt": "2025-10-20T10:00:00Z",
  "updatedAt": "2025-10-29T10:00:00Z"
}
```

---

### 4. Update User
**PUT** `/users/:id`

**Authorization:**
- Admin can update any user
- Users can update their own profile (limited fields)

**Request Body (Admin):**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "newsecurepassword",
  "userType": "EMPLOYEE",
  "clientId": "uuid",
  "active": false
}
```

**Request Body (Self-Update):**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "newsecurepassword"
}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "userType": "EMPLOYEE",
  "active": true,
  "createdAt": "2025-10-20T10:00:00Z",
  "updatedAt": "2025-10-29T10:30:00Z"
}
```

**Restrictions:**
- Non-admin users cannot update `userType`, `clientId`, or `active` status
- All fields are optional
- Password will be hashed automatically

---

### 5. Delete User
**DELETE** `/users/:id`

**Authorization:** Admin only

**Query Parameters:**
```
hard: boolean (optional, default: false)
```

**Soft Delete (default):**
```
DELETE /users/{userId}
```
Sets user's `active` status to `false`

**Hard Delete:**
```
DELETE /users/{userId}?hard=true
```
Removes user from tenant_membership (keeps user record for audit purposes)

**Response:** `200 OK`
```json
{
  "deleted": true,
  "hard": false
}
```

---

### 6. List Assignable Users
**GET** `/users/assignable`

**Authorization:** Any authenticated user

**Query Parameters:**
```
clientId: uuid (required)
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  }
]
```

**Description:** Returns users that can be assigned to tickets for a specific client. Used for populating assignee dropdowns.

---

## Database Schema Changes

### User Table
Added `user_type` column:
```sql
user_type user_type, -- ENUM: 'ADMIN', 'EMPLOYEE', 'CLIENT'
```

### New Enum Type
```sql
CREATE TYPE user_type AS ENUM ('ADMIN','EMPLOYEE','CLIENT');
```

---

## Authentication Flow

Users authenticate with their email and password via the `/auth/login` endpoint. The JWT token includes:
- `sub`: User ID
- `tenantId`: Tenant ID
- `role`: Tenant role (OWNER, ADMIN, MEMBER, GUEST)
- `clientId`: Associated client ID (for CLIENT type users)

---

## Creating Your First Admin User (Manual)

Since ADMIN users are created manually in the database:

```sql
-- 1. Create the tenant (if not exists)
INSERT INTO tenant (id, name) 
VALUES (gen_random_uuid(), 'My Company')
RETURNING id;

-- 2. Hash your password (use bcrypt with 10 rounds)
-- Example: $2a$10$... (generate using bcrypt tool or script)

-- 3. Create the admin user
INSERT INTO "user" (id, email, name, password_hash, user_type, active)
VALUES (
  gen_random_uuid(),
  'admin@company.com',
  'Admin User',
  '$2a$10$...your.hashed.password...',
  'ADMIN',
  true
)
RETURNING id;

-- 4. Create tenant membership
INSERT INTO tenant_membership (tenant_id, user_id, role)
VALUES (
  '<tenant-id>',
  '<user-id>',
  'ADMIN'
);
```

---

## Example Workflows

### 1. Admin Creates Employee User
```bash
# Admin logs in
POST /auth/login
{
  "email": "admin@company.com",
  "password": "adminpass"
}

# Admin creates employee
POST /users
Authorization: Bearer <admin-token>
{
  "email": "employee@company.com",
  "name": "Employee User",
  "password": "employeepass123",
  "userType": "EMPLOYEE",
  "active": true
}
```

### 2. Admin Creates Client User
```bash
# First, ensure client company exists
POST /clients
{
  "name": "Client Company ABC",
  "domain": "abc.com"
}

# Create client user
POST /users
{
  "email": "client@abc.com",
  "name": "Client User",
  "password": "clientpass123",
  "userType": "CLIENT",
  "clientId": "<client-company-id>",
  "active": true
}
```

### 3. Employee Updates Their Profile
```bash
PUT /users/<their-user-id>
Authorization: Bearer <employee-token>
{
  "name": "Updated Name",
  "email": "newemail@company.com"
}
```

### 4. Admin Deactivates User
```bash
DELETE /users/<user-id>
Authorization: Bearer <admin-token>
# Soft delete - sets active = false
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "code": "BAD_REQUEST",
  "message": "CLIENT type users must have a clientId"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "code": "UNAUTHORIZED",
  "message": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "code": "FORBIDDEN",
  "message": "Only admins can create users"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "code": "NOT_FOUND",
  "message": "User not found"
}
```

---

## Security Considerations

1. **Password Storage**: All passwords are hashed using bcrypt with 10 rounds
2. **Role-Based Access**: Endpoints enforce role-based permissions
3. **Tenant Isolation**: Users can only access data within their tenant
4. **Email Uniqueness**: Email addresses are unique across the system
5. **Soft Delete**: Default delete operation preserves user data
6. **JWT Authentication**: All endpoints require valid JWT tokens (except login)

---

## Testing

To test the API, you can use the included test script:

```bash
npm run test:routes
```

Or manually test with curl:

```bash
# Login as admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"adminpass"}'

# Create user
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"newuser@company.com",
    "name":"New User",
    "password":"password123",
    "userType":"EMPLOYEE"
  }'

# List users
curl -X GET "http://localhost:3000/users?limit=10&offset=0" \
  -H "Authorization: Bearer <token>"
```

---

## Migration Steps

If you're adding this to an existing system:

1. **Backup your database**
2. **Run the updated SQL schema** (`sql/001_init.sql`)
3. **Update existing users** to set their `user_type`:
   ```sql
   UPDATE "user" SET user_type = 'ADMIN' WHERE email = 'your-admin@company.com';
   ```
4. **Restart your application**
5. **Test the new endpoints**

---

## Questions & Support

For questions about this API:
- Check the OpenAPI documentation at `/docs`
- Review the source code in `src/routes/users.routes.ts`
- See examples in `scripts/test-all-routes.ts`
