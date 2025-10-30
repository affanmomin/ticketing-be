# Ticket Email Notifications

This feature automatically sends email notifications when tickets are created or updated in the ticketing system.

## Features

### 📧 Email Notifications For:
- **Ticket Creation**: Sent when a new ticket is created
- **Ticket Updates**: Sent when ticket details are modified (status, priority, assignee, etc.)

### 👥 Recipients:
- **Assignee**: Person assigned to the ticket (if assigned)
- **Reporter**: Person who created the ticket
- **Smart Logic**: Avoids duplicate emails (e.g., if reporter assigns to themselves)

### 🔔 Notification Triggers:

#### Ticket Creation:
- Automatic email sent after successful ticket creation
- Includes full ticket details and description
- Direct link to view the ticket

#### Ticket Updates:
- Email sent only when meaningful changes are made
- Tracks and displays specific changes (status, priority, assignee, etc.)
- Shows before/after values for changed fields

## Email Content

### Creation Email Includes:
- ✅ Ticket title and ID
- ✅ Type, priority, and status
- ✅ Full description
- ✅ Reporter and assignee information
- ✅ Due date (if set)
- ✅ Direct link to ticket
- ✅ Professional HTML formatting with color-coded priorities

### Update Email Includes:
- ✅ Ticket title and current status
- ✅ List of specific changes made
- ✅ Before/after values for changed fields
- ✅ Last updated timestamp
- ✅ Direct link to ticket

## Implementation Details

### Backend Changes

#### 1. Extended Email Service (`src/services/email.service.ts`)
```typescript
// New methods added:
- sendTicketCreatedEmail(data: TicketEmailData)
- sendTicketUpdatedEmail(data: TicketEmailData)
- getTicketEmailRecipients(data: TicketEmailData)
```

#### 2. Updated Ticket Controllers (`src/controllers/tickets.controller.ts`)
```typescript
// Enhanced createTicketCtrl:
- Fetches reporter and assignee user data
- Sends creation notification emails
- Non-blocking email sending

// Enhanced updateTicketCtrl:
- Tracks changes between old and new ticket data
- Sends update notifications only for meaningful changes
- Includes change details in email
```

### Email Templates

#### HTML Email Features:
- 📱 **Responsive design** for mobile and desktop
- 🎨 **Color-coded priorities** (P0=Red, P1=Orange, P2=Yellow, P3=Green)
- 🏷️ **Status badges** with professional styling
- 🔗 **Direct ticket links** for easy access
- ✨ **Professional branding** consistent with system

#### Change Tracking:
- ✅ **Field-level tracking** (Title, Status, Priority, Assignee, Due Date)
- 🔄 **Before/After values** clearly displayed
- ❌ **Strike-through old values**, ✅ **bold new values**
- 📝 **Human-readable change descriptions**

## Configuration

### Environment Variables Required:
```env
# Email Service (SMTP) - Already configured
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="Ticketing System" <your_email@gmail.com>

# Frontend URL for ticket links
APP_BASE_URL=http://localhost:5173
```

## Usage Examples

### 1. Creating a Ticket
```bash
curl -X POST http://localhost:3000/tickets \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "title": "Fix login bug",
    "descriptionMd": "Users cannot login with special characters in password",
    "clientId": "uuid-here",
    "projectId": "uuid-here",
    "assigneeId": "uuid-here",
    "priority": "P1",
    "type": "BUG"
  }'
```

**Result**: 
- ✅ Ticket created successfully
- 📧 Email sent to assignee: "New Ticket Created: Fix login bug"
- 📧 Email sent to reporter (if different from assignee)

### 2. Updating a Ticket
```bash
curl -X PUT http://localhost:3000/tickets/ticket-uuid \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{
    "status": "IN_PROGRESS",
    "priority": "P0"
  }'
```

**Result**:
- ✅ Ticket updated successfully  
- 📧 Email sent showing changes:
  - Status: BACKLOG → IN_PROGRESS
  - Priority: P1 → P0

## Security & Performance

### 🔒 Security Features:
- **No sensitive data** in email templates
- **Secure SMTP** connection with authentication
- **User permission validation** before sending emails
- **Tenant isolation** - users only get emails for their tenant's tickets

### ⚡ Performance Optimizations:
- **Non-blocking email sending** - API responses aren't delayed
- **Efficient queries** - minimal database calls for user data
- **Smart change detection** - emails only sent for meaningful updates
- **Error handling** - email failures don't break ticket operations

## Error Handling

### Email Service Errors:
- ❌ **SMTP connection failures** are logged but don't break ticket operations
- ❌ **User not found errors** are caught and logged
- ❌ **Template rendering errors** are handled gracefully
- ✅ **Successful sends** are logged for monitoring

### Logging Examples:
```
✅ Ticket creation email sent to user@example.com for ticket abc-123
✅ Ticket update email sent to assignee@example.com for ticket abc-123
❌ Failed to send ticket creation emails for ticket abc-123: SMTP connection refused
```

## Customization

### Adding More Email Types:
1. Add new methods to `EmailService` class
2. Create email templates (HTML + text versions)
3. Call from appropriate controller methods

### Customizing Recipients:
Modify `getTicketEmailRecipients()` method in email service:
```typescript
// Example: Add project managers to notifications
if (data.projectManager) {
  recipients.push(data.projectManager);
}
```

### Customizing Email Content:
- Update HTML templates for branding
- Modify text templates for different tone
- Add more ticket fields to emails
- Include project/client information

## Testing

### 1. Test Ticket Creation:
1. Create a ticket via API with an assignee
2. Check that both reporter and assignee receive emails
3. Verify email content includes all ticket details
4. Confirm ticket link works

### 2. Test Ticket Updates:
1. Update a ticket's status and priority
2. Verify only involved users get notification
3. Check that changes are clearly displayed
4. Confirm no emails sent for non-meaningful updates

### 3. Test Edge Cases:
- Ticket with no assignee (only reporter gets email)
- Self-assignment (no duplicate emails)
- Invalid user IDs (graceful error handling)
- SMTP failures (ticket creation still succeeds)

## Monitoring

### Key Metrics to Track:
- 📊 **Email send success rate**
- 📊 **Email delivery times**
- 📊 **User engagement** (email opens, clicks)
- 📊 **Error rates** by type (SMTP, template, data)

### Log Analysis:
```bash
# Check successful email sends
grep "email sent successfully" logs/app.log

# Check email failures  
grep "Failed to send.*email" logs/app.log

# Monitor SMTP connection issues
grep "SMTP.*failed" logs/app.log
```

## Future Enhancements

### Potential Improvements:
- 🔔 **Email preferences** (users can choose notification types)
- 📱 **Push notifications** for mobile apps  
- 🕐 **Digest emails** (daily/weekly summaries)
- 🏷️ **Advanced filtering** (by priority, project, etc.)
- 📊 **Email analytics** (open rates, click tracking)
- 🌐 **Multi-language support** for international teams
- 💌 **Rich formatting** with ticket history and comments

The ticket email notification system is now fully functional and ready to keep your team informed about important ticket activities!