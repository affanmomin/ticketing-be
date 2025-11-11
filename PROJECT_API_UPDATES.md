# Project API Updates for Project-Scoped Taxonomy

## Overview

Since streams and subjects are now tied to projects (not clients), the Project APIs have been enhanced to provide better access to project taxonomy information.

---

## What Changed

### 1. Enhanced Project Response Schema

The `Project` response now includes optional counters for streams and subjects:

**Before:**
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "name": "string",
  "description": "string",
  "active": boolean,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**After:**
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "name": "string",
  "description": "string",
  "active": boolean,
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "streamCount": 2,        // ⭐ NEW
  "subjectCount": 3        // ⭐ NEW
}
```

### 2. New Endpoint: Get Project Taxonomy

A new endpoint provides a lightweight summary of all streams and subjects in a project:

```http
GET /projects/:id/taxonomy
```

**Response:**
```json
{
  "streams": [
    { "id": "uuid", "name": "Development", "active": true },
    { "id": "uuid", "name": "Support", "active": true }
  ],
  "subjects": [
    { "id": "uuid", "name": "Bug Report", "active": true },
    { "id": "uuid", "name": "Feature Request", "active": true },
    { "id": "uuid", "name": "Question", "active": true }
  ]
}
```

---

## Implementation Details

### Service Layer (`src/services/projects.service.ts`)

#### Updated: `getProject()` Function

```typescript
export async function getProject(
  tx: PoolClient,
  projectId: string,
  organizationId: string,
  includeCount: boolean = true  // ⭐ NEW PARAMETER
): Promise<ProjectResult>
```

- Now queries stream and subject counts when `includeCount = true`
- Efficiently uses subqueries to get counts in single query
- Backward compatible (defaults to including counts)

#### New: `getProjectTaxonomy()` Function

```typescript
export async function getProjectTaxonomy(
  tx: PoolClient,
  projectId: string,
  organizationId: string
): Promise<{
  streams: Array<{ id: string; name: string; active: boolean }>;
  subjects: Array<{ id: string; name: string; active: boolean }>;
}>
```

- Returns lightweight summary of project taxonomy
- Only includes essential fields (id, name, active)
- Sorted alphabetically by name
- Useful for dropdowns, quick lookups, and dashboard widgets

### Controller Layer (`src/controllers/projects.controller.ts`)

#### New Controller: `getProjectTaxonomyCtrl()`

- Uses read-only connection (no transaction needed)
- Requires authentication
- All roles can access (ADMIN, EMPLOYEE, CLIENT)
- Validates project belongs to user's organization

### Routes (`src/routes/projects.routes.ts`)

#### New Route

```typescript
app.get('/projects/:id/taxonomy', { 
  schema: { params: IdParam } 
}, getProjectTaxonomyCtrl);
```

---

## API Documentation (OpenAPI/Swagger)

### Updated Schema: `Project`

```yaml
Project:
  type: object
  properties:
    id: { type: string, format: uuid }
    clientId: { type: string, format: uuid }
    name: { type: string }
    description: { type: string, nullable: true }
    startDate: { type: string, format: date, nullable: true }
    endDate: { type: string, format: date, nullable: true }
    active: { type: boolean }
    createdAt: { type: string, format: date-time }
    updatedAt: { type: string, format: date-time }
    streamCount: { type: integer, description: "Number of streams in project" }
    subjectCount: { type: integer, description: "Number of subjects in project" }
```

### New Endpoint Documentation

```yaml
/projects/{id}/taxonomy:
  get:
    tags: [Projects]
    security: [{ bearerAuth: [] }]
    summary: Get project taxonomy (streams and subjects)
    parameters:
      - in: path
        name: id
        required: true
        schema: { type: string, format: uuid }
    responses:
      '200':
        description: Project taxonomy
        content:
          application/json:
            schema:
              type: object
              properties:
                streams:
                  type: array
                  items:
                    type: object
                    properties:
                      id: { type: string, format: uuid }
                      name: { type: string }
                      active: { type: boolean }
                subjects:
                  type: array
                  items:
                    type: object
                    properties:
                      id: { type: string, format: uuid }
                      name: { type: string }
                      active: { type: boolean }
