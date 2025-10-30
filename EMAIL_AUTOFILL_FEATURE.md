# Email Auto-Fill Login Feature

This feature allows newly created users to receive an email with a login link that automatically fills in their credentials on the login page.

## How It Works

1. **User Creation**: When an admin creates a new user via the API, the system:
   - Creates the user account
   - Sends a welcome email with auto-fill login link
   - Encodes the user's credentials (email + password) in the URL

2. **Email Link**: The email contains a special login link like:
   ```
   http://localhost:5173/login?creds=eyJlbWFpbCI6InRlc3RAZ21haWwuY29tIiwicGFzc3dvcmQiOiJUZXN0UGFzczEyMyJ9
   ```

3. **Auto-Fill**: When the user clicks the link:
   - The frontend extracts and decodes the credentials
   - Automatically fills the login form
   - Removes credentials from the URL for security
   - Shows a notification about the auto-fill

## Security Features

- **Base64 Encoding**: Credentials are encoded (not encrypted) in the URL
- **URL Cleanup**: Credentials are immediately removed from the URL after extraction
- **No Storage**: Credentials are not stored in localStorage or cookies
- **Email-Only**: Credentials are only sent via email (secure channel)

## Implementation

### Backend

1. **Email Service** (`src/services/email.service.ts`):
   - Encodes credentials using base64
   - Generates login URLs with credential parameters
   - Sends HTML and text email versions

2. **User Controller** (`src/controllers/users.controller.ts`):
   - Passes original password to email service after user creation

3. **Utilities** (`src/utils/credentials.ts`):
   - Shared encoding/decoding functions
   - Browser-compatible frontend utilities

### Frontend Integration

Use the provided utilities in your frontend application:

```javascript
// Extract credentials from URL on login page load
const credentials = frontendCredentialUtils.extractCredentialsFromCurrentUrl();

if (credentials) {
    // Auto-fill login form
    document.getElementById('email').value = credentials.email;
    document.getElementById('password').value = credentials.password;
    
    // Clear from URL for security
    frontendCredentialUtils.clearCredentialsFromUrl();
    
    // Show success message
    showAutoFillNotification();
}
```

### Example Frontend Code

See `frontend-example/login.html` for a complete working example of:
- Extracting credentials from URL
- Auto-filling form fields
- Clearing URL parameters
- User feedback

## Testing

1. **Create a User** via API:
   ```bash
   curl -X POST http://localhost:3000/users \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "email": "test@example.com",
       "name": "Test User",
       "password": "TestPass123",
       "userType": "EMPLOYEE"
     }'
   ```

2. **Check Email** for the welcome message with auto-fill link

3. **Click Link** and verify:
   - Form fields are pre-filled
   - URL parameters are cleaned
   - User sees confirmation message

## Configuration

Update your `.env` file with email settings:

```env
# Email Service (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM="Ticketing System" <your_email@gmail.com>

# Application Settings
APP_BASE_URL=http://localhost:5173
```

## Security Considerations

⚠️ **Important Security Notes**:

1. **Temporary Nature**: Users should change their password after first login
2. **Email Security**: Ensure email channels are secure (HTTPS, secure SMTP)
3. **URL Exposure**: Be aware that URLs can be logged by proxies/servers
4. **Browser History**: The URL with credentials may appear in browser history briefly

## Framework Integration

### React Example
```jsx
import { useEffect, useState } from 'react';
import { frontendCredentialUtils } from '../utils/credentials';

function LoginForm() {
    const [autoFilled, setAutoFilled] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        const credentials = frontendCredentialUtils.extractCredentialsFromCurrentUrl();
        if (credentials) {
            setEmail(credentials.email);
            setPassword(credentials.password);
            setAutoFilled(true);
            frontendCredentialUtils.clearCredentialsFromUrl();
        }
    }, []);

    return (
        <form>
            {autoFilled && (
                <div className="alert alert-success">
                    ✅ Credentials auto-filled from email link!
                </div>
            )}
            <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
            />
            <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
            />
            <button type="submit">Login</button>
        </form>
    );
}
```

### Vue Example
```vue
<template>
  <form @submit.prevent="handleLogin">
    <div v-if="autoFilled" class="alert alert-success">
      ✅ Credentials auto-filled from email link!
    </div>
    <input v-model="email" type="email" />
    <input v-model="password" type="password" />
    <button type="submit">Login</button>
  </form>
</template>

<script>
import { frontendCredentialUtils } from '../utils/credentials';

export default {
  data() {
    return {
      email: '',
      password: '',
      autoFilled: false
    };
  },
  mounted() {
    const credentials = frontendCredentialUtils.extractCredentialsFromCurrentUrl();
    if (credentials) {
      this.email = credentials.email;
      this.password = credentials.password;
      this.autoFilled = true;
      frontendCredentialUtils.clearCredentialsFromUrl();
    }
  }
};
</script>
```