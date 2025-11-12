# Frontend Integration Guide: Hierarchical Streams

## 📋 Overview

Streams now support a 2-level hierarchy for better organization:
- **Level 1 (Parent Streams)**: Top-level categories (e.g., "Frontend", "Backend", "Operations")
- **Level 2 (Child Streams)**: Sub-categories under a parent (e.g., "UI Components", "API Endpoints")

This guide shows you how to implement cascading dropdowns in your frontend.

---

## 🔄 User Flow

```
Step 1: User selects parent from Dropdown 1
        ↓
Step 2: System fetches children for that parent
        ↓
Step 3: User selects child from Dropdown 2 (or uses parent if no children)
        ↓
Step 4: Submit ticket with the selected stream ID
```

---

## 🎯 API Endpoints

### 1. Get Parent Streams (Dropdown 1)

**Endpoint:**
```http
GET /api/projects/{projectId}/streams/parents
```

**Headers:**
```http
Authorization: Bearer {your-jwt-token}
```

**Response:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "parentStreamId": null,
    "name": "Frontend",
    "description": "Frontend development work",
    "active": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "parentStreamId": null,
    "name": "Backend",
    "description": "Backend development work",
    "active": true,
    "createdAt": "2024-01-15T10:31:00Z",
    "updatedAt": "2024-01-15T10:31:00Z"
  }
]
```

**Notes:**
- Only returns streams where `parentStreamId` is `null`
- Only returns active streams
- Sorted alphabetically by name

---

### 2. Get Child Streams (Dropdown 2)

**Endpoint:**
```http
GET /api/streams/{parentStreamId}/children
```

**Headers:**
```http
Authorization: Bearer {your-jwt-token}
```

**Response:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "parentStreamId": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Pages",
    "description": "Application pages",
    "active": true,
    "createdAt": "2024-01-15T10:32:00Z",
    "updatedAt": "2024-01-15T10:32:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440011",
    "projectId": "550e8400-e29b-41d4-a716-446655440000",
    "parentStreamId": "550e8400-e29b-41d4-a716-446655440001",
    "name": "UI Components",
    "description": "Reusable UI components",
    "active": true,
    "createdAt": "2024-01-15T10:33:00Z",
    "updatedAt": "2024-01-15T10:33:00Z"
  }
]
```

**Notes:**
- Returns all children of the specified parent
- Only returns active streams
- Sorted alphabetically by name
- Returns empty array `[]` if parent has no children

---

### 3. Create Ticket with Stream

**Endpoint:**
```http
POST /api/projects/{projectId}/tickets
```

**Headers:**
```http
Authorization: Bearer {your-jwt-token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Fix login button styling",
  "descriptionMd": "The login button is misaligned on mobile",
  "priorityId": "priority-uuid",
  "statusId": "status-uuid",
  "streamId": "550e8400-e29b-41d4-a716-446655440010",  // ← Child stream ID
  "subjectId": "subject-uuid",
  "assignedToUserId": "user-uuid"  // optional
}
```

**Important:**
- `streamId` can be **either** a parent stream ID **or** a child stream ID
- If child exists, use the child ID
- If no children exist for that parent, use the parent ID
- The backend validates that the stream exists and belongs to the project

---

## 💻 Implementation Examples

### React/TypeScript Example

