# Code Companion Ticketing API (Fastify + TS + pg + RLS)

Production-ready REST API template featuring Fastify, TypeScript, plain pg (no ORM), PostgreSQL RLS via GUCs, JWT auth, S3 attachments with presigned URLs, Zod validation, security headers, and rate limiting.

## Features

- Fastify 5 + TypeScript + Zod
- PostgreSQL via `pg` with multi-tenant RLS enforced by Postgres GUCs per request/transaction
- JWT auth (email/password, bcrypt) with `/auth/login` and `/auth/me`
- REST resources: clients, projects, streams, tickets, comments, tags, attachments
- Attachments stored in S3/MinIO with presigned GET URLs on read
- Security headers (helmet), CORS, rate limits, multipart uploads
- Swagger UI at `/docs` and raw spec at `/docs/json` (from `openapi.yaml`)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version `22.15.0` recommended, see `.nvmrc`)
- [Docker](https://www.docker.com/) (optional, for containerized deployment)

### Installation

1. Use this repository as a template:

   - Click the **"Use this template"** button on the [GitHub repository page](https://github.com/CodeCompanionBE/code-companion-node-ts-template).
   - Create a new repository based on this template.

2. Clone your newly created repository:

   ```bash
   git clone ...
   cd your-repo-name
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy the example environment file and configure it:

   ```bash
   cp .env.example .env
   ```

### Development

Start the development server with hot-reloading:

```bash
npm run dev
```

The server will run on `http://localhost:3000` by default.

Swagger docs are available at `http://localhost:3000/docs`.

## Local DB quickstart

Use Docker to spin up Postgres with the schema:

```bash
npm run db:up
# DB URL for local dev
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/app

# Seed an admin user (defaults: admin@example.com / secret123)
npm run db:seed
```

Now start the API and login:

```bash
npm run dev
# In another terminal
curl -X POST http://localhost:3000/auth/login \
   -H 'content-type: application/json' \
   -d '{"email":"admin@example.com","password":"secret123"}'
```

## Using Supabase

If you're running Postgres on Supabase:

1) Copy the connection string from your project's Database settings and set it as `DATABASE_URL` in `.env`.

- Important: Append `?sslmode=require` to the connection string.
- If your password contains special characters (like `@` or `:`), URL-encode them (`@` becomes `%40`, etc.).

Example:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
```

2) Ensure your schema and RLS policies are applied on Supabase.

3) Seed an admin user (optional if you already created one):

```bash
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=secret123 \
TENANT_NAME="My Agency" \
npm run db:seed
```

4) Start the API and login with your seeded credentials:

```bash
npm run dev
# In another terminal
curl -X POST http://localhost:3000/auth/login \
   -H 'content-type: application/json' \
   -d '{"email":"admin@example.com","password":"secret123"}'
```

### Testing

Run the test suite:

```bash
npm test
```

### Linting

Lint the codebase:

```bash
npm run lint
```

### Docker

Build the Docker image:

```bash
npm run docker:build
```

Run the Docker container:

```bash
npm run docker:run
```

### CI/CD

This repository includes a GitHub Actions workflow for building, linting, and testing the application. The workflow is triggered on pushes and pull requests to the `main` branch.

## Project Structure

```
.
├── src
│   ├── controllers/    # HTTP controllers (validation + service calls)
│   ├── db/             # pg pool + RLS transaction helper
│   ├── plugins/        # fastify plugins (security, auth, multipart, swagger)
│   ├── routes/         # Route definitions per resource
│   ├── schemas/        # Zod request/response schemas
│   ├── services/       # Plain SQL services (pg PoolClient)
│   ├── types/          # Shared types + Fastify augmentation
│   ├── utils/          # Helpers (errors, pagination, s3, etc.)
│   ├── server.ts       # Fastify setup
│   └── index.ts        # App entrypoint
├── openapi.yaml        # OpenAPI 3.0 spec served by /docs
├── .github
│   └── workflows       # GitHub Actions workflows
├── .vscode             # VS Code settings
├── Dockerfile          # Docker configuration
├── package.json        # Project metadata and scripts
├── tsconfig.json       # TypeScript configuration
└── .env.example        # Example environment variables
```

## Scripts

- `npm run dev`: Start the development server.
- `npm test`: Run tests.
- `npm run lint`: Lint the codebase.
- `npm run docker:build`: Build the Docker image.
- `npm run docker:run`: Run the Docker container.

## Environment

```
PORT=3000
DATABASE_URL=postgres://user:pass@host:5432/dbname

# JWT
JWT_SECRET=replace_me
JWT_ACCESS_TTL=15m

# S3 / MinIO
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=attachments
S3_ACCESS_KEY_ID=your_key
S3_SECRET_ACCESS_KEY=your_secret
```

## Authentication

- `POST /auth/login` accepts `{ email, password, tenantId? }`
- Returns `{ accessToken, user }` where user includes `{ id, tenantId, role, clientId }`
- Send `Authorization: Bearer <accessToken>` for all protected routes

## RLS via Postgres GUCs

Every protected request runs inside `withRlsTx(req, fn)` which:
- Begins a DB transaction
- Sets `app.tenant_id`, `app.user_id`, `app.role`, `app.client_id` GUCs
- Runs your SQL via `tx` and commits/rolls back

Use Postgres policies that reference these GUCs to enforce multi-tenant access.

## API Overview

Full interactive docs: open `http://localhost:3000/docs` (Swagger UI).

Key endpoints:

- Auth
   - `POST /auth/login` – login and receive JWT
   - `GET /auth/me` – current auth context
- Tenants
   - `GET /tenants/me`
- Users
   - `GET /users/assignable?clientId=`
- Clients
   - `GET /clients` (limit, offset)
   - `GET /clients/:id`
   - `POST /clients`
   - `PATCH /clients/:id`
   - `POST /clients/:id/map-employee` (body: `{ userId }`)
- Projects
   - `GET /projects?clientId=`
   - `GET /projects/:id`
   - `POST /projects`
   - `PATCH /projects/:id`
- Streams
   - `GET /streams?projectId=`
   - `POST /streams`
   - `PATCH /streams/:id`
- Tickets
   - `GET /tickets` – filter: clientId, projectId, streamId, status[], assigneeId, search, tagIds[], limit, offset
   - `GET /tickets/:id`
   - `POST /tickets`
   - `PATCH /tickets/:id`
- Comments
   - `GET /tickets/:id/comments`
   - `POST /comments`
- Tags
   - `GET /tags?clientId=`
   - `POST /tags`
   - `DELETE /tags/:id`
- Attachments
   - `GET /tickets/:id/attachments` – includes presigned GET URLs
   - `POST /attachments` – multipart form-data: file + ticketId
   - `DELETE /attachments/:id`

## Error format

All errors return JSON `{ code, message }` with proper HTTP status codes.

## Try it

1) Login

```bash
curl -X POST http://localhost:3000/auth/login \
   -H 'content-type: application/json' \
   -d '{"email":"user@example.com","password":"secret"}'
```

2) Use the token

```bash
curl http://localhost:3000/clients \
   -H 'authorization: Bearer <ACCESS_TOKEN>'
```

## License

This project is licensed under the [MIT License](LICENSE).

## Author

Created by [Niels Van den Broeck](https://github.com/CodeCompanionBE).

## Acknowledgments

- [Fastify](https://www.fastify.io/) for the web framework.
- [TypeScript](https://www.typescriptlang.org/) for type safety.
- [Docker](https://www.docker.com/) for containerization.
