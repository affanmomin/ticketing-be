# Schema Update Summary: Streams & Subjects Migration

## Overview

This document summarizes the changes made to migrate **streams** and **subjects** from being **client-scoped** to **project-scoped** entities, as defined in the new schema (`sql/new_schema.sql`).

---

## Database Schema Changes

### Before (Old Schema)
- Streams and subjects were scoped at the **client level**
- Table structure:
  ```sql
  CREATE TABLE stream (
    id uuid PRIMARY KEY,
    client_id uuid REFERENCES client(id),
    name text,
    ...
  );
  
  CREATE TABLE subject (
    id uuid PRIMARY KEY,
    client_id uuid REFERENCES client(id),
    name text,
    ...
  );
  ```

### After (New Schema)
- Streams and subjects are now scoped at the **project level**
- Table structure:
  ```sql
  CREATE TABLE stream (
    id uuid PRIMARY KEY,
    project_id uuid REFERENCES project(id),
    name text,
    ...
  );
  
  CREATE TABLE subject (
    id uuid PRIMARY KEY,
    project_id uuid REFERENCES project(id),
    name text,
    ...
  );
  ```

### Composite Foreign Keys
The new schema enforces referential integrity between tickets, streams, subjects, and projects:

```sql
-- In ticket table
CONSTRAINT fk_ticket_stream_project
  FOREIGN KEY (project_id, stream_id) REFERENCES stream(project_id, id),
CONSTRAINT fk_ticket_subject_project
  FOREIGN KEY (project_id, subject_id) REFERENCES subject(project_id, id)
```

This ensures that:
1. A ticket can only reference streams and subjects from its own project
2. Database-level validation prevents mismatched associations

---

## Code Changes

### 1. Services (`src/services/`)

#### `streams.service.ts`
- **Interface Updated**: `StreamResult.clientId` → `StreamResult.projectId`
- **Function Signatures Changed**:
  - `listStreams(tx, projectId, ...)` - now takes `projectId` instead of `clientId`
  - `createStream(tx, organizationId, projectId, ...)` - now takes `projectId` instead of `clientId`
- **Query Updates**: All SQL queries now use `project_id` and join through `project → client` for organization validation

#### `subjects.service.ts`
- **Interface Updated**: `SubjectResult.clientId` → `SubjectResult.projectId`
- **Function Signatures Changed**:
  - `listSubjects(tx, projectId, ...)` - now takes `projectId` instead of `clientId`
  - `createSubject(tx, organizationId, projectId, ...)` - now takes `projectId` instead of `clientId`
- **Query Updates**: All SQL queries now use `project_id` and join through `project → client` for organization validation

#### `tickets.service.ts`
- **No changes required** - The service already relied on database constraints for validation
- The new composite foreign keys automatically enforce stream/subject project membership

---

### 2. Controllers (`src/controllers/`)

#### `streams.controller.ts`
- Updated parameter names: `clientId` → `projectId`
- Updated comments to reflect project-level scoping
- All controller functions now pass `projectId` to service layer

#### `subjects.controller.ts`
- Updated parameter names: `clientId` → `projectId`
- Updated comments to reflect project-level scoping
- All controller functions now pass `projectId` to service layer

---

### 3. Routes (`src/routes/`)

#### `streams.routes.ts`
**Route Changes**:
- `GET /clients/:id/streams` → `GET /projects/:id/streams`
- `POST /clients/:id/streams` → `POST /projects/:id/streams`
- `GET /streams/:id` (unchanged)
- `PATCH /streams/:id` (unchanged)

#### `subjects.routes.ts`
**Route Changes**:
- `GET /clients/:id/subjects` → `GET /projects/:id/subjects`
- `POST /clients/:id/subjects` → `POST /projects/:id/subjects`
- `GET /subjects/:id` (unchanged)
- `PATCH /subjects/:id` (unchanged)

---

### 4. Tests (`src/__tests__/`)

#### `test-utils.ts`
- `createTestStream(tx, projectId, ...)` - now takes `projectId` instead of `clientId`
- `createTestSubject(tx, projectId, ...)` - now takes `projectId` instead of `clientId`
- `cleanupTestData` - updated deletion order to handle project-scoped streams/subjects

#### `e2e.test.ts`
- **Reordered test flow**: Project creation now happens before stream/subject creation
- Updated API routes to use `/projects/{id}/streams` and `/projects/{id}/subjects`

#### `e2e-comprehensive.test.ts`
- **Reordered test steps**: Taxonomy fetch → Project creation → Stream/Subject creation
- Updated step numbers to reflect new order (steps 12-19 reordered)
- Updated API routes to use project-based endpoints

