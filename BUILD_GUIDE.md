# Local Build Guide

This guide will help you build and run the ticketing API locally to verify it's ready for deployment.

## Prerequisites

- **Node.js** version 22.15.0 (recommended) - Check with `node --version`
- **Docker** and **Docker Compose** (for local database)
- **npm** or **pnpm** package manager

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Server Configuration
PORT=3000
LOG_LEVEL=info

# Database (for local development)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/app

# JWT Authentication
JWT_SECRET=your-secret-key-change-this-in-production
JWT_ACCESS_TTL=15m

# S3 / MinIO Configuration (optional for local testing)
# Leave empty if you don't need file attachments
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=attachments
S3_ACCESS_KEY_ID=your_key
S3_SECRET_ACCESS_KEY=your_secret

# Email Configuration (Resend)
RESEND_API_KEY=your_resend_api_key
SMTP_FROM="Sahra-Al-Aman Information Technology (SAAIT)" <noreply@example.com>
# Leave SMTP_FROM unset to use Resend's default (onboarding@resend.dev), or
# verify your own domain at https://resend.com/domains for a custom sender.

# Application Base URL (for email links)
APP_BASE_URL=http://localhost:5173

# Logo Configuration (optional)
# LOGO_URL=https://cdn.example.com/images/logo.jpg
```

### 3. Start Local Database

```bash
npm run db:up
```

This will start a PostgreSQL container on port 5432 with the schema automatically initialized.

### 4. Seed Database (Optional)

Create an admin user:

```bash
npm run db:seed
```

Default credentials:
- Email: `admin@example.com`
- Password: `secret123`

### 5. Build and Run

#### Option A: Development Mode (with hot-reload)

```bash
npm run dev
```

#### Option B: Production Build

```bash
# Build TypeScript
npm run build

# Run the built application
npm start
```

The server will start on `http://localhost:3000`

### 6. Verify It's Working

1. **Health Check:**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Login Test:**
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H 'content-type: application/json' \
     -d '{"email":"admin@example.com","password":"secret123"}'
   ```

3. **Swagger Documentation:**
   Open `http://localhost:3000/docs` in your browser

## Docker Build (For Deployment)

### Build Docker Image

```bash
npm run docker:build
```

This will:
1. Build the TypeScript code
2. Create a production Docker image
3. Tag it as `code-companion-node-ts-template`

### Run Docker Container

```bash
npm run docker:run
```

Or manually:

```bash
docker run -p 3000:3000 --env-file .env code-companion-node-ts-template
```

## Troubleshooting

### Database Connection Issues

- Ensure Docker is running: `docker ps`
- Check database is up: `docker ps | grep cc_api_db`
- Verify DATABASE_URL matches the docker-compose.yml settings

### Build Errors

- Ensure Node.js version is 22.15.0: `node --version`
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript compilation: `npm run build`

### Port Already in Use

- Change PORT in `.env` file
- Or stop the process using port 3000:
  ```bash
  lsof -ti:3000 | xargs kill -9
  ```

### Missing Environment Variables

- Ensure `.env` file exists in project root
- Check all required variables are set (see step 2 above)

## Production Deployment Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a secure random string
- [ ] Update `DATABASE_URL` to production database
- [ ] Configure production S3/MinIO credentials
- [ ] Set up production SMTP server
- [ ] Update `APP_BASE_URL` to production frontend URL
- [ ] Set `LOG_LEVEL` to `info` or `warn` (not `debug`)
- [ ] Test Docker build: `npm run docker:build`
- [ ] Test Docker run: `npm run docker:run`
- [ ] Run tests: `npm test`
- [ ] Check linting: `npm run lint`

## Additional Scripts

- `npm run lint` - Lint the codebase
- `npm test` - Run test suite
- `npm run db:down` - Stop and remove database container
- `npm run test:routes` - Test all API routes

## Need Help?

- Check the main [README.md](README.md) for more details
- Review API documentation at `/docs` endpoint
- Check logs for error messages

