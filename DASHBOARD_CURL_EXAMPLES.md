# Dashboard API - cURL Examples & Sample Responses

## Prerequisites

First, get your authentication token:

```bash
# Admin login
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SecurePass123!"}' \
  | jq -r '.accessToken')

# Employee login
EMPLOYEE_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@example.com","password":"SecurePass123!"}' \
  | jq -r '.accessToken')

# Client login
CLIENT_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client@example.com","password":"SecurePass123!"}' \
  | jq -r '.accessToken')
```

---

## GET /dashboard/metrics

### Admin Request

```bash
curl -X GET http://localhost:3000/dashboard/metrics \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Admin Response

```json
{
  "tickets": {
    "total": 150,
    "open": 45,
    "closed": 105,
    "byStatus": [
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440001",
        "statusName": "New",
        "count": 20
      },
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440002",
        "statusName": "In Progress",
        "count": 15
      },
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440003",
        "statusName": "Resolved",
        "count": 10
      },
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440004",
        "statusName": "Closed",
        "count": 105
      }
    ],
    "byPriority": [
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440001",
        "priorityName": "Low",
        "count": 30
      },
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440002",
        "priorityName": "Medium",
        "count": 50
      },
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440003",
        "priorityName": "High",
        "count": 40
      },
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440004",
        "priorityName": "Urgent",
        "count": 30
      }
    ]
  },
  "projects": {
    "total": 25,
    "active": 20
  },
  "clients": {
    "total": 10,
    "active": 8
  },
  "users": {
    "total": 50,
    "active": 45
  }
}
```

---

### Employee Request

```bash
curl -X GET http://localhost:3000/dashboard/metrics \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json"
```

### Employee Response

```json
{
  "tickets": {
    "total": 12,
    "open": 8,
    "closed": 4,
    "byStatus": [
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440001",
        "statusName": "New",
        "count": 3
      },
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440002",
        "statusName": "In Progress",
        "count": 5
      },
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440004",
        "statusName": "Closed",
        "count": 4
      }
    ],
    "byPriority": [
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440002",
        "priorityName": "Medium",
        "count": 5
      },
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440003",
        "priorityName": "High",
        "count": 4
      },
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440004",
        "priorityName": "Urgent",
        "count": 3
      }
    ],
    "assignedToMe": 8
  },
  "projects": {
    "total": 5,
    "active": 4
  }
}
```

---

### Client Request

```bash
curl -X GET http://localhost:3000/dashboard/metrics \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json"
```

### Client Response

```json
{
  "tickets": {
    "total": 25,
    "open": 10,
    "closed": 15,
    "byStatus": [
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440001",
        "statusName": "New",
        "count": 5
      },
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440002",
        "statusName": "In Progress",
        "count": 5
      },
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440004",
        "statusName": "Closed",
        "count": 15
      }
    ],
    "byPriority": [
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440001",
        "priorityName": "Low",
        "count": 8
      },
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440002",
        "priorityName": "Medium",
        "count": 10
      },
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440003",
        "priorityName": "High",
        "count": 7
      }
    ]
  },
  "projects": {
    "total": 3,
    "active": 3
  }
}
```

---

## GET /dashboard/activity

### Admin Request (with limit)

```bash
curl -X GET "http://localhost:3000/dashboard/activity?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Admin Response

