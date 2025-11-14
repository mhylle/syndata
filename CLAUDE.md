# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Syndata is a full-stack application for creating synthetic data for ML model training and evaluation with:
- **Backend**: NestJS (Node.js/TypeScript) REST API on port 3000
- **Frontend**: Angular 19 (TypeScript/SCSS) standalone components for data generation UI

## Project Structure

```
syndata/
├── backend/          # NestJS backend API for data generation
│   ├── src/         # Source code (controllers, services, modules)
│   └── test/        # E2E and unit tests
├── frontend/        # Angular frontend UI for generation configuration
│   └── src/         # Source code (components, services, routes)
├── docker/          # Docker configuration and database initialization
├── docker-compose.yml
└── package.json     # Root package (contains Angular CLI)
```

## Development Commands

### Quick Start (Recommended)

```bash
# Terminal 1: Start database only
docker compose up -d postgres

# Terminal 2: Start backend
cd backend && npm run start:dev

# Terminal 3: Start frontend
cd frontend && npm start

# Access the app at http://localhost:4200
# API docs at http://localhost:3000/api/docs
```

### Backend (NestJS)

Navigate to `backend/` directory for all backend operations:

```bash
cd backend

# Install dependencies
npm install

# Development
npm run start:dev     # Watch mode with auto-reload
npm run start:debug   # Debug mode with watch

# Build
npm run build         # Compile TypeScript to dist/
npm run start:prod    # Run compiled code from dist/

# Testing
npm run test          # Run all unit/integration tests
npm run test:watch    # Tests in watch mode
npm run test:cov      # Tests with coverage report
npm run test:e2e      # Run E2E tests
npm run test -- auth-service.integration.spec  # Run specific test file
npm run test -- --testNamePattern="specific test name"  # Run specific test

# Code Quality
npm run lint          # ESLint with auto-fix
npm run format        # Prettier formatting
```

**Test Database Setup:**
```bash
# Create test database (requires PostgreSQL running)
docker exec mynotes-postgres psql -U mynotes_user -d postgres -c "CREATE DATABASE mynotes_test;"
```

### Frontend (Angular)

Navigate to `frontend/` directory for all frontend operations:

```bash
cd frontend

# Install dependencies
npm install

# Development
npm start             # Start dev server (default: http://localhost:4200)

# Build
npm run build         # Production build to dist/frontend
npm run watch         # Development build with watch mode

# Testing
npm test              # Karma unit tests
ng test               # Angular CLI tests

# Code scaffolding (Angular CLI)
ng generate component features/my-feature/my-component
ng generate service shared/services/my-service
```

## API Documentation

The backend exposes Swagger API documentation:

```
http://localhost:3000/api/docs
```

This documentation is automatically generated from NestJS decorators and includes:
- All available endpoints
- Request/response schemas
- Authentication requirements (Bearer token)
- Try-it-out functionality

## Architecture Notes

### Backend (NestJS)

**Module Organization:**
- **Core modules** (`src/core/`): Essential features like auth, health checks, migrations
- **Common utilities** (`src/common/`): Shared filters, pipes, utilities
- **Config module** (`src/config/`): Environment and configuration management
- **Hello-world module**: Example feature module with controller and service

**Module Pattern:**
```
feature-module/
├── feature.module.ts          # Module definition with imports/providers
├── feature.controller.ts       # HTTP endpoints
├── feature.service.ts          # Business logic
├── dto/                        # Data Transfer Objects (validation DTOs)
├── guards/                     # NestJS guards (auth, roles)
├── interfaces/                 # TypeScript interfaces
└── strategies/                 # Passport strategies
```

**Key Patterns:**
- **Dependency injection**: Use constructor injection for all services
- **Validation**: DTOs with `class-validator` decorators for automatic validation
- **Error handling**: Global exception filter in `src/common/filters/http-exception.filter.ts`
- **Logging**: Winston logger via `nest-winston` integration
- **Database**: TypeORM with PostgreSQL; entities auto-synced in development

**Key Files:**
- **Entry point**: `src/main.ts` - Bootstraps application with validation, CORS, Swagger
- **Root module**: `src/app.module.ts` - Imports all feature modules
- **Database config**: `src/app.module.ts` - TypeORM configuration with async factory
- **Configuration**: `src/config/config.module.ts` - Centralized config management

### Frontend (Angular)

**Project Structure:**
```
src/app/
├── features/            # Feature modules with lazy-loaded routes
├── shared/              # Shared services, utilities, interceptors
├── core/                # Singleton services (auth, HTTP)
├── layout/              # Layout components (nav, header)
├── environments/        # Environment-specific configurations
├── app.routes.ts        # Main routing configuration
├── app.config.ts        # Application-wide providers (interceptors, etc.)
└── app.component.ts     # Root component
```

**Key Patterns:**
- **Standalone components**: Angular 19 standalone API (no NgModules)
- **Feature routing**: Lazy-loaded feature modules via `providers` in routes
- **Service organization**:
  - `core/`: Singleton services (auth, HTTP client)
  - `shared/`: Reusable services, pipes, directives
