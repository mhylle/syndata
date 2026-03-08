# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Syndata is a full-stack application for creating synthetic data for ML model training and evaluation.

- **Backend**: NestJS (TypeScript) REST API on port 3000
- **Frontend**: Angular 19 (TypeScript/SCSS) standalone components on port 4205
- **Database**: PostgreSQL 17 with pgvector extension
- **AI**: Ollama integration for AI-powered schema and data generation

## Quick Start (Hybrid Development — Recommended)

```bash
# Terminal 1: Start database only
docker compose up -d postgres

# Terminal 2: Start backend (from backend/)
cd backend && npm run start:dev

# Terminal 3: Start frontend (from frontend/)
cd frontend && npm start
```

- App: http://localhost:4205
- API docs (Swagger): http://localhost:3000/api/docs

## Development Commands

### Backend (`cd backend`)

```bash
npm run start:dev                              # Watch mode
npm run start:debug                            # Debug mode (chrome://inspect)
npm run build                                  # Compile to dist/
npm run lint                                   # ESLint with auto-fix
npm run format                                 # Prettier

# Testing (Jest)
npm run test                                   # All unit/integration tests
npm run test -- auth-service.integration.spec  # Specific test file
npm run test -- --testNamePattern="pattern"    # Tests matching pattern
npm run test:watch                             # Watch mode
npm run test:cov                               # With coverage
npm run test:e2e                               # E2E (requires test DB)
```

### Frontend (`cd frontend`)

```bash
npm start                                      # Dev server on port 4205
npm run build                                  # Production build
npm test                                       # Karma unit tests
ng generate component features/my-feature/name # Scaffold component
```

## Architecture

### Backend (NestJS)

**Simplified module architecture** — all feature modules are registered directly in `app.module.ts` rather than having separate `*.module.ts` per feature. Controllers and services are imported and listed in the main `AppModule`.

**Source layout:**
- `src/app.module.ts` — Root module with all entity, controller, and service registrations
- `src/main.ts` — Bootstrap with ValidationPipe, CORS, Swagger, Winston logger
- `src/config/configuration.ts` — Centralized env-based config (database, auth, CORS, rate limiting)
- `src/core/` — Auth module (factory pattern for local/production mode), health checks, migrations
- `src/common/` — Global exception filter, logging module
- `src/features/` — Feature code organized by domain:
  - `projects/` — Project CRUD
  - `datasets/` — Dataset and element management
  - `generation/` — AI-powered data generation pipeline (see below)
  - `notes/` — Legacy, not registered in AppModule
- `src/shared/entities/` — All TypeORM entities (Project, Dataset, Element, GenerationJob, Record, ElementInstance, FieldValue, Annotation, SyntheticSchema, User)

**Data generation pipeline:**
1. `SchemaGeneratorService` — AI schema generation via Ollama
2. `SchemaParserService` — Parse and validate AI-generated schemas
3. `PatternAnalyzerService` — Analyze data patterns
4. `SimpleDataGeneratorService` — Generate data using @faker-js/faker
5. `AnnotationService` / `ValidationService` — Post-generation annotation and validation

**Key patterns:**
- Constructor-based dependency injection
- DTOs with `class-validator` for request validation (whitelist + forbidNonWhitelisted)
- Global `HttpExceptionFilter` for error handling
- Winston logger via `nest-winston`
- TypeORM with auto-sync in development (entities auto-discovered via glob)

### Frontend (Angular 19)

**All components use standalone API** (no NgModules). Lazy-loaded routes in `app.routes.ts`.

**Source layout:**
- `src/app/app.routes.ts` — Route definitions with lazy loading
- `src/app/app.config.ts` — Providers (router, HTTP client with auth interceptor, APP_INITIALIZER)
- `src/app/layout/` — Main layout wrapper
- `src/app/core/auth/` — AuthService, auth interceptor, login dialog
- `src/app/features/` — Feature components:
  - `dashboard/` — Main dashboard
  - `projects/` — Project list/detail/form
  - `datasets/` — Dataset list/detail, AI schema generator, data generation config
  - `generation/` — Generation UI, records viewer, results explorer
- `src/environments/` — Environment configs (local, docker, production)

**Key patterns:**
- Standalone components with inline imports
- RxJS reactive patterns with `async` pipe
- HTTP interceptor for auth token injection
- SCSS component-scoped styles

## Database

**Docker PostgreSQL** with pgvector:

```bash
docker compose up -d postgres     # Start
docker compose down -v            # Reset (destroys data)
```

**Connection:** `localhost:5433` (mapped from container port 5432)
- Database: `syndata`, User: `syndata_user`, Password: `syndata_password`

```bash
docker exec syndata-postgres psql -U syndata_user -d syndata
```

TypeORM auto-syncs schema with entities in development. No manual migrations needed.

**Test database:**
```bash
docker exec syndata-postgres psql -U syndata_user -d postgres -c "CREATE DATABASE syndata_test;"
```

## Docker Ports

| Service    | Host Port | Container Port |
|------------|-----------|----------------|
| Frontend   | 11001     | 4205           |
| Backend    | 11002     | 3000           |
| PostgreSQL | 5433      | 5432           |

Full Docker: `docker compose up -d` — access frontend at http://localhost:11001, backend at http://localhost:11002.

## Authentication

Dual-mode auth via factory provider pattern:
- **Local mode** (`AUTH_MODE=local`): Proxies to external auth service (`AUTH_SERVICE_URL`)
- **Production mode** (`AUTH_MODE=production`): Uses local PostgreSQL for user management

Guest usage is allowed by default — no login required for any feature.

## Environment Configuration

**Backend** (`backend/.env`, copy from `.env.example`):
```env
DATABASE_HOST=localhost
DATABASE_PORT=5433
AUTH_MODE=local
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

**Frontend environments** (`frontend/src/environments/`):
- `environment.ts` — Local dev, API at `http://localhost:3000`
- `environment.docker.ts` — Docker dev, API at `http://localhost:11002`
- `environment.production.ts` — Production, API at `/api` (relative)

## Ollama (AI Data Generation)

Configure in `backend/.env`:
```env
OLLAMA_URL=http://localhost:11434    # Local
OLLAMA_MODEL=llama3.1:8b            # Local (8B params)

# Or for work (H100 GPU):
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=llama3.3
```

Check available models: `curl http://localhost:11434/api/tags`

## Key Dependencies

- **Backend**: NestJS 11, TypeORM, @faker-js/faker, Ollama SDK, Passport + JWT, Winston, SWC
- **Frontend**: Angular 19, RxJS, Karma + Jasmine
- **Database**: PostgreSQL 17 + pgvector