```

---

## Use Cases

### 1. Project Dashboard

**Before:** Needed 3 API calls
```javascript
// Get project details
const project = await api.get(`/projects/${id}`);

// Get streams
const streams = await api.get(`/projects/${id}/streams`);

// Get subjects  
const subjects = await api.get(`/projects/${id}/subjects`);
```

**After:** Only 2 API calls (or 1 if you just need counts)
```javascript
// Get project with counts
const project = await api.get(`/projects/${id}`);
// Now has project.streamCount and project.subjectCount

// If you need the actual items:
const taxonomy = await api.get(`/projects/${id}/taxonomy`);
// Returns { streams: [...], subjects: [...] }
```

### 2. Dropdown Population

**Use Case:** When creating a ticket, populate stream/subject dropdowns

```javascript
const taxonomy = await api.get(`/projects/${projectId}/taxonomy`);

// Populate stream dropdown
const streamOptions = taxonomy.streams
  .filter(s => s.active)
  .map(s => ({ value: s.id, label: s.name }));

// Populate subject dropdown
const subjectOptions = taxonomy.subjects
  .filter(s => s.active)
  .map(s => ({ value: s.id, label: s.name }));
```

### 3. Project Overview Card

```javascript
const project = await api.get(`/projects/${id}`);

// Display project card with taxonomy stats
<ProjectCard>
  <h3>{project.name}</h3>
  <Stats>
    <Stat label="Streams" value={project.streamCount} />
    <Stat label="Subjects" value={project.subjectCount} />
  </Stats>
</ProjectCard>
```

---

## Benefits

### 1. **Reduced API Calls**
- Single endpoint to get both streams and subjects
- Project endpoint now includes counts without extra queries

### 2. **Better Performance**
- Lightweight responses (only essential fields)
- Efficient SQL queries with subqueries
- Read-only operations use connection pooling

### 3. **Improved Developer Experience**
- Clear relationship: projects "own" their taxonomy
- RESTful design: `/projects/:id/taxonomy` makes semantic sense
- Consistent with other nested resources (`/projects/:id/members`)

### 4. **Frontend Optimization**
- Easy to populate dropdowns
- Quick access to counts for dashboards
- Single API call for ticket creation forms

---

## Testing Results

All tests **PASSED** ✅:

1. ✅ **Empty Project** - Returns `streamCount: 0`, `subjectCount: 0`
2. ✅ **Empty Taxonomy** - Returns `{ streams: [], subjects: [] }`
3. ✅ **Populated Project** - Counts update correctly after adding items
4. ✅ **Populated Taxonomy** - Returns all streams and subjects with correct data
5. ✅ **Swagger Documentation** - New endpoint documented correctly

---

## Migration Notes

### For Frontend Developers

**No breaking changes** - these are purely additive features:

1. **Project responses now include counts** (optional fields)
   - Old code will continue to work
   - New code can use `streamCount` and `subjectCount`

2. **New taxonomy endpoint available**
   - Use when you need lightweight list of streams/subjects
   - Replaces separate calls to `/projects/:id/streams` and `/projects/:id/subjects` when you only need basic info

### Recommended Usage Pattern

```typescript
// For dashboards and overview pages:
const project = await api.get(`/projects/${id}`);
console.log(`Streams: ${project.streamCount}, Subjects: ${project.subjectCount}`);

// For forms and detailed views:
const taxonomy = await api.get(`/projects/${id}/taxonomy`);
// Use taxonomy.streams and taxonomy.subjects

// For full CRUD operations on individual items:
const streams = await api.get(`/projects/${id}/streams`);  // Full details with pagination
const subjects = await api.get(`/projects/${id}/subjects`); // Full details with pagination
```

---

## Summary

✅ **Added**: `streamCount` and `subjectCount` to Project response  
✅ **Added**: `GET /projects/:id/taxonomy` endpoint  
✅ **Updated**: Swagger/OpenAPI documentation  
✅ **Tested**: All new functionality working correctly  
✅ **Backward Compatible**: No breaking changes  

These enhancements make it easier and more efficient to work with project-scoped streams and subjects! 🎉