- **SCSS styling**: Component-scoped styles via `.component.scss`
- **Interceptors**: HTTP request/response handling via Angular interceptors
- **RxJS**: Reactive patterns with `Subject`, `Observable`, `async` pipe

**Key Files:**
- **Routing**: `src/app/app.routes.ts` - All route definitions and lazy loading
- **Config**: `src/app/app.config.ts` - Providers including HTTP interceptors
- **Environment**: `src/app/environments/environment.ts` - API endpoint configuration
- **Root**: `src/app/app.component.ts` - Router outlet and main layout

## Environment Configuration

The application uses Angular environment files for configuration across different deployment scenarios:

### Environment Files

Located in `frontend/src/environments/`:

- **`environment.ts`** - Default (local development)
  - Backend API: `http://localhost:3000`
  - Used when running frontend locally with `npm start`

- **`environment.docker.ts`** - Docker development
  - Backend API: `http://localhost:11002`
  - Used when running in Docker Compose
  - Configured via `angular.json` with `--configuration=docker`

- **`environment.production.ts`** - Production
  - Backend API: `/api` (relative URL)
  - Used for production builds
  - Assumes nginx reverse proxy handles routing

### Using Environments

**Local Development:**
```bash
cd frontend
npm start  # Uses environment.ts (backend on localhost:3000)
```

**Docker Development:**
```bash
docker compose up -d  # Uses environment.docker.ts (backend on localhost:11002)
```

**Production Build:**
```bash
cd frontend
npm run build  # Uses environment.production.ts (relative /api URL)
```

### Adding New Configuration

To add configuration values:
1. Add property to all environment files
2. Import in services: `import { environment } from '../environments/environment'`
3. Use in code: `environment.yourProperty`

## Authentication Configuration

The application supports **dual-mode authentication** for flexible development:

### Authentication Modes

1. **Local Mode** (Default for Development)
   - Uses centralized auth service at `https://mhylle.com/api/auth`
   - Allows development without local database user management
   - Shares users across all apps in mhylle.com infrastructure
   - Set `AUTH_MODE=local` in environment

2. **Production Mode**
   - Uses local PostgreSQL database for user management
   - Complete auth independence
   - Set `AUTH_MODE=production` in environment

### Configuration

**Backend Environment Variables** (`.env`):
```env
AUTH_MODE=local                              # 'local' or 'production'
AUTH_SERVICE_URL=https://mhylle.com/api/auth # External auth service URL
JWT_SECRET=your-secret-key-change-in-production
```

### Implementation Pattern

The backend uses a **factory provider pattern** to switch between auth services:
- `LocalAuthService` - Proxies requests to external auth service
- `ProductionAuthService` - Handles auth locally with database
- Both implement `IAuthService` interface for consistency

### Guest Usage

**By default, the application allows guest usage** - no login required:
- All features accessible without authentication
- Optional login for personalization
- User data tied to authenticated sessions when logged in

## Testing Strategy

- **Backend**: Jest for unit tests, separate config for E2E tests (`test/jest-e2e.json`)
- **Frontend**: Karma + Jasmine for unit tests
- Test files follow `*.spec.ts` naming convention for both projects

## Key Dependencies

- **Backend**: NestJS 11, TypeScript 5.7, RxJS 7.8
- **Frontend**: Angular 19, TypeScript 5.7, RxJS 7.8
- **Database**: PostgreSQL 17 with pgvector extension
- **Build tools**: SWC (backend), esbuild via Angular CLI (frontend)

## Docker Setup

### Port Configuration

