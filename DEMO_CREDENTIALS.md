# Demo Data - Login Credentials

## 🚀 Quick Start

Run the populate script:
```bash
npm run db:populate-demo
```

This creates a complete demo environment with:
- 1 Organization
- 3 Clients
- 6 Projects
- 3 Employees
- 3 Client Users
- 14 Tickets
- 27 Comments
- 9 Streams
- 9 Subjects

---

## 📋 Login Credentials

### 🔐 ADMIN

**Email:** `admin@demo.com`  
**Password:** `Admin123!`  
**Full Name:** Admin User

**Access:**
- ✅ Full organization access
- ✅ See all tickets, projects, clients, users
- ✅ Can view user activity metrics
- ✅ Can manage everything

---

### 👤 EMPLOYEES

#### Employee 1
**Email:** `employee1@demo.com`  
**Password:** `Employee123!`  
**Full Name:** John Doe

#### Employee 2
**Email:** `employee2@demo.com`  
**Password:** `Employee123!`  
**Full Name:** Jane Smith

#### Employee 3
**Email:** `employee3@demo.com`  
**Password:** `Employee123!`  
**Full Name:** Bob Johnson

**Access:**
- ✅ See tickets assigned to them or raised by them
- ✅ See projects they're members of
- ✅ Can create tickets (if can_raise = true)
- ✅ Can see PUBLIC and INTERNAL comments
- ❌ Cannot see other users' activity
- ❌ Cannot manage clients/users

---

### 🏢 CLIENT USERS

#### Client User 1 (Acme Corporation)
**Email:** `client1@demo.com`  
**Password:** `Client123!`  
**Full Name:** Alice Client  
**Client:** Acme Corporation

#### Client User 2 (Tech Solutions Inc)
**Email:** `client2@demo.com`  
**Password:** `Client123!`  
**Full Name:** Charlie Client  
**Client:** Tech Solutions Inc

#### Client User 3 (Global Industries)
**Email:** `client3@demo.com`  
**Password:** `Client123!`  
**Full Name:** Diana Client  
**Client:** Global Industries

**Access:**
- ✅ See tickets for their client's projects
- ✅ Can create tickets (if can_raise = true)
- ✅ Can see PUBLIC comments only
- ❌ Cannot see INTERNAL comments
- ❌ Cannot see other clients' data

---

## 🧪 Testing the Dashboard

### 1. Login as Admin

```bash
# Get admin token
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Admin123!"}' \
  | jq -r '.accessToken')

# Get dashboard metrics (sees everything)
curl -X GET http://localhost:3000/dashboard/metrics \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.'

# Get recent activity (sees all activity)
curl -X GET http://localhost:3000/dashboard/activity?limit=20 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.'

# View user activity (employee1)
USER_ID=$(curl -s -X GET http://localhost:3000/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq -r '.data[] | select(.email == "employee1@demo.com") | .id')

curl -X GET http://localhost:3000/dashboard/users/$USER_ID/activity \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq '.'
```

### 2. Login as Employee

```bash
# Get employee token
EMP_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee1@demo.com","password":"Employee123!"}' \
  | jq -r '.accessToken')

# Get dashboard metrics (only their tickets)
curl -X GET http://localhost:3000/dashboard/metrics \
  -H "Authorization: Bearer $EMP_TOKEN" \
  | jq '.'

# Get recent activity (only their tickets)
curl -X GET http://localhost:3000/dashboard/activity \
  -H "Authorization: Bearer $EMP_TOKEN" \
  | jq '.'
```

### 3. Login as Client

```bash
# Get client token
CLIENT_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client1@demo.com","password":"Client123!"}' \
  | jq -r '.accessToken')

# Get dashboard metrics (only their client's tickets)
curl -X GET http://localhost:3000/dashboard/metrics \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  | jq '.'

# Get recent activity (only their client's tickets, PUBLIC comments)
curl -X GET http://localhost:3000/dashboard/activity \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  | jq '.'
```

---

## 📊 What Data Was Created

### Organization
- **Name:** Demo Ticketing Organization

### Clients
1. **Acme Corporation** (contact@acme.com)
2. **Tech Solutions Inc** (info@techsolutions.com)
3. **Global Industries** (support@global.com)

### Projects
1. **Website Redesign** (Acme Corporation)
2. **Mobile App Development** (Acme Corporation)
3. **API Integration** (Tech Solutions Inc)
4. **Cloud Migration** (Tech Solutions Inc)
5. **Security Audit** (Global Industries)
6. **Performance Optimization** (Global Industries)

### Tickets
- 14 tickets created across all projects
- Mix of statuses (New, In Progress, Resolved, Closed)
- Mix of priorities (Low, Medium, High, Urgent)
- Some assigned to employees, some unassigned
- Created by both admin and employees

### Comments
- 27 comments total
- Mix of PUBLIC and INTERNAL comments
- Distributed across tickets

### Activity
- Ticket creation events
- Status changes
- Priority changes
- Comment additions

---

## 🎯 Testing Scenarios

### Admin Dashboard
- Should see all 14 tickets
- Should see all 3 clients
- Should see all 6 projects
- Should see all 7 users (1 admin + 3 employees + 3 clients)
- Can view activity for any user

### Employee Dashboard
- Should see only tickets assigned to them or raised by them
- Should see only projects they're members of
- Should see `assignedToMe` count
- Cannot view other users' activity

### Client Dashboard
- Should see only tickets for their client's projects
- Should see only PUBLIC comments in activity
- Cannot see INTERNAL comments
- Cannot view other clients' data

---

## 🔄 Re-populate Data

To clear and re-populate:
```bash
# Option 1: Run the script again (will create new organization)
npm run db:populate-demo

# Option 2: Manually delete and re-run
# (You may need to clean up existing data first)
```

---

## 📝 Notes

- All passwords are simple for demo purposes: `Admin123!`, `Employee123!`, `Client123!`
- Data is created in a single transaction (all or nothing)
- Tickets are distributed across projects
- Comments include both PUBLIC and INTERNAL for testing visibility
- User activity metrics are available for admins to view any user's performance