---

### 5. Scripts (`scripts/`)

#### `populate-demo-data.ts`
- **Major Reordering**:
  1. Projects are now created first (step 6)
  2. Streams and subjects are created per project (step 7)
  3. Previous step numbers adjusted accordingly
- **Data Structure Change**:
  - Streams and subjects now created in a loop over `projectIds` instead of `clientIds`
  - Each project gets its own set of 3 streams and 3 subjects
  - Ticket creation updated to use project-specific streams/subjects

---

### 6. Documentation

#### `API_OVERVIEW.md`
- Updated workflow section: streams/subjects creation moved to "Project setup" phase
- Updated endpoints documentation:
  - Changed from "per client" to "per project"
  - Updated all route examples from `/clients/{id}/` to `/projects/{id}/`
- Updated sequenced example flow: reordered steps to create project before taxonomy

#### `openapi.yaml`
- **Path Changes**:
  - `/clients/{id}/streams` → `/projects/{id}/streams`
  - `/clients/{id}/subjects` → `/projects/{id}/subjects`
- **Schema Updates**:
  ```yaml
  Stream:
    properties:
      projectId: { type: string, format: uuid }  # was clientId
  
  Subject:
    properties:
      projectId: { type: string, format: uuid }  # was clientId
  ```
- Updated summary descriptions: "client streams/subjects" → "project streams/subjects"

---

## Migration Impact

### Breaking Changes for API Consumers

1. **Endpoint URLs Changed**:
   - All stream/subject list and create operations now use project IDs
   - Frontend and API clients must update their API calls

2. **Response Payload Changed**:
   - Stream and Subject objects now contain `projectId` instead of `clientId`
   - Frontend models/types need to be updated

3. **Workflow Order Changed**:
   - Projects must be created **before** streams and subjects
   - Previous workflow that created taxonomy at client-level needs updating

### Backward Compatibility

⚠️ **This is a breaking change** - no backward compatibility is maintained. The old endpoints no longer exist.

### Database Migration Required

To migrate an existing database:

1. **Data Migration**:
   ```sql
   -- Add project_id column to existing tables
   ALTER TABLE stream ADD COLUMN project_id uuid;
   ALTER TABLE subject ADD COLUMN project_id uuid;
   
   -- Migrate data (assumes one project per client)
   UPDATE stream s
   SET project_id = p.id
   FROM project p
   WHERE p.client_id = s.client_id;
   
   UPDATE subject s
   SET project_id = p.id
   FROM project p
   WHERE p.client_id = s.client_id;
   
   -- Make project_id NOT NULL and add foreign keys
   ALTER TABLE stream
     ALTER COLUMN project_id SET NOT NULL,
     ADD CONSTRAINT fk_stream_project FOREIGN KEY (project_id) REFERENCES project(id),
     DROP COLUMN client_id;
   
   ALTER TABLE subject
     ALTER COLUMN project_id SET NOT NULL,
     ADD CONSTRAINT fk_subject_project FOREIGN KEY (project_id) REFERENCES project(id),
     DROP COLUMN client_id;
   ```

2. **Add Composite Constraints** (from new_schema.sql):
   ```sql
   -- Create unique indexes for composite foreign keys
   CREATE UNIQUE INDEX ux_stream_id_project ON stream(id, project_id);
   CREATE UNIQUE INDEX ux_subject_id_project ON subject(id, project_id);
   
   -- Add composite foreign keys to ticket table
   ALTER TABLE ticket
     ADD CONSTRAINT fk_ticket_stream_project
       FOREIGN KEY (project_id, stream_id) REFERENCES stream(project_id, id),
     ADD CONSTRAINT fk_ticket_subject_project
       FOREIGN KEY (project_id, subject_id) REFERENCES subject(project_id, id);
   ```

---

## Testing Recommendations

1. **Run E2E Tests**: `npm test` to verify all test cases pass
2. **Test Demo Data**: `npm run populate-demo` to verify demo data script works
3. **API Testing**: Test the new endpoints with actual API calls
4. **Frontend Integration**: Update frontend to use new endpoints and data structures

---

## Summary

✅ **Completed Changes**:
- [x] Database schema updated (new_schema.sql)
- [x] Service layer updated (streams.service.ts, subjects.service.ts)
- [x] Controller layer updated
- [x] Route definitions updated
- [x] Test utilities updated
- [x] E2E tests updated
- [x] Demo data script updated
- [x] API documentation updated
- [x] OpenAPI specification updated

🎯 **Key Benefit**: Streams and subjects are now properly scoped to projects, allowing different projects to have different categorization schemes even if they belong to the same client.