```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "type": "COMMENT_ADDED",
    "ticketId": "880e8400-e29b-41d4-a716-446655440001",
    "ticketTitle": "Fix login bug",
    "actorId": "990e8400-e29b-41d4-a716-446655440001",
    "actorName": "John Doe",
    "actorEmail": "john@example.com",
    "projectId": "aa0e8400-e29b-41d4-a716-446655440001",
    "projectName": "Website Redesign",
    "clientId": "bb0e8400-e29b-41d4-a716-446655440001",
    "clientName": "Acme Corp",
    "createdAt": "2024-01-15T14:30:00.000Z",
    "metadata": {
      "commentBody": "I've fixed the login issue. Please test and confirm.",
      "visibility": "PUBLIC"
    }
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "type": "STATUS_CHANGED",
    "ticketId": "880e8400-e29b-41d4-a716-446655440002",
    "ticketTitle": "Add new feature",
    "actorId": "990e8400-e29b-41d4-a716-446655440002",
    "actorName": "Jane Smith",
    "actorEmail": "jane@example.com",
    "projectId": "aa0e8400-e29b-41d4-a716-446655440002",
    "projectName": "Mobile App",
    "clientId": "bb0e8400-e29b-41d4-a716-446655440002",
    "clientName": "Tech Solutions Inc",
    "createdAt": "2024-01-15T14:25:00.000Z",
    "metadata": {
      "oldValue": {
        "statusId": "550e8400-e29b-41d4-a716-446655440001",
        "statusName": "New"
      },
      "newValue": {
        "statusId": "550e8400-e29b-41d4-a716-446655440002",
        "statusName": "In Progress"
      }
    }
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440003",
    "type": "ASSIGNEE_CHANGED",
    "ticketId": "880e8400-e29b-41d4-a716-446655440003",
    "ticketTitle": "Update documentation",
    "actorId": "990e8400-e29b-41d4-a716-446655440003",
    "actorName": "Admin User",
    "actorEmail": "admin@example.com",
    "projectId": "aa0e8400-e29b-41d4-a716-446655440003",
    "projectName": "Internal Tools",
    "clientId": "bb0e8400-e29b-41d4-a716-446655440003",
    "clientName": "Internal",
    "createdAt": "2024-01-15T14:20:00.000Z",
    "metadata": {
      "oldValue": {
        "assignedToUserId": null,
        "assignedToName": null
      },
      "newValue": {
        "assignedToUserId": "990e8400-e29b-41d4-a716-446655440001",
        "assignedToName": "John Doe"
      }
    }
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440004",
    "type": "TICKET_CREATED",
    "ticketId": "880e8400-e29b-41d4-a716-446655440004",
    "ticketTitle": "New bug report",
    "actorId": "990e8400-e29b-41d4-a716-446655440004",
    "actorName": "Client User",
    "actorEmail": "client@example.com",
    "projectId": "aa0e8400-e29b-41d4-a716-446655440004",
    "projectName": "Client Portal",
    "clientId": "bb0e8400-e29b-41d4-a716-446655440004",
    "clientName": "Client Corp",
    "createdAt": "2024-01-15T14:15:00.000Z",
    "metadata": {
      "newValue": {
        "title": "New bug report",
        "description": "Found an issue with the login page"
      }
    }
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440005",
    "type": "COMMENT_ADDED",
    "ticketId": "880e8400-e29b-41d4-a716-446655440001",
    "ticketTitle": "Fix login bug",
    "actorId": "990e8400-e29b-41d4-a716-446655440005",
    "actorName": "Employee User",
    "actorEmail": "employee@example.com",
    "projectId": "aa0e8400-e29b-41d4-a716-446655440001",
    "projectName": "Website Redesign",
    "clientId": "bb0e8400-e29b-41d4-a716-446655440001",
    "clientName": "Acme Corp",
    "createdAt": "2024-01-15T14:10:00.000Z",
    "metadata": {
      "commentBody": "Internal note: This is a critical bug, needs immediate attention.",
      "visibility": "INTERNAL"
    }
  }
]
```

---

### Employee Request

```bash
curl -X GET "http://localhost:3000/dashboard/activity?limit=5" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json"
```

### Employee Response

