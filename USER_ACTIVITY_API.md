# User Activity & Performance API

## Overview

Admin-only endpoint to view comprehensive activity and performance metrics for any user in the organization. This gives admins a complete view of what a user is up to.

## Endpoint

### GET /dashboard/users/:id/activity

Returns detailed activity and performance metrics for a specific user.

**Authentication**: Required (Bearer token)  
**Authorization**: ADMIN only

**Path Parameters**:
- `id` (string, required): User ID to view activity for

**Response**:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
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
        "statusId": "uuid",
        "statusName": "New",
        "count": 5
      },
      {
        "statusId": "uuid",
        "statusName": "In Progress",
        "count": 10
      },
      {
        "statusId": "uuid",
        "statusName": "Closed",
        "count": 30
      }
    ],
    "byPriority": [
      {
        "priorityId": "uuid",
        "priorityName": "High",
        "count": 20
      },
      {
        "priorityId": "uuid",
        "priorityName": "Medium",
        "count": 15
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
        "count": 25
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

## Metrics Explained

### User Information
- Basic user details (email, name, role, client association)
- Account status (active/inactive)
- Account creation date

### Tickets
- **created**: Tickets raised by this user
- **assigned**: Tickets currently or previously assigned to this user
- **closed**: Tickets assigned to user that were closed
- **open**: Tickets assigned to user that are still open
- **byStatus**: Breakdown of tickets by status
- **byPriority**: Breakdown of tickets by priority

### Activity
- **totalEvents**: Total ticket events performed by user
- **totalComments**: Total comments made by user
- **eventsByType**: Breakdown of events by type (STATUS_CHANGED, COMMENT_ADDED, etc.)
- **lastActivityAt**: Timestamp of most recent activity

### Performance (Last 30 Days)
- **averageResponseTime**: Average time (in hours) to first comment/action on assigned tickets
- **averageResolutionTime**: Average time (in hours) to close assigned tickets
- **ticketsClosedLast30Days**: Number of tickets closed in last 30 days
- **ticketsCreatedLast30Days**: Number of tickets created in last 30 days
- **commentsLast30Days**: Number of comments made in last 30 days

### Projects
- **total**: Total projects user is a member of
- **active**: Active projects user is a member of
- **asManager**: Projects where user is a MANAGER
- **asMember**: Projects where user is a MEMBER

## Usage Examples

### Get User Activity

```bash
# Get activity for a specific user
curl -X GET http://localhost:3000/dashboard/users/{userId}/activity \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### Example with jq

```bash
# Pretty print response
curl -X GET http://localhost:3000/dashboard/users/{userId}/activity \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.'

# Extract specific metrics
curl -X GET http://localhost:3000/dashboard/users/{userId}/activity \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.performance'

# Get ticket breakdown
curl -X GET http://localhost:3000/dashboard/users/{userId}/activity \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.tickets'
```

## Error Responses

### 401 Unauthorized
```json
{
  "code": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

### 403 Forbidden (Non-admin)
```json
{
  "code": "FORBIDDEN",
  "message": "Only admins can view user activity"
}
```

### 404 Not Found
```json
{
  "code": "NOT_FOUND",
  "message": "User not found"
}
```

## Use Cases

1. **Performance Review**: See how productive a user is (tickets closed, response times)
2. **Workload Analysis**: Check how many tickets are assigned vs created
3. **Activity Monitoring**: See what the user has been doing recently
4. **Project Involvement**: Understand user's project participation
5. **Team Management**: Identify top performers or users needing support

## Notes

- All metrics are calculated in real-time
- Performance metrics are based on last 30 days
- Response time is calculated from ticket creation to first user action
- Resolution time is calculated from ticket creation to closure
- Only shows data for tickets in the same organization
- User must exist in the organization

