# Dashboard API Documentation

## Overview

The Dashboard API provides metrics and recent activity data with role-based access control. Admins see organization-wide data, while employees and clients see only their relevant data.

## Endpoints

### GET /dashboard/metrics

Returns dashboard metrics scoped by user role.

**Authentication**: Required (Bearer token)

**Response**:

```json
{
  "tickets": {
    "total": 150,
    "open": 45,
    "closed": 105,
    "byStatus": [
      { "statusId": "uuid", "statusName": "New", "count": 20 },
      { "statusId": "uuid", "statusName": "In Progress", "count": 25 }
    ],
    "byPriority": [
      { "priorityId": "uuid", "priorityName": "High", "count": 30 },
      { "priorityId": "uuid", "priorityName": "Medium", "count": 50 }
    ],
    "assignedToMe": 12  // Only for EMPLOYEE role
  },
  "projects": {
    "total": 25,
    "active": 20
  },
  "clients": {  // Only for ADMIN role
    "total": 10,
    "active": 8
  },
  "users": {  // Only for ADMIN role
    "total": 50,
    "active": 45
  }
}
```

**Role-based Access**:
- **ADMIN**: Sees all organization metrics (tickets, projects, clients, users)
- **EMPLOYEE**: Sees tickets assigned to them or raised by them, and projects they're members of
- **CLIENT**: Sees tickets for their client's projects only

---

### GET /dashboard/activity

Returns recent activity (ticket events and comments) scoped by user role.

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `limit` (optional): Number of activities to return (default: 20, max: 100)

**Example**: `GET /dashboard/activity?limit=30`

**Response**:

```json
[
  {
    "id": "uuid",
    "type": "TICKET_CREATED" | "TICKET_UPDATED" | "COMMENT_ADDED" | "STATUS_CHANGED" | "ASSIGNEE_CHANGED",
    "ticketId": "uuid",
    "ticketTitle": "Fix login bug",
    "actorId": "uuid",
    "actorName": "John Doe",
    "actorEmail": "john@example.com",
    "projectId": "uuid",
    "projectName": "Website Redesign",
    "clientId": "uuid",
    "clientName": "Acme Corp",
    "createdAt": "2024-01-15T10:30:00Z",
    "metadata": {
      "oldValue": { "statusId": "uuid" },
      "newValue": { "statusId": "uuid" },
      "commentBody": "Fixed the issue",
      "visibility": "PUBLIC"
    }
  }
]
```

**Role-based Access**:
- **ADMIN**: Sees all organization activity (all ticket events and comments)
- **EMPLOYEE**: Sees activity for tickets assigned to them or raised by them (all comments)
- **CLIENT**: Sees activity for their client's tickets (PUBLIC comments only)

**Activity Types**:
- `TICKET_CREATED`: New ticket created
- `TICKET_UPDATED`: Ticket updated (title, description, etc.)
- `COMMENT_ADDED`: Comment added to ticket
- `STATUS_CHANGED`: Ticket status changed
- `ASSIGNEE_CHANGED`: Ticket assignee changed

---

## Usage Examples

### Admin Dashboard

```bash
# Get metrics
curl -X GET http://localhost:3000/dashboard/metrics \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get recent activity
curl -X GET http://localhost:3000/dashboard/activity?limit=50 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Employee Dashboard

```bash
# Get metrics (only their tickets)
curl -X GET http://localhost:3000/dashboard/metrics \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN"

# Get recent activity (only their tickets)
curl -X GET http://localhost:3000/dashboard/activity \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN"
```

### Client Dashboard

```bash
# Get metrics (only their client's tickets)
curl -X GET http://localhost:3000/dashboard/metrics \
  -H "Authorization: Bearer $CLIENT_TOKEN"

# Get recent activity (only their client's tickets, PUBLIC comments)
curl -X GET http://localhost:3000/dashboard/activity \
  -H "Authorization: Bearer $CLIENT_TOKEN"
```

---

## Implementation Details

### Metrics Calculation

- **Tickets**: Counted based on role-based scoping (organization, assigned/raised, or client)
- **Projects**: Counted based on role-based scoping
- **Clients/Users**: Only shown to ADMIN role
- **Status/Priority Breakdown**: Aggregated counts grouped by status and priority

### Recent Activity

- Combines ticket events and comments
- Sorted by `created_at` descending
- Limited to specified number (default: 20, max: 100)
- CLIENT users only see PUBLIC comments
- All activities include full context (ticket, project, client, actor)

### Performance

- Uses read-only database operations (no transactions)
- Efficient queries with proper JOINs
- Indexed on `created_at` for fast sorting
- Role-based filtering at database level

---

## Error Responses

### 401 Unauthorized
```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

### 400 Bad Request
```json
{
  "code": "BAD_REQUEST",
  "message": "Invalid query parameters"
}
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Activity is sorted by most recent first
- Metrics are calculated in real-time (not cached)
- Role-based access is enforced at the database query level