```typescript
import { useState, useEffect } from 'react';

interface Stream {
  id: string;
  projectId: string;
  parentStreamId: string | null;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function StreamSelector({ projectId, onStreamSelected }: Props) {
  const [parentStreams, setParentStreams] = useState<Stream[]>([]);
  const [childStreams, setChildStreams] = useState<Stream[]>([]);
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Load parent streams on mount
  useEffect(() => {
    fetchParentStreams();
  }, [projectId]);

  const fetchParentStreams = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/streams/parents`,
        {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
          },
        }
      );
      const data = await response.json();
      setParentStreams(data);
    } catch (error) {
      console.error('Failed to fetch parent streams:', error);
    }
  };

  const fetchChildStreams = async (parentId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/streams/${parentId}/children`,
        {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
          },
        }
      );
      const data = await response.json();
      setChildStreams(data);
    } catch (error) {
      console.error('Failed to fetch child streams:', error);
      setChildStreams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleParentChange = async (parentId: string) => {
    setSelectedParent(parentId);
    setSelectedChild(''); // Reset child selection
    
    if (parentId) {
      await fetchChildStreams(parentId);
    } else {
      setChildStreams([]);
    }
  };

  const handleChildChange = (childId: string) => {
    setSelectedChild(childId);
    // Notify parent component of the final selection
    onStreamSelected(childId || selectedParent);
  };

  // Determine which stream ID to use
  const getStreamId = (): string => {
    // If child selected, use child
    if (selectedChild) return selectedChild;
    
    // If no children exist or none selected, use parent
    if (childStreams.length === 0 || !selectedChild) return selectedParent;
    
    return '';
  };

  // Notify parent when selection is complete
  useEffect(() => {
    const streamId = getStreamId();
    if (streamId) {
      onStreamSelected(streamId);
    }
  }, [selectedParent, selectedChild, childStreams]);

  return (
    <div className="stream-selector">
      {/* Dropdown 1: Parent Streams */}
      <div className="form-group">
        <label htmlFor="parent-stream">Stream Category *</label>
        <select
          id="parent-stream"
          value={selectedParent}
          onChange={(e) => handleParentChange(e.target.value)}
          required
        >
          <option value="">-- Select Category --</option>
          {parentStreams.map((stream) => (
            <option key={stream.id} value={stream.id}>
              {stream.name}
            </option>
          ))}
        </select>
        {selectedParent && (
          <p className="helper-text">
            {parentStreams.find(s => s.id === selectedParent)?.description}
          </p>
        )}
      </div>

      {/* Dropdown 2: Child Streams (conditional) */}
      {selectedParent && (
        <div className="form-group">
          <label htmlFor="child-stream">
            Stream Type {childStreams.length > 0 ? '*' : '(Optional)'}
          </label>
          {loading ? (
            <div className="loading">Loading options...</div>
          ) : childStreams.length > 0 ? (
            <>
              <select
                id="child-stream"
                value={selectedChild}
                onChange={(e) => handleChildChange(e.target.value)}
                required={childStreams.length > 0}
              >
                <option value="">-- Select Type --</option>
                {childStreams.map((stream) => (
                  <option key={stream.id} value={stream.id}>
                    {stream.name}
                  </option>
                ))}
              </select>
              {selectedChild && (
                <p className="helper-text">
                  {childStreams.find(s => s.id === selectedChild)?.description}
                </p>
              )}
            </>
          ) : (
            <p className="info-text">
              No sub-categories available. Using "{parentStreams.find(s => s.id === selectedParent)?.name}" directly.
            </p>
          )}
        </div>
      )}

      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <p>Selected Stream ID: {getStreamId()}</p>
        </div>
      )}
    </div>
  );
}

export default StreamSelector;
```

---

### Vue 3 / Composition API Example

```vue
<template>
  <div class="stream-selector">
    <!-- Dropdown 1: Parent Streams -->
    <div class="form-group">
      <label for="parent-stream">Stream Category *</label>
      <select
        id="parent-stream"
        v-model="selectedParent"
        @change="handleParentChange"
        required
      >
        <option value="">-- Select Category --</option>
        <option
          v-for="stream in parentStreams"
          :key="stream.id"
          :value="stream.id"
        >
          {{ stream.name }}
        </option>
      </select>
    </div>

    <!-- Dropdown 2: Child Streams -->
    <div v-if="selectedParent" class="form-group">
      <label for="child-stream">Stream Type</label>
      <div v-if="loading">Loading...</div>
      <select
        v-else-if="childStreams.length > 0"
        id="child-stream"
        v-model="selectedChild"
        required
      >
        <option value="">-- Select Type --</option>
        <option
          v-for="stream in childStreams"
          :key="stream.id"
          :value="stream.id"
        >
          {{ stream.name }}
        </option>
      </select>
      <p v-else class="info-text">
        No sub-categories available.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';

interface Stream {
  id: string;
  name: string;
  description: string | null;
  parentStreamId: string | null;
}

const props = defineProps<{
  projectId: string;
}>();

const emit = defineEmits<{
  streamSelected: [streamId: string];
}>();

const parentStreams = ref<Stream[]>([]);
const childStreams = ref<Stream[]>([]);
const selectedParent = ref('');
const selectedChild = ref('');
const loading = ref(false);

const streamId = computed(() => {
  if (selectedChild.value) return selectedChild.value;
  if (childStreams.value.length === 0 || !selectedChild.value) {
    return selectedParent.value;
  }
  return '';
});

// Fetch parent streams on mount
onMounted(() => {
  fetchParentStreams();
});

// Watch for stream selection changes
watch(streamId, (newId) => {
  if (newId) {
    emit('streamSelected', newId);
  }
});

async function fetchParentStreams() {
  try {
    const response = await fetch(
      `/api/projects/${props.projectId}/streams/parents`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );
    parentStreams.value = await response.json();
  } catch (error) {
    console.error('Failed to fetch parent streams:', error);
  }
}

async function fetchChildStreams(parentId: string) {
  loading.value = true;
  try {
    const response = await fetch(
      `/api/streams/${parentId}/children`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      }
    );
    childStreams.value = await response.json();
  } catch (error) {
    console.error('Failed to fetch child streams:', error);
    childStreams.value = [];
  } finally {
    loading.value = false;
  }
}

async function handleParentChange() {
  selectedChild.value = '';
  childStreams.value = [];
  
  if (selectedParent.value) {
    await fetchChildStreams(selectedParent.value);
  }
}

function getToken(): string {
  // Your auth token retrieval logic
  return localStorage.getItem('authToken') || '';
}
</script>
```

---

### Vanilla JavaScript Example

```javascript
class StreamSelector {
  constructor(projectId, onStreamSelected) {
    this.projectId = projectId;
    this.onStreamSelected = onStreamSelected;
    this.parentStreams = [];
    this.childStreams = [];
    this.selectedParent = null;
    this.selectedChild = null;
    
    this.init();
  }

  async init() {
    await this.fetchParentStreams();
    this.render();
    this.attachEventListeners();
  }

  async fetchParentStreams() {
    try {
      const response = await fetch(
        `/api/projects/${this.projectId}/streams/parents`,
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`,
          },
        }
      );
      this.parentStreams = await response.json();
    } catch (error) {
      console.error('Failed to fetch parent streams:', error);
    }
  }

  async fetchChildStreams(parentId) {
    try {
      const response = await fetch(
        `/api/streams/${parentId}/children`,
        {
          headers: {
            'Authorization': `Bearer ${this.getToken()}`,
          },
        }
      );
      this.childStreams = await response.json();
    } catch (error) {
      console.error('Failed to fetch child streams:', error);
      this.childStreams = [];
    }
  }

  async handleParentChange(parentId) {
    this.selectedParent = parentId;
    this.selectedChild = null;
    
    if (parentId) {
      await this.fetchChildStreams(parentId);
    } else {
      this.childStreams = [];
    }
    
    this.render();
    this.notifyChange();
  }

  handleChildChange(childId) {
    this.selectedChild = childId;
    this.notifyChange();
  }

  getStreamId() {
    if (this.selectedChild) return this.selectedChild;
    if (this.childStreams.length === 0 || !this.selectedChild) {
      return this.selectedParent;
    }
    return null;
  }

  notifyChange() {
    const streamId = this.getStreamId();
    if (streamId && this.onStreamSelected) {
      this.onStreamSelected(streamId);
    }
  }

  getToken() {
    return localStorage.getItem('authToken') || '';
  }

  render() {
    // Your rendering logic here
    const container = document.getElementById('stream-selector');
    container.innerHTML = `
      <div class="form-group">
        <label for="parent-stream">Stream Category *</label>
        <select id="parent-stream" required>
          <option value="">-- Select Category --</option>
          ${this.parentStreams.map(s => 
            `<option value="${s.id}">${s.name}</option>`
          ).join('')}
        </select>
      </div>
      ${this.selectedParent ? `
        <div class="form-group">
          <label for="child-stream">Stream Type</label>
          ${this.childStreams.length > 0 ? `
            <select id="child-stream" required>
              <option value="">-- Select Type --</option>
              ${this.childStreams.map(s => 
                `<option value="${s.id}">${s.name}</option>`
              ).join('')}
            </select>
          ` : '<p>No sub-categories available.</p>'}
        </div>
      ` : ''}
    `;
  }

  attachEventListeners() {
    document.getElementById('parent-stream')?.addEventListener('change', (e) => {
      this.handleParentChange(e.target.value);
    });
    
    document.getElementById('child-stream')?.addEventListener('change', (e) => {
      this.handleChildChange(e.target.value);
    });
  }
}

