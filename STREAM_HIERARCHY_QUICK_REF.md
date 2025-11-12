# Stream Hierarchy Quick Reference

## 🎯 The Setup: Two Cascading Dropdowns

```
┌─────────────────────┐
│ Dropdown 1: Parent  │ → User selects "Frontend"
└─────────────────────┘
           ↓
┌─────────────────────┐
│ Dropdown 2: Child   │ → Shows: UI Components, Pages, Routing
└─────────────────────┘
```

## 📡 API Calls

### 1️⃣ Populate Dropdown 1 (Parent Streams)
```http
GET /api/projects/{projectId}/streams/parents
Authorization: Bearer {token}
```
**Response:**
```json
[
  { "id": "abc-123", "name": "Frontend", "parentStreamId": null },
  { "id": "def-456", "name": "Backend", "parentStreamId": null }
]
```

### 2️⃣ Populate Dropdown 2 (Child Streams)
```http
GET /api/streams/{selectedParentId}/children
Authorization: Bearer {token}
```
**Response:**
```json
[
  { "id": "xyz-789", "name": "UI Components", "parentStreamId": "abc-123" },
  { "id": "uvw-012", "name": "Pages", "parentStreamId": "abc-123" }
]
```

## 🔨 Create Streams

### Create Parent Stream
```http
POST /api/projects/{projectId}/streams
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Frontend",
  "description": "Frontend work"
  // parentStreamId is omitted = parent stream
}
```

### Create Child Stream
```http
POST /api/projects/{projectId}/streams
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "UI Components",
  "description": "Reusable components",
  "parentStreamId": "abc-123"  // This makes it a child
}
```

## 📊 Database Schema

```sql
CREATE TABLE stream (
  id               uuid PRIMARY KEY,
  project_id       uuid NOT NULL,
  parent_stream_id uuid NULL,  -- 👈 NEW! References stream(id)
  name             text NOT NULL,
  description      text,
  active           boolean DEFAULT true,
  ...
);
```

**Key Points:**
- `parent_stream_id = NULL` → Parent stream
- `parent_stream_id = {uuid}` → Child stream

## ✅ Rules

| Rule | Enforced By |
|------|-------------|
| Stream can't be its own parent | DB constraint + Service |
| Parent must exist in same project | Service validation |
| Only active streams in dropdowns | SQL WHERE clause |
| Delete parent = delete children | DB CASCADE |

## 🧪 Quick Test

```bash
# Run demo script
ts-node -r dotenv/config scripts/demo-hierarchical-streams.ts

# Or test manually
curl http://localhost:3000/api/projects/{projectId}/streams/parents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 💻 Frontend Pseudocode

```javascript
// 1. On page load
const parents = await fetchParentStreams(projectId);
populateDropdown1(parents);

// 2. When user selects parent
function onParentSelected(parentId) {
  const children = await fetchChildStreams(parentId);
  populateDropdown2(children);
  clearDropdown2Selection();
}

// 3. When creating ticket
const ticketData = {
  // ... other fields
  streamId: selectedChildStreamId  // Use the CHILD stream ID
};
```

## 🚀 Migration

```bash
# Apply the migration
psql -U postgres -d your_db -f sql/004_add_stream_hierarchy.sql

# Or include in fresh setup (already in new_schema.sql)
```

## 📚 Full Docs

- **Complete Guide:** `HIERARCHICAL_STREAMS.md`
- **Implementation Summary:** `HIERARCHICAL_STREAMS_SUMMARY.md`
- **Demo Script:** `scripts/demo-hierarchical-streams.ts`