```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "type": "COMMENT_ADDED",
    "ticketId": "880e8400-e29b-41d4-a716-446655440001",
    "ticketTitle": "Fix login bug",
    "actorId": "990e8400-e29b-41d4-a716-446655440001",
    "actorName": "John Doe",
    "actorEmail": "john@example.com",
    "projectId": "aa0e8400-e29b-41d4-a716-446655440001",
    "projectName": "Website Redesign",
    "clientId": "bb0e8400-e29b-41d4-a716-446655440001",
    "clientName": "Acme Corp",
    "createdAt": "2024-01-15T14:30:00.000Z",
    "metadata": {
      "commentBody": "I've fixed the login issue. Please test and confirm.",
      "visibility": "PUBLIC"
    }
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "type": "STATUS_CHANGED",
    "ticketId": "880e8400-e29b-41d4-a716-446655440002",
    "ticketTitle": "Add new feature",
    "actorId": "990e8400-e29b-41d4-a716-446655440002",
    "actorName": "Jane Smith",
    "actorEmail": "jane@example.com",
    "projectId": "aa0e8400-e29b-41d4-a716-446655440002",
    "projectName": "Mobile App",
    "clientId": "bb0e8400-e29b-41d4-a716-446655440002",
    "clientName": "Tech Solutions Inc",
    "createdAt": "2024-01-15T14:25:00.000Z",
    "metadata": {
      "oldValue": {
        "statusId": "550e8400-e29b-41d4-a716-446655440001",
        "statusName": "New"
      },
      "newValue": {
        "statusId": "550e8400-e29b-41d4-a716-446655440002",
        "statusName": "In Progress"
      }
    }
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440003",
    "type": "ASSIGNEE_CHANGED",
    "ticketId": "880e8400-e29b-41d4-a716-446655440003",
    "ticketTitle": "Update documentation",
    "actorId": "990e8400-e29b-41d4-a716-446655440003",
    "actorName": "Admin User",
    "actorEmail": "admin@example.com",
    "projectId": "aa0e8400-e29b-41d4-a716-446655440003",
    "projectName": "Internal Tools",
    "clientId": "bb0e8400-e29b-41d4-a716-446655440003",
    "clientName": "Internal",
    "createdAt": "2024-01-15T14:20:00.000Z",
    "metadata": {
      "oldValue": {
        "assignedToUserId": null,
        "assignedToName": null
      },
      "newValue": {
        "assignedToUserId": "990e8400-e29b-41d4-a716-446655440001",
        "assignedToName": "John Doe"
      }
    }
  }
]
```

---

### Client Request

```bash
curl -X GET "http://localhost:3000/dashboard/activity?limit=5" \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json"
```

### Client Response

```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "type": "COMMENT_ADDED",
    "ticketId": "880e8400-e29b-41d4-a716-446655440001",
    "ticketTitle": "Fix login bug",
    "actorId": "990e8400-e29b-41d4-a716-446655440001",
    "actorName": "John Doe",
    "actorEmail": "john@example.com",
    "projectId": "aa0e8400-e29b-41d4-a716-446655440001",
    "projectName": "Website Redesign",
    "clientId": "bb0e8400-e29b-41d4-a716-446655440001",
    "clientName": "Acme Corp",
    "createdAt": "2024-01-15T14:30:00.000Z",
    "metadata": {
      "commentBody": "I've fixed the login issue. Please test and confirm.",
      "visibility": "PUBLIC"
    }
  },
  {
    "id": "770e8400-e29b-41d4-a716-446655440004",
    "type": "TICKET_CREATED",
    "ticketId": "880e8400-e29b-41d4-a716-446655440004",
    "ticketTitle": "New bug report",
    "actorId": "990e8400-e29b-41d4-a716-446655440004",
    "actorName": "Client User",
    "actorEmail": "client@example.com",
    "projectId": "aa0e8400-e29b-41d4-a716-446655440004",
    "projectName": "Client Portal",
    "clientId": "bb0e8400-e29b-41d4-a716-446655440004",
    "clientName": "Client Corp",
    "createdAt": "2024-01-15T14:15:00.000Z",
    "metadata": {
      "newValue": {
        "title": "New bug report",
        "description": "Found an issue with the login page"
      }
    }
  }
]
```

**Note**: Client users only see PUBLIC comments, not INTERNAL ones.

---

## Error Responses

### 401 Unauthorized

```bash
curl -X GET http://localhost:3000/dashboard/metrics \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "code": "UNAUTHORIZED",
  "message": "Missing or invalid Authorization header"
}
```

### 400 Bad Request (Invalid limit)

```bash
curl -X GET "http://localhost:3000/dashboard/activity?limit=200" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Response**:
```json
{
  "code": "BAD_REQUEST",
  "message": "limit must be less than or equal to 100"
}
```

---

## Pretty Print with jq

For better readability, pipe the response through `jq`:

```bash
# Metrics
curl -X GET http://localhost:3000/dashboard/metrics \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'

