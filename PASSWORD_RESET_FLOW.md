# Password Reset Flow

## Complete User Journey

### Step 1: User Requests Password Reset

**Frontend Action:**
- User clicks "Forgot Password?" link on login page
- User enters their email address
- Frontend calls: `POST /auth/forgot-password`

**API Request:**
```json
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Backend Process:**
1. Validates email format
2. Looks up user by email in database
3. If user exists:
   - Generates secure random token (32 bytes, hex encoded)
   - Sets token expiration (1 hour from now)
   - Invalidates any existing unused tokens for this user
   - Creates new token record in `password_reset_token` table
   - Sends password reset email with token
4. If user doesn't exist:
   - Does nothing (security: prevents email enumeration)
   - Still returns success message

**API Response (always the same for security):**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Email Sent:**
- Professional HTML email with reset link
- Link format: `{APP_BASE_URL}/reset-password?token={token}`
- Token expires in 1 hour
- Includes security notice

---

### Step 2: User Clicks Reset Link

**Frontend Action:**
- User receives email and clicks "Reset Password" button
- Frontend navigates to: `/reset-password?token={token}`
- Frontend extracts token from URL query parameter
- Frontend shows password reset form

**Reset Form Fields:**
- New Password (min 8 characters)
- Confirm Password (optional, frontend validation)

---

### Step 3: User Submits New Password

**Frontend Action:**
- User enters new password
- Frontend validates password strength
- Frontend calls: `POST /auth/reset-password`

**API Request:**
```json
POST /auth/reset-password
Content-Type: application/json

{
  "token": "abc123...",
  "password": "NewSecurePassword123!"
}
```

**Backend Process:**
1. Validates token exists in database
2. Checks if token is already used → Error if used
3. Checks if token is expired → Error if expired
4. Hashes new password with bcrypt
5. Updates user's password in database
6. Marks token as used (prevents reuse)
7. Returns success

**API Response:**
```json
{
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

**Error Responses:**
- `400 Bad Request` - "Invalid or expired reset token"
- `400 Bad Request` - "This reset token has already been used"
- `400 Bad Request` - "This reset token has expired"

---

### Step 4: User Logs In

**Frontend Action:**
- User is redirected to login page
- User enters email and new password
- Frontend calls: `POST /auth/login`

**API Request:**
```json
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "NewSecurePassword123!"
}
```

**Backend Process:**
1. Looks up user by email
2. Verifies password hash matches
3. Returns JWT token

**API Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "organizationId": "uuid",
    "role": "ADMIN",
    "clientId": null,
    "email": "user@example.com",
    "fullName": "User Name"
  }
}
```

---

## Security Features

### 1. Email Enumeration Prevention
- Always returns the same success message
- Doesn't reveal if email exists or not
- Prevents attackers from discovering valid email addresses

### 2. Token Security
- **Random Generation**: 32-byte cryptographically secure random token
- **Expiration**: Tokens expire after 1 hour
- **One-Time Use**: Tokens are marked as used after password reset
- **Automatic Invalidation**: Previous unused tokens are invalidated when new one is created

### 3. Token Storage
- Tokens stored in `password_reset_token` table
- Includes: `user_id`, `token`, `expires_at`, `used` flag
- Indexed for fast lookups

### 4. Password Security
- Passwords hashed with bcrypt (10 rounds)
- Minimum 8 characters required
- Old password immediately invalidated

---

## Database Schema

```sql
CREATE TABLE password_reset_token (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

---

## API Endpoints Summary

### POST /auth/forgot-password (Public)
- **Purpose**: Request password reset
- **Auth**: None required
- **Request**: `{ "email": "string" }`
- **Response**: `{ "message": "string" }`

### POST /auth/reset-password (Public)
- **Purpose**: Reset password with token
- **Auth**: None required (token is the auth)
- **Request**: `{ "token": "string", "password": "string" }`
- **Response**: `{ "message": "string" }`

---

## Frontend Integration Example

```typescript
// Step 1: Request reset
async function requestPasswordReset(email: string) {
  const response = await fetch('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
}

// Step 2: Extract token from URL
function getTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

// Step 3: Reset password
async function resetPassword(token: string, newPassword: string) {
  const response = await fetch('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: newPassword })
  });
  return response.json();
}
```

---

## Flow Diagram

```
┌─────────────┐
│   User      │
│  Forgets    │
│  Password   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  POST /auth/forgot-password │
│  { email: "user@ex.com" }   │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Backend:                    │
│  1. Find user by email       │
│  2. Generate secure token    │
│  3. Save token to DB         │
│  4. Send email with link     │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Email Sent:                 │
│  Reset link with token       │
│  Expires in 1 hour           │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────┐
│  User clicks│
│  email link │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  Frontend:                   │
│  /reset-password?token=...   │
│  Shows password form         │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  POST /auth/reset-password  │
│  { token: "...",             │
│    password: "newpass" }     │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Backend:                    │
│  1. Validate token           │
│  2. Check expiration         │
│  3. Check if used            │
│  4. Hash new password         │
│  5. Update user password      │
│  6. Mark token as used        │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────┐
│  Success!   │
│  User can   │
│  login now  │
└─────────────┘
```

---

## Error Scenarios

### Invalid Token
- User uses expired token → `400: "This reset token has expired"`
- User uses already-used token → `400: "This reset token has already been used"`
- User uses non-existent token → `400: "Invalid or expired reset token"`

### Email Not Found
- User enters non-existent email → Still returns success (security)
- No email sent, but user doesn't know

### Multiple Requests
- User requests reset multiple times → Previous tokens invalidated
- Only latest token is valid
- Prevents confusion with multiple emails

---

## Best Practices

1. **Frontend**: Clear token from URL after extraction (security)
2. **Frontend**: Show clear error messages for expired/invalid tokens
3. **Frontend**: Redirect to login after successful reset
4. **Backend**: Always hash passwords before storing
5. **Backend**: Use secure random token generation
6. **Backend**: Set reasonable expiration times (1 hour is standard)
7. **Email**: Include clear expiration notice
8. **Email**: Include security warning if user didn't request reset

