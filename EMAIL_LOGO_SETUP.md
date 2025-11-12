# Email Logo Setup Guide

## Overview

All email templates now include the SAAIT logo. The logo appears in:
- **Email headers** (120px width)
- **Email footers** (80px width, slightly transparent)

## Setup Options

### Option 1: Use Base64 Embedded Logo (Quick Setup)

1. **Generate base64 string:**
   ```bash
   npx ts-node -r dotenv/config scripts/generate-logo-base64.ts
   ```

2. **Add to your `.env` file:**
   ```env
   LOGO_BASE64="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
   ```

**Pros:**
- ✅ Works immediately, no hosting needed
- ✅ Logo always loads (no external dependency)

**Cons:**
- ❌ Increases email size significantly (~50-100KB)
- ❌ Some email clients may block embedded images

---

### Option 2: Host Logo and Use URL (Recommended for Production)

1. **Upload `saait-logo.jpg` to a public URL:**
   - Your CDN (CloudFront, Cloudflare, etc.)
   - Your web server's public directory
   - Image hosting service (Imgur, etc.)

2. **Add to your `.env` file:**
   ```env
   LOGO_URL="https://your-domain.com/images/saait-logo.jpg"
   ```

**Pros:**
- ✅ Smaller email size
- ✅ Better email client compatibility
- ✅ Can update logo without changing code

**Cons:**
- ❌ Requires hosting setup
- ❌ Logo won't load if URL is blocked

---

## Priority Order

The system checks in this order:
1. `LOGO_URL` (if set) - **Preferred for production**
2. `LOGO_BASE64` (if set) - **Fallback option**
3. Placeholder image - **Default fallback**

---

## Testing

After setting up, test emails to verify the logo appears:

```bash
# Test welcome email
npx ts-node -r dotenv/config scripts/test-email-invites.ts

# Test ticket email
npx ts-node -r dotenv/config scripts/test-ticket-email.ts
```

---

## Logo Specifications

- **File:** `saait-logo.jpg`
- **Dimensions:** 595x606 pixels
- **Format:** JPEG
- **Usage in emails:**
  - Header: 120px width (auto height)
  - Footer: 80px width (auto height, 70% opacity)

---

## Troubleshooting

### Logo not showing in emails?

1. **Check environment variables:**
   ```bash
   echo $LOGO_URL
   echo $LOGO_BASE64
   ```

2. **Verify logo file exists:**
   ```bash
   ls -lh saait-logo.jpg
   ```

3. **Test base64 generation:**
   ```bash
   npx ts-node -r dotenv/config scripts/generate-logo-base64.ts
   ```

4. **Check email client:**
   - Some email clients block external images by default
   - Gmail, Outlook may require "Show images" to be clicked
   - Base64 embedded images work better for blocked clients

### Logo too large/small?

Edit the width in `src/services/email.service.ts`:
- Header logo: `width: 120px` (line ~114, ~291, ~543, ~762)
- Footer logo: `width: 80px` (footer sections)

---

## Production Recommendations

1. **Use `LOGO_URL`** pointing to your CDN
2. **Enable HTTPS** for the logo URL
3. **Set proper CORS headers** if needed
4. **Use a reliable CDN** (CloudFront, Cloudflare, etc.)
5. **Consider a fallback** - keep base64 as backup

---

## Example .env Configuration

```env
# Production (recommended)
LOGO_URL="https://cdn.saait.com/images/saait-logo.jpg"

# Or development/testing (fallback)
# LOGO_BASE64="data:image/jpeg;base64,..."
```

---

## Files Modified

- ✅ `src/services/email.service.ts` - Added logo to all email templates
- ✅ `scripts/generate-logo-base64.ts` - Helper script for base64 conversion
- ✅ `EMAIL_LOGO_SETUP.md` - This documentation

---

## Email Templates Updated

All email templates now include the SAAIT logo:

1. ✅ **Welcome Email** - Header logo
2. ✅ **Client Notification Email** - Header logo
3. ✅ **Password Reset Email** - Header logo
4. ✅ **Ticket Assignment Email** - Header logo
5. ✅ **All Email Footers** - Smaller footer logo

---

## Next Steps

1. Choose your setup method (URL or base64)
2. Add the appropriate env variable
3. Test emails to verify logo appears
4. Deploy to production

For questions or issues, check the email service logs or test scripts.