# Activity
curl -X GET "http://localhost:3000/dashboard/activity?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

---

## Complete Test Script

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

# Login as admin
echo "Logging in as admin..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SecurePass123!"}' \
  | jq -r '.accessToken')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "Failed to get admin token"
  exit 1
fi

echo "Admin token: ${ADMIN_TOKEN:0:20}..."

# Get metrics
echo -e "\n=== Getting Dashboard Metrics ==="
curl -s -X GET "$BASE_URL/dashboard/metrics" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'

# Get activity
echo -e "\n=== Getting Recent Activity ==="
curl -s -X GET "$BASE_URL/dashboard/activity?limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.'
```

Save this as `test-dashboard.sh`, make it executable (`chmod +x test-dashboard.sh`), and run it.

---

## GET /dashboard/users/:id/activity

### Admin Request (View User Activity)

```bash
# Replace {userId} with actual user ID
curl -X GET http://localhost:3000/dashboard/users/{userId}/activity \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Admin Response

```json
{
  "user": {
    "id": "990e8400-e29b-41d4-a716-446655440001",
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "EMPLOYEE",
    "clientId": null,
    "clientName": null,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "tickets": {
    "created": 25,
    "assigned": 45,
    "closed": 30,
    "open": 15,
    "byStatus": [
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440001",
        "statusName": "New",
        "count": 5
      },
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440002",
        "statusName": "In Progress",
        "count": 10
      },
      {
        "statusId": "550e8400-e29b-41d4-a716-446655440004",
        "statusName": "Closed",
        "count": 30
      }
    ],
    "byPriority": [
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440003",
        "priorityName": "High",
        "count": 20
      },
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440002",
        "priorityName": "Medium",
        "count": 15
      },
      {
        "priorityId": "660e8400-e29b-41d4-a716-446655440001",
        "priorityName": "Low",
        "count": 10
      }
    ]
  },
  "activity": {
    "totalEvents": 150,
    "totalComments": 75,
    "eventsByType": [
      {
        "eventType": "STATUS_CHANGED",
        "count": 50
      },
      {
        "eventType": "COMMENT_ADDED",
        "count": 75
      },
      {
        "eventType": "ASSIGNEE_CHANGED",
        "count": 15
      },
      {
        "eventType": "PRIORITY_CHANGED",
        "count": 10
      }
    ],
    "lastActivityAt": "2024-01-15T14:30:00.000Z"
  },
  "performance": {
    "averageResponseTime": 2.5,
    "averageResolutionTime": 48.5,
    "ticketsClosedLast30Days": 12,
    "ticketsCreatedLast30Days": 8,
    "commentsLast30Days": 25
  },
  "projects": {
    "total": 10,
    "active": 8,
    "asManager": 3,
    "asMember": 7
  }
}
```

### Example: Get User ID First

```bash
# List users to get user ID
USER_ID=$(curl -s -X GET http://localhost:3000/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq -r '.data[0].id')

# Get activity for that user
curl -X GET "http://localhost:3000/dashboard/users/$USER_ID/activity" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.'
```

### Example: Extract Specific Metrics

```bash
# Get performance metrics only
curl -X GET "http://localhost:3000/dashboard/users/$USER_ID/activity" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.performance'

# Get ticket breakdown
curl -X GET "http://localhost:3000/dashboard/users/$USER_ID/activity" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.tickets'

# Get activity summary
curl -X GET "http://localhost:3000/dashboard/users/$USER_ID/activity" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.activity'
```

### Error: Non-Admin Access

```bash
# Employee trying to access (will fail)
curl -X GET http://localhost:3000/dashboard/users/{userId}/activity \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN"
```

**Response**:
```json
{
  "code": "FORBIDDEN",
  "message": "Only admins can view user activity"
}
```

### Error: User Not Found

```bash
curl -X GET http://localhost:3000/dashboard/users/00000000-0000-0000-0000-000000000000/activity \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response**:
```json
{
  "code": "NOT_FOUND",
  "message": "User not found"
}
```

