# Hierarchical Streams Feature

## Overview

Streams now support a parent-child hierarchy, allowing you to organize streams into two levels:
- **Parent Streams** (Level 1): Top-level streams with no parent
- **Child Streams** (Level 2): Streams that belong to a parent stream

This is perfect for creating cascading dropdowns in the frontend where selecting a parent stream shows its child streams.

## Database Schema

### Migration
The migration file `sql/004_add_stream_hierarchy.sql` adds:
- `parent_stream_id` column (nullable UUID, references `stream.id`)
- Index on `parent_stream_id` for performance
- Check constraint to prevent self-referencing

### Schema Changes
```sql
ALTER TABLE stream
ADD COLUMN parent_stream_id uuid NULL REFERENCES stream(id) ON DELETE CASCADE;

CREATE INDEX ix_stream_parent ON stream(parent_stream_id) WHERE parent_stream_id IS NOT NULL;

ALTER TABLE stream
ADD CONSTRAINT chk_stream_no_self_parent CHECK (id != parent_stream_id);
```

## API Endpoints

### 1. List All Streams (Existing - Updated)
```
GET /projects/:projectId/streams
```
**Returns:** All streams (both parent and child) for a project
**Response includes:** `parentStreamId` field (null for parent streams)

### 2. Get Parent Streams Only (NEW)
```
GET /projects/:projectId/streams/parents
```
**Purpose:** Populate the first dropdown
**Returns:** Only streams with `parent_stream_id IS NULL`
**Sorted by:** Name (alphabetically)

### 3. Get Child Streams for a Parent (NEW)
```
GET /streams/:parentStreamId/children
```
**Purpose:** Populate the second dropdown when a parent is selected
**Returns:** All child streams for the specified parent
**Sorted by:** Name (alphabetically)

### 4. Create Stream (Updated)
```
POST /projects/:projectId/streams
```
**Request Body:**
```json
{
  "name": "Stream Name",
  "description": "Optional description",
  "parentStreamId": "uuid-of-parent-stream" // Optional
}
```
- Omit `parentStreamId` to create a parent stream
- Include `parentStreamId` to create a child stream

### 5. Update Stream (Updated)
```
PATCH /streams/:streamId
```
**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "active": true,
  "parentStreamId": "uuid-of-new-parent" // Optional - can change parent
}
```

## Frontend Implementation Guide

### Two Cascading Dropdowns

```typescript
// 1. Load parent streams on page load
const loadParentStreams = async (projectId: string) => {
  const response = await fetch(`/api/projects/${projectId}/streams/parents`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const parentStreams = await response.json();
  // Populate dropdown 1
  return parentStreams;
};

// 2. When user selects a parent, load its children
const loadChildStreams = async (parentStreamId: string) => {
  const response = await fetch(`/api/streams/${parentStreamId}/children`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const childStreams = await response.json();
  // Populate dropdown 2
  return childStreams;
};

// 3. Usage
const [parentStreams, setParentStreams] = useState([]);
const [childStreams, setChildStreams] = useState([]);
const [selectedParent, setSelectedParent] = useState(null);
const [selectedChild, setSelectedChild] = useState(null);

useEffect(() => {
  loadParentStreams(projectId).then(setParentStreams);
}, [projectId]);

const handleParentChange = (parentId) => {
  setSelectedParent(parentId);
  setSelectedChild(null); // Reset child selection
  loadChildStreams(parentId).then(setChildStreams);
};
```

## Data Model

### StreamResult Interface
```typescript
interface StreamResult {
  id: string;
  projectId: string;
  parentStreamId: string | null;  // null = parent stream, uuid = child stream
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Business Rules

1. **Parent Streams:**
   - Have `parentStreamId = null`
   - Can have zero or more children
   - Are shown in the first dropdown

2. **Child Streams:**
   - Must have a valid `parentStreamId`
   - The parent must exist in the same project
   - Are shown in the second dropdown (filtered by parent)

3. **Validation:**
   - A stream cannot be its own parent
   - Parent stream must belong to the same project
   - Both parent and child must be active to appear in dropdowns

4. **Cascade Delete:**
   - Deleting a parent stream deletes all its children
   - This is enforced at the database level

5. **Active Filter:**
   - Only active streams appear in the dropdowns
   - Inactive streams can still be viewed individually

## Example Data Structure

```
Project: "Customer Portal"
├── Parent Stream: "Frontend" (id: abc-123)
│   ├── Child: "UI Components" (parent_id: abc-123)
│   ├── Child: "Pages" (parent_id: abc-123)
│   └── Child: "Navigation" (parent_id: abc-123)
└── Parent Stream: "Backend" (id: def-456)
    ├── Child: "API Endpoints" (parent_id: def-456)
    ├── Child: "Database" (parent_id: def-456)
    └── Child: "Authentication" (parent_id: def-456)
```

## Migration Steps

### 1. Run the Migration
```bash
psql -U your_user -d your_database -f sql/004_add_stream_hierarchy.sql
```

### 2. Update Existing Data (if needed)
If you have existing streams and want to organize them:
```sql
-- Make "Frontend" a parent stream (already is, parent_stream_id is null)
-- Make "UI Components" a child of "Frontend"
UPDATE stream 
SET parent_stream_id = (SELECT id FROM stream WHERE name = 'Frontend' LIMIT 1)
WHERE name = 'UI Components';
```

### 3. Test the API
```bash
# Get parent streams
curl -X GET "http://localhost:3000/api/projects/{projectId}/streams/parents" \
  -H "Authorization: Bearer {token}"

# Get children of a parent
curl -X GET "http://localhost:3000/api/streams/{parentStreamId}/children" \
  -H "Authorization: Bearer {token}"

# Create a parent stream
curl -X POST "http://localhost:3000/api/projects/{projectId}/streams" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Frontend", "description": "Frontend work"}'

# Create a child stream
curl -X POST "http://localhost:3000/api/projects/{projectId}/streams" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "UI Components", "parentStreamId": "{parent-stream-id}"}'
```

## Performance Considerations

1. **Indexes:** The `parent_stream_id` column is indexed for fast lookups
2. **Query Optimization:** Child lookups use a simple indexed WHERE clause
3. **Caching Recommendation:** Frontend should cache parent streams since they rarely change
4. **Pagination:** Not implemented for parent/child lists (typically small datasets)

## Future Enhancements (Optional)

If you need more than 2 levels in the future:
1. The current design already supports unlimited nesting depth
2. You could implement recursive queries to get the full hierarchy
3. Add a `depth` field to limit nesting levels
4. Create a materialized path column for faster hierarchy queries

## Notes

- This uses a self-referencing foreign key pattern (standard for hierarchies)
- The database enforces referential integrity
- Circular references are prevented (stream cannot be its own parent)
- The design is flexible enough to add more levels later if needed