- **Frontend**: Port 11001 (http://localhost:11001)
- **Backend**: Port 11002 (http://localhost:11002)
- **PostgreSQL**: Port 11003 (localhost:11003)

### Docker Compose Services

The project includes three Docker services:
1. **postgres**: PostgreSQL 17 with pgvector extension (required)
2. **backend**: NestJS API server (optional for development)
3. **frontend**: Angular dev server (optional for development)

### Common Docker Commands

```bash
# Start all services (database + backend + frontend)
docker compose up -d

# Start only the database (for local development)
docker compose up -d postgres

# View logs
docker compose logs -f [service_name]

# Stop all services
docker compose down

# Stop all services and remove volumes (deletes database data)
docker compose down -v

# Rebuild services after Dockerfile changes
docker compose up -d --build

# Check service status
docker compose ps
```

### Development Workflows

#### Option 1: Full Docker Setup

Run everything in Docker:

```bash
docker compose up -d
```

Access:
- Frontend: http://localhost:11001
- Backend: http://localhost:11002
- Database: localhost:11003

#### Option 2: Hybrid Development (Recommended)

Run only the database in Docker, develop backend and frontend locally:

```bash
# Start database only
docker compose up -d postgres

# In separate terminals:
cd backend && npm run start:dev      # Backend on port 3000
cd frontend && npm start              # Frontend on port 4200
```

For local development, backend connects to database at `localhost:11003`.
Copy `backend/.env.example` to `backend/.env` and adjust settings if needed.

#### Option 3: Database + One Service

Run database and backend in Docker, frontend locally:

```bash
docker compose up -d postgres backend
cd frontend && npm start
```

### Database Configuration

**PostgreSQL with pgvector**:
- Image: `pgvector/pgvector:pg17`
- Database: `mynotes`
- User: `mynotes_user`
- Password: `mynotes_password`
- Port: 11003
- Extension: pgvector (auto-enabled via `docker/init-db.sql`)

**Connecting to the database**:
```bash
# From host machine
psql -h localhost -p 11003 -U mynotes_user -d mynotes

# From within Docker network
psql -h postgres -p 5432 -U mynotes_user -d mynotes
```

### Environment Variables

**Backend** (`backend/.env` for local development):
- `NODE_ENV`: development
- `PORT`: 3000
- `DATABASE_HOST`: localhost (or postgres in Docker)
- `DATABASE_PORT`: 11003 (or 5432 in Docker)
- `DATABASE_NAME`: mynotes
- `DATABASE_USER`: mynotes_user
- `DATABASE_PASSWORD`: mynotes_password

### CORS Configuration

Backend is configured to accept requests from:
- http://localhost:11001 (Docker frontend)
- http://localhost:4200 (Local frontend)

### Notes

- Database volume `postgres_data` persists data between container restarts
- Backend and frontend use volume mounts in development for live code reloading
- The `pgvector` extension is automatically enabled on first database initialization
- Use `docker compose down -v` to completely reset the database

## Common Development Workflows

### Adding a New Feature (Backend)

1. **Create a new module** in `src/core/` or as a feature module
2. **Define DTOs** in `feature/dto/` for request/response validation
3. **Create entity** in database folder for TypeORM
4. **Implement service** with business logic
5. **Create controller** with HTTP endpoints
6. **Register module** in `src/app.module.ts`
7. **Add tests** (`.spec.ts` and `.e2e-spec.ts` files)
8. **Run tests**: `npm run test` and `npm run test:e2e`
9. **Check coverage**: `npm run test:cov`

### Adding a New Component (Frontend)

1. **Use Angular CLI**: `ng generate component features/my-feature/my-component`
2. **Implement component** as standalone with `standalone: true`
3. **Create service** if needed: `ng generate service shared/services/my-service`
4. **Add to routes** in `src/app/app.routes.ts`
5. **Import dependencies** in component's `imports: []` array
6. **Style with SCSS**: Component-scoped `.scss` file
7. **Add unit tests**: `*.spec.ts` following Angular testing patterns

### Running Tests Effectively

**Backend:**
```bash
cd backend

# All tests
npm run test

# Specific test file
npm run test -- auth-service.integration.spec

# Tests matching a pattern
npm run test -- --testNamePattern="should validate email"

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:cov

# E2E tests (requires test database)
npm run test:e2e
```

**Frontend:**
```bash
cd frontend

# Run all tests
npm test

# Watch mode (Karma)
npm test -- --watch
```

### Debugging

**Backend:**
```bash
cd backend

# Run in debug mode with watch
npm run start:debug

# Then connect debugger (Chrome DevTools, VS Code, etc.)
# Available at chrome://inspect
```

**Frontend:**
- Use Chrome DevTools (F12 in browser at http://localhost:4200)
- Source maps are available in development mode
- Use Angular DevTools extension for component inspection

### Database Management

**Check database state:**
```bash
# Connect to development database
docker exec mynotes-postgres psql -U mynotes_user -d mynotes

# View tables
\dt

# Query users (example)
SELECT * FROM "user";

# Exit
\q
```

**Reset database:**
```bash
# Stop and remove all volumes
docker compose down -v

# Start fresh
docker compose up -d postgres
```

**TypeORM synchronization:**
- In development (`NODE_ENV !== 'production'`), database schema auto-syncs with entities
- In production, you must handle migrations manually
- See `src/core/migrations/` for any custom migration scripts

## Code Organization Guidelines

### Backend

- **Controllers**: HTTP endpoint definitions with request validation
- **Services**: Business logic, database operations, external integrations
- **DTOs**: Input/output validation using `class-validator`
- **Entities**: TypeORM models mapped to database tables
- **Guards**: Authentication and authorization logic
- **Interfaces**: Type contracts for services
- **Strategies**: Passport authentication strategies

### Frontend

- **Components**: UI presentation (`.component.ts`, `.component.html`, `.component.scss`)
- **Services**: Data fetching, state management (typically in `shared/` or `core/`)
- **Interceptors**: HTTP request/response middleware
- **Routes**: Navigation and lazy-loaded module definitions
- **Environments**: Deployment-specific configuration

## Testing Guidelines

### Backend

- **Unit tests**: Test individual services with mocked dependencies (`.spec.ts`)
- **Integration tests**: Test services with real database or mock repository (`.integration.spec.ts`)
- **E2E tests**: Test full API flows with real database (`.e2e-spec.ts`)
- **Coverage**: Aim for >80% on critical paths; exclude DTOs, modules, main.ts

### Frontend

- **Unit tests**: Test component logic, service methods using Karma + Jasmine
- **Test bed**: Set up testing module with required providers and dependencies
- **Async**: Use `fakeAsync`, `tick`, or `async` for time-dependent tests
- **HttpClientTestingModule**: Mock HTTP requests in tests