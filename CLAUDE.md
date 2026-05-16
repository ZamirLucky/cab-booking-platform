# Claude Code Instructions

@../../00_CLAUDE_OS/ABOUT_ME.md
@../../00_CLAUDE_OS/ANTI_AI_STYLE.md
@../../00_CLAUDE_OS/ASSIGNMENT_REQUIREMENTS_MAP.md
@../../00_CLAUDE_OS/DECISION_LOG.md
@../../00_CLAUDE_OS/REFERENCES.md
@../../00_CLAUDE_OS/PROJECT_INSTRUCTIONS.md

## Project

This folder contains the actual Cab Booking Platform assignment implementation.

## Source of Truth

The official assignment brief is the source of truth. Lecturer notes are reference material. This project code must be original work.

## Required Architecture

```text
web-app
  ↓
gateway-service
  ↓
customer-service
booking-service
payment-service
fare-estimation-service
location-service
  ↓
Google Cloud SQL PostgreSQL
```

## Required Stack

Backend:
- Node.js
- Express.js
- Axios
- PostgreSQL
- pg or Prisma
- dotenv
- cors
- bcrypt
- jsonwebtoken

Frontend:
- HTML
- Bootstrap
- Vanilla JavaScript
- Fetch API

Deployment:
- Docker
- Google Cloud Run
- Google Artifact Registry
- Google Cloud SQL PostgreSQL

## Folder Rules

Do not edit:
- lecturer notes
- classwork folders
- assignment brief files

Generated notes and drafts should go into:
- `docs/`
- `../../OUTPUTS/`

Final implementation code should go into:
- `services/`
- `web-app/`
- `shared/`

## Middleware Rules

There is no separate middleware service.

Use Express middleware inside the Gateway and inside protected microservices.

Gateway:
- `cors`
- `express.json`
- `requireAuth`
- `forwardAuthHeader`
- `errorHandler`

Microservices:
- `cors`
- `express.json`
- `requireAuth`
- validation middleware
- `errorHandler`

JWT verification must happen:
1. in the Gateway for protected routes
2. again inside protected microservices

## Database Rules

Use Google Cloud SQL PostgreSQL.

Use relational columns for stable data.

Use JSONB only for:
- external API response snapshots
- payment calculation breakdowns
- notification payloads
- weather snapshots

Do not store all data as unstructured JSON.

## Frontend Rules

Use:
- HTML
- Bootstrap
- Vanilla JavaScript
- Fetch API
- Bootstrap/HTML5 validation

Do not use React unless explicitly requested later.

## Documentation Rule

When implementing a feature, update the relevant file under `docs/`.

Each documentation update should include:
- decision
- reason
- assignment task supported
- source/documentation
- test instructions

## Security Rules

Never commit:
- `.env`
- API keys
- JWT secrets
- database passwords
- Google Cloud credentials

## Required Response Pattern

When making changes:
1. Summarise the goal.
2. State assignment tasks supported.
3. Explain files changed.
4. Provide test instructions.
5. Mention docs updated.
6. Suggest a Git commit message.
