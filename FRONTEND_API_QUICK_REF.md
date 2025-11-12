# Frontend API Quick Reference - Hierarchical Streams

## 🎯 Quick Start (Copy & Paste Ready)

### 1. Load Parent Streams (Page Load)

```javascript
// GET Parent Streams
fetch(`/api/projects/${projectId}/streams/parents`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(parents => {
  // Populate dropdown 1
  console.log(parents);
});
```

**Response:**
```json
[
  { "id": "uuid-1", "name": "Frontend", "parentStreamId": null },
  { "id": "uuid-2", "name": "Backend", "parentStreamId": null }
]
```

---

### 2. Load Child Streams (When Parent Selected)

```javascript
// GET Child Streams
fetch(`/api/streams/${selectedParentId}/children`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(children => {
  // Populate dropdown 2
  console.log(children);
});
```

**Response:**
```json
[
  { "id": "uuid-3", "name": "UI Components", "parentStreamId": "uuid-1" },
  { "id": "uuid-4", "name": "Pages", "parentStreamId": "uuid-1" }
]
```

**If no children:** Returns `[]`

---

### 3. Create Ticket

```javascript
// POST Create Ticket
const streamId = selectedChild || selectedParent; // Use child if available, else parent

fetch(`/api/projects/${projectId}/tickets`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: "Fix login bug",
    descriptionMd: "Description here",
    priorityId: "priority-uuid",
    statusId: "status-uuid",
    streamId: streamId,        // ← Your selected stream (parent or child)
    subjectId: "subject-uuid"
  })
})
.then(res => res.json())
.then(ticket => console.log(ticket));
```

---

## 📋 Complete Flow

```javascript
// 1. On component mount
const parents = await getParentStreams(projectId);
setDropdown1Options(parents);

// 2. When user selects from dropdown 1
const children = await getChildStreams(selectedParentId);
if (children.length > 0) {
  setDropdown2Options(children);
  setDropdown2Required(true);
} else {
  setDropdown2Options([]);
  setDropdown2Required(false);
  setDropdown2Message("No sub-categories available");
}

// 3. Determine final stream ID
const finalStreamId = selectedChild || selectedParent;

// 4. Submit with finalStreamId
await createTicket({ streamId: finalStreamId, ...otherData });
```

---

## 🎨 UI States

| State | Dropdown 1 | Dropdown 2 | Stream ID to Use |
|-------|-----------|-----------|------------------|
| Initial | Empty | Hidden | None |
| Parent selected, has children | Selected | Show options | Wait for child |
| Parent selected, no children | Selected | Show "No subs" | Use parent |
| Both selected | Selected | Selected | Use child |

---

## ✅ Validation Logic

```javascript
function getStreamId() {
  // If child selected, always use child
  if (selectedChild) return selectedChild;
  
  // If no children OR none selected, use parent
  return selectedParent;
}

function isValid() {
  // Must have parent
  if (!selectedParent) return false;
  
  // If children exist, must select one
  if (childStreams.length > 0 && !selectedChild) return false;
  
  return true;
}
```

---

## 🔗 All Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/projects/:projectId/streams/parents` | Get all parent streams |
| `GET` | `/api/streams/:parentId/children` | Get children of parent |
| `GET` | `/api/projects/:projectId/streams` | Get ALL streams (flat list) |
| `GET` | `/api/streams/:id` | Get single stream details |
| `POST` | `/api/projects/:projectId/streams` | Create new stream |
| `PATCH` | `/api/streams/:id` | Update stream |

---

## 🛠️ Create Stream (Admin Only)

### Create Parent Stream
```javascript
fetch(`/api/projects/${projectId}/streams`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "Frontend",
    description: "Frontend work"
    // parentStreamId omitted = parent stream
  })
});
```

### Create Child Stream
```javascript
fetch(`/api/projects/${projectId}/streams`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: "UI Components",
    description: "Reusable components",
    parentStreamId: "parent-uuid" // ← Makes it a child
  })
});
```

---

## 🎯 TypeScript Types

```typescript
interface Stream {
  id: string;
  projectId: string;
  parentStreamId: string | null;  // null = parent, uuid = child
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateTicketRequest {
  title: string;
  descriptionMd?: string;
  priorityId: string;
  statusId: string;
  streamId: string;        // Can be parent OR child
  subjectId: string;
  assignedToUserId?: string;
}
```

---

## ⚠️ Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `401` | Unauthorized | Refresh token / re-login |
| `403` | Forbidden | User doesn't have access |
| `404` | Not Found | Parent/project doesn't exist |
| `400` | Bad Request | Invalid data sent |

---

## 💡 Quick Tips

- ✅ **Cache parent streams** - they rarely change
- ✅ **Use child if available** - more specific categorization
- ✅ **Empty array = no children** - use parent directly
- ✅ **Always validate parent selected** - dropdown 1 is required
- ✅ **Child required only if children exist** - dropdown 2 conditional

---

## 🧪 Test Data

```javascript
// Example parent stream
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "parentStreamId": null,
  "name": "Frontend",
  "description": "Frontend development",
  "active": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}

// Example child stream
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "parentStreamId": "550e8400-e29b-41d4-a716-446655440001",
  "name": "UI Components",
  "description": "Reusable UI components",
  "active": true,
  "createdAt": "2024-01-15T10:05:00Z",
  "updatedAt": "2024-01-15T10:05:00Z"
}
```

---

## 📱 Example Component State

```typescript
const [parentStreams, setParentStreams] = useState<Stream[]>([]);
const [childStreams, setChildStreams] = useState<Stream[]>([]);
const [selectedParent, setSelectedParent] = useState<string>('');
const [selectedChild, setSelectedChild] = useState<string>('');

// Computed
const streamId = selectedChild || selectedParent;
const isValid = selectedParent && (childStreams.length === 0 || selectedChild);
```

---

## 🔍 Debugging

```javascript
// Check what you're sending
console.log('Selected Parent:', selectedParent);
console.log('Available Children:', childStreams);
console.log('Selected Child:', selectedChild);
console.log('Final Stream ID:', getStreamId());

// Check API response
fetch(url).then(r => r.json()).then(data => {
  console.log('API Response:', data);
});
```

---

## 🚀 Ready to Go!

Copy these snippets into your frontend and you're good to go. For detailed implementation examples (React, Vue, vanilla JS), see `FRONTEND_INTEGRATION_GUIDE.md`.