// Usage
const selector = new StreamSelector(projectId, (streamId) => {
  console.log('Selected stream:', streamId);
  // Use this streamId when creating a ticket
});
```

---

## 🎨 UI/UX Recommendations

### Visual States

1. **Initial State:**
   ```
   [Select Category ▼]
   ```

2. **Parent Selected (No Children):**
   ```
   [Frontend ▼]
   ℹ️ No sub-categories available. Using "Frontend" directly.
   ```

3. **Parent Selected (Has Children):**
   ```
   [Frontend ▼]
   [Select Type ▼] ← Enabled, required
   ```

4. **Both Selected:**
   ```
   [Frontend ▼]
   [UI Components ▼]
   ✓ Stream selected: Frontend > UI Components
   ```

### User Experience Tips

1. **Loading States:** Show a spinner/skeleton while fetching child streams
2. **Empty States:** Clearly indicate when no children exist
3. **Descriptions:** Show stream descriptions as helper text
4. **Validation:** 
   - Dropdown 1 is always required
   - Dropdown 2 is required ONLY if children exist
5. **Breadcrumb:** Show selected path (e.g., "Frontend > UI Components")

---

## ✅ Validation Rules

### Frontend Validation

```typescript
function validateStreamSelection(
  selectedParent: string,
  selectedChild: string,
  childStreams: Stream[]
): { valid: boolean; error?: string } {
  // Parent must be selected
  if (!selectedParent) {
    return { valid: false, error: 'Please select a stream category' };
  }

  // If children exist, one must be selected
  if (childStreams.length > 0 && !selectedChild) {
    return { valid: false, error: 'Please select a stream type' };
  }

  // Valid!
  return { valid: true };
}
```

### Backend Validation (Already Implemented)

The backend automatically validates:
- Stream exists
- Stream belongs to the project
- Stream is active
- No circular references (if updating parent_stream_id)

---

## 🔧 Creating Tickets

When submitting a ticket, use the final stream ID:

```typescript
async function createTicket(ticketData: CreateTicketRequest) {
  const streamId = selectedChild || selectedParent;
  
  const response = await fetch(
    `/api/projects/${projectId}/tickets`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...ticketData,
        streamId: streamId,  // ← Can be parent OR child
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to create ticket');
  }

  return await response.json();
}
```

---

## 📊 Displaying Tickets

When showing tickets in a list/table, you might want to show the full stream path:

### Option 1: Show Only Selected Stream
```
Ticket #123 | Frontend > UI Components | High Priority
```

### Option 2: Fetch Full Stream Info
```typescript
// The ticket response includes stream info
interface Ticket {
  id: string;
  title: string;
  streamId: string;
  streamName: string;          // e.g., "UI Components"
  parentStreamName?: string;   // e.g., "Frontend" (if child stream)
  // ... other fields
}
```

---

## 🐛 Error Handling

```typescript
async function fetchWithErrorHandling<T>(
  url: string,
  options: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      if (response.status === 403) {
        throw new Error('Access denied');
      }
      if (response.status === 404) {
        throw new Error('Resource not found');
      }
      throw new Error('Request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Usage
try {
  const parents = await fetchWithErrorHandling(
    `/api/projects/${projectId}/streams/parents`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  setParentStreams(parents);
} catch (error) {
  showErrorToast('Failed to load stream categories');
}
```

---

## 🧪 Testing Checklist

- [ ] Dropdown 1 loads parent streams on page load
- [ ] Selecting parent fetches children (if any)
- [ ] Dropdown 2 shows children or "no children" message
- [ ] Selecting child enables form submission
- [ ] Validation prevents submission without selection
- [ ] Creating ticket with parent-only works (no children)
- [ ] Creating ticket with child works
- [ ] Error states are handled gracefully
- [ ] Loading states are shown during API calls
- [ ] Token expiry redirects to login

---

## 📚 Additional Resources

- **API Documentation:** See `HIERARCHICAL_STREAMS.md` for complete API details
- **Quick Reference:** See `STREAM_HIERARCHY_QUICK_REF.md` for quick lookup
- **Backend Summary:** See `HIERARCHICAL_STREAMS_SUMMARY.md` for backend details

---

## 💡 Pro Tips

1. **Cache Parent Streams:** They rarely change, so cache them locally
2. **Prefetch on Hover:** Load children when user hovers over parent option
3. **Keyboard Navigation:** Support arrow keys and type-to-search
4. **Mobile Friendly:** Use native selects on mobile for better UX
5. **Accessibility:** Add proper ARIA labels and keyboard support

---

## 🆘 Common Issues & Solutions

### Issue: Dropdown 2 doesn't update
**Solution:** Make sure you're resetting `selectedChild` to empty when parent changes

### Issue: Can't create ticket with parent stream
**Solution:** This is valid! If no children exist, use the parent stream ID

### Issue: 401 Unauthorized
**Solution:** Check that your JWT token is valid and not expired

### Issue: Getting wrong children
**Solution:** Verify you're using the correct parent stream ID

---

## 📞 Support

If you encounter issues, check:
1. Network tab in DevTools for API responses
2. Console for JavaScript errors
3. Backend logs for server-side issues
4. This guide for implementation examples

Happy coding! 🚀

