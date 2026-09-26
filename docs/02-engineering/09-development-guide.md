# Development Guide

## 1. Overview

This document defines the standard development environment, setup process, coding workflow, Git workflow, and development practices for Nimbus.

Nimbus is developed and run as a Docker Compose application. The primary development environment consists of separate containers for:

- Nginx
- Frontend
- Backend
- PostgreSQL

The Backend also requires access to the host Docker Engine through the Docker socket so that Nimbus can build and manage application containers.

The development environment is designed so that source-code changes are reflected in running containers without repeatedly stopping and recreating the entire Compose stack.

---

# 2. Prerequisites

Nimbus is designed to run through Docker, so the host operating system is not a project-level requirement.

### Required

- Docker
- Docker Compose
- Git
- GitHub account
- GitHub OAuth Application
- Code editor such as VS Code

### Recommended

- VS Code
- Postman or equivalent API client
- pgAdmin or another PostgreSQL client
- Browser with developer tools

### Development environment

The project should be developed using a Docker-enabled environment.

The currently tested development environment is:

```
Windows 11
    +
WSL2
    +
Docker Desktop
```

Other operating systems are supported as long as they provide a compatible Docker and Docker Compose environment.

---

# 3. Repository Structure

The repository is organized into major directories rather than organizing the project around individual files.

```
nimbus/
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── docker-compose.yml
│
├── docs/
│   ├── README.md
│   ├── 00-project-foundation/
│   ├── 01-system-specification/
│   ├── 02-engineering/
│   └── 03-project-memory/
│
├── frontend/
│
├── backend/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── scripts/
│
├── infrastructure/
│   ├── docker/
│   └── nginx/
│
├── tests/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
│
├── scripts/
│
└── .github/
    └── workflows/
```

### Directory responsibilities

| Directory | Purpose |
| --- | --- |
| `frontend/` | React + Vite + TypeScript frontend |
| `backend/` | Node.js + Express + TypeScript backend |
| `database/` | Database migrations, seeds, and database-related scripts |
| `infrastructure/` | Docker and Nginx configuration |
| `tests/` | Integration, E2E, and test fixture resources |
| `scripts/` | Project-level development and maintenance scripts |
| `docs/` | Project documentation |
| `.github/` | GitHub workflows and repository configuration |

---

# 4. Local Setup

Nimbus is developed as a Docker Compose stack.

The normal development flow is:

```
Clone repository
      ↓
Create .env
      ↓
Configure GitHub OAuth
      ↓
Start Docker
      ↓
docker compose up --build
      ↓
Database becomes healthy
      ↓
Backend starts
      ↓
Frontend + Nginx start
      ↓
Open http://localhost
```

### Clone the repository

```bash
git clone <repository-url>
cd nimbus
```

### Create environment configuration

Copy the example environment file:

```bash
cp .env.example .env
```

On Windows, the equivalent can be performed using the file explorer or PowerShell.

Populate the required values in `.env`.

### Start Nimbus

```bash
docker compose up --build
```

Nimbus should then be accessed through:

```
http://localhost
```

Nginx is the single development entry point.

---

# 5. Environment Variables

Nimbus uses a single root environment file:

```
.env
```

A safe template is maintained as:

```
.env.example
```

No separate `.env` files are maintained inside individual services.

Docker Compose controls which environment variables are passed to each container.

Conceptually:

```
Root .env
    │
    ▼
docker-compose.yml
    │
    ├── PostgreSQL variables → PostgreSQL
    ├── Backend variables    → Backend
    └── Frontend variables   → Frontend
```

Each service should receive only the variables it requires.

### Typical variable groups

#### Database

```
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
DATABASE_URL
```

#### GitHub OAuth

```
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
GITHUB_CALLBACK_URL
```

#### Application

```
NODE_ENV
API_BASE_URL
```

#### Session / authentication

```
SESSION_SECRET
```

The exact variable names and values are defined by the implementation.

### Rules

- `.env` must never be committed.
- `.env.example` must not contain real secrets.
- Secrets must not be hardcoded in source code.
- Containers must receive only the environment variables they require.
- Production secrets must be configured separately from development secrets.

---

# 6. GitHub OAuth Development Configuration

Nimbus uses GitHub OAuth for authentication.

During local development, the OAuth callback is routed through Nginx to the Backend.

```
Browser
   │
   ▼
Nginx
   │
   ▼
Backend
   │
   ▼
GitHub
   │
   │ OAuth callback
   ▼
Nginx
   │
   ▼
Backend
```

The local callback follows the public Nimbus development URL:

```
http://localhost/api/v1/auth/github/callback
```

This callback URL must be configured in the GitHub OAuth Application.

The callback URL should not point directly to the internal Backend container.

---

# 7. Dependency Installation

Dependencies are installed and managed inside the respective service environments.

### Frontend

The Frontend uses:

```
React
Vite
TypeScript
TSX
ESLint
Prettier
```

### Backend

The Backend uses:

```
Node.js
Express
TypeScript
ESLint
Prettier
```

Dependencies should be declared in the respective service's package configuration.

The Docker build process installs the required dependencies inside the appropriate containers.

Developers should avoid relying on globally installed Node.js packages.

---

# 8. Running the Project

The complete Nimbus development environment is started using:

```bash
docker compose up --build
```

This starts the main services:

```
Nginx
Frontend
Backend
PostgreSQL
```

The services communicate over the Docker Compose network.

### Normal access

Nimbus is accessed through:

```
http://localhost
```

Nginx routes requests to the appropriate internal service.

For example:

```
http://localhost/
        ↓
Frontend

http://localhost/api/v1/...
        ↓
Backend
```

The internal service ports should not be exposed directly to the host for normal application access.

---

# 9. Running Individual Services

The normal development workflow starts the complete Compose stack.

Individual services can be started or rebuilt when debugging or developing a specific part of the system.

Examples:

```bash
docker compose up backend
```

```bash
docker compose up frontend
```

```bash
docker compose up postgres
```

```bash
docker compose up nginx
```

A service can be rebuilt individually when its image configuration or dependencies change:

```bash
docker compose up --build backend
```

The normal application entry point remains Nginx.

---

# 10. Database Setup

PostgreSQL runs inside its own Docker container.

The database uses a persistent Docker named volume.

```
PostgreSQL Container
        │
        ▼
Docker Named Volume
        │
        ▼
Persistent Database Data
```

The database should survive normal Compose shutdowns.

```bash
docker compose down
```

does not remove the database volume.

To intentionally remove the database volume:

```bash
docker compose down -v
```

This destroys the development database data and should only be used when a clean database is intentionally required.

---

# 11. Database Health

Other services that depend on PostgreSQL should wait for the PostgreSQL container to become healthy before starting.

Conceptually:

```
PostgreSQL starts
      ↓
Health check
      ↓
Database healthy
      ↓
Backend starts
```

Docker Compose health checks and service dependencies are used to implement this behavior.

Application-level database retry handling should still be implemented where appropriate.

---

# 12. Migrations

Database schema changes are managed through migrations.

The migration source is:

```
database/migrations/
```

Migration order follows the data model dependency order:

```
users
  ↓
sessions
  ↓
projects
  ↓
deployments
```

A new schema change should be introduced through a new migration rather than directly modifying an already-applied migration.

### Development migration workflow

```
Change data model
      ↓
Create migration
      ↓
Run migration
      ↓
Verify schema
      ↓
Update affected backend code
      ↓
Test
```

Migration commands will be provided by the database tooling configured for the Backend.

---

# 13. Seed Data

Development seed data is stored under:

```
database/seeds/
```

Seed data is intended only for development and testing.

It may be used to create predictable records for:

- Users
- Projects
- Deployments
- Other development fixtures

Real credentials, OAuth secrets, or production data must never be included in seeds.

---

# 14. Docker Setup

Docker is the primary development environment for Nimbus.

The main services are:

```
┌─────────────────────────────────────┐
│          Docker Compose             │
│                                     │
│  ┌─────────┐  ┌─────────┐          │
│  │  Nginx  │  │Frontend │          │
│  └────┬────┘  └────┬────┘          │
│       │             │               │
│       └──────┬──────┘               │
│              ▼                      │
│         ┌──────────┐                │
│         │ Backend  │                │
│         └────┬─────┘                │
│              │                      │
│       ┌──────┴──────┐               │
│       ▼             ▼               │
│ PostgreSQL     Docker Socket        │
│       │             │               │
└───────┼─────────────┼───────────────┘
        │             │
        ▼             ▼
   DB Volume     Host Docker Engine
                      │
                      ▼
                App Containers
```

### Host Docker Engine access

The Backend container receives access to the host Docker Engine through the Docker socket.

This allows Nimbus to:

- Build application images
- Create application containers
- Start containers
- Stop containers
- Inspect containers
- Retrieve container logs
- Manage deployment runtime state

The Docker socket is intentionally mounted into the Backend container as part of the Semester 1 architecture.

This introduces significant host-level privileges and is documented further in `10-security.md`.

---

# 15. Development Volumes and Live Reload

Live development is a core requirement of the Nimbus development environment.

Source code should be bind-mounted into the appropriate development containers so that changes made on the host are immediately visible inside the running containers.

```
Host source code
       │
       │ Bind mount
       ▼
Development container
       │
       ▼
Development process
       │
       ▼
Hot reload / automatic restart
```

### Frontend

Frontend source changes should be detected by the Vite development server.

```
Edit React/TSX file
       ↓
Vite detects change
       ↓
Frontend reloads
```

### Backend

Backend source changes should be detected by the TypeScript development process.

```
Edit TypeScript file
       ↓
Development watcher detects change
       ↓
Backend process restarts
```

### Important development rule

Normal source-code changes must **not require**:

```bash
docker compose down
docker compose up
```

or repeatedly recreating the entire stack.

The expected workflow is:

```
Edit code
   ↓
Save
   ↓
Container sees change
   ↓
Dev process reloads/restarts
   ↓
Test change
```

### When rebuilding is required

A container rebuild may be required when changes affect:

- Dockerfiles
- Installed dependencies
- package lock files
- system packages
- container-level configuration
- build configuration
- Compose configuration

In those cases:

```bash
docker compose up --build
```

can be used.

The goal is to **avoid rebuilds for ordinary source-code changes**.

---

# 16. Development Workflow

The standard development loop is:

```
Create feature branch
       ↓
Understand requirement
       ↓
Implement change
       ↓
Run development environment
       ↓
Test locally
       ↓
Inspect logs / debug
       ↓
Run automated tests
       ↓
Commit changes
       ↓
Push branch
       ↓
Open Pull Request
       ↓
Self-review
       ↓
Merge into main
```

The development environment should normally remain running while actively developing.

Source changes should be reflected through development volumes and hot reload/watch processes.

---

# 17. Git Workflow

Nimbus uses Git for source control.

The primary stable branch is:

```
main
```

Development work is performed on short-lived branches.

```
main
 │
 ├── feature/github-auth
 ├── feature/project-management
 ├── feature/deployment-engine
 └── feature/log-viewer
```

Changes are merged into `main` through Pull Requests.

Even though Nimbus is a solo project, Pull Requests are retained to provide:

- Reviewable change history
- Structured development workflow
- Clear feature boundaries
- Useful project history

---

# 18. Branching Strategy

The primary branch types are:

```
feature/*
fix/*
chore/*
```

### Feature

Used for new functionality.

```
feature/github-oauth
feature/deployment-cancellation
```

### Fix

Used for correcting existing behavior.

```
fix/project-access-error
fix/docker-health-check
```

### Chore

Used for maintenance or non-functional changes.

```
chore/update-dependencies
chore/configure-eslint
```

Branches should be short-lived and focused on a single logical change.

---

# 19. Commit Conventions

Nimbus uses Conventional Commit-style messages.

### Format

```
<type>: <description>
```

### Common types

| Type | Purpose |
| --- | --- |
| `feat` | New functionality |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | Code restructuring without behavior change |
| `test` | Tests |
| `chore` | Maintenance/configuration |

### Examples

```
feat: add GitHub OAuth login
feat: add project creation API
feat: implement deployment cancellation
fix: handle failed Docker builds
fix: prevent cross-user project access
docs: update deployment flow
refactor: simplify deployment service
test: add project API tests
chore: configure ESLint and Prettier
```

Commits should represent a coherent change rather than unrelated modifications.

---

# 20. Pull Request Guidelines

Every feature or significant fix should be merged through a Pull Request.

For solo development, the workflow is:

```
Feature branch
      ↓
Push branch
      ↓
Create PR
      ↓
Self-review
      ↓
Verify tests
      ↓
Merge
      ↓
Delete branch
```

Before merging, verify:

- The change matches the requirement.
- Existing functionality still works.
- Tests pass.
- No secrets were committed.
- No unnecessary files were included.
- Documentation is updated where necessary.
- The change does not violate established architecture decisions.

---

# 21. Code Style

Nimbus uses TypeScript throughout the Frontend and Backend.

### Frontend

```
React
Vite
TypeScript
TSX
ESLint
Prettier
```

### Backend

```
Node.js
Express
TypeScript
ESLint
Prettier
```

### Formatting

Prettier is responsible for consistent formatting.

ESLint is responsible for identifying code-quality and TypeScript/JavaScript issues.

Developers should not manually maintain formatting rules that are already enforced by the tooling.

---

# 22. Naming Conventions

### TypeScript / JavaScript

Use:

```
camelCase
```

for variables and functions.

Examples:

```
projectId
getProject()
createDeployment()
deploymentStatus
```

Use:

```
PascalCase
```

for React components, classes, and major type definitions where appropriate.

Examples:

```
ProjectCard
DeploymentStatus
GitHubClient
```

### Constants

Use descriptive names and follow the project's configured TypeScript/ESLint conventions.

### Database

Use:

```
snake_case
```

Examples:

```
user_id
project_id
created_at
deleted_at
github_repository_id
```

### API

Use plural resource names:

```
/api/v1/projects
/api/v1/deployments
```

### Environment variables

Use:

```
UPPER_SNAKE_CASE
```

Examples:

```
DATABASE_URL
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
SESSION_SECRET
```

### Git branches

Use lowercase descriptive names:

```
feature/github-oauth
feature/project-management
fix/deployment-status
```

---

# 23. Debugging

Nimbus can be debugged at multiple layers.

### Frontend

Use:

- Browser Developer Tools
- Vite development output
- VS Code debugger
- Network inspection

### Backend

Use:

- Backend container logs
- VS Code debugger
- Application logs
- API client such as Postman

### Docker

Useful commands include:

```bash
docker compose ps
```

```bash
docker compose logs
```

```bash
docker compose logs backend
```

```bash
docker compose logs frontend
```

```bash
docker compose logs postgres
```

```bash
docker compose logs nginx
```

```bash
docker ps
```

Container inspection and shell access may be used when necessary.

### Database

Database problems can be investigated using:

- PostgreSQL logs
- pgAdmin
- SQL queries
- Migration status
- Backend database errors

---

# 24. Common Development Problems

This section is intentionally lightweight and will be expanded as real development issues are discovered.

Initial problems to consider include:

### Docker unavailable

Verify that Docker Engine / Docker Desktop is running.

### Container fails to start

Check:

```bash
docker compose ps
docker compose logs <service>
```

### Database unavailable

Check:

- PostgreSQL container status
- PostgreSQL health check
- `DATABASE_URL`
- Docker Compose network
- Database credentials

### GitHub OAuth fails

Check:

- GitHub Client ID
- GitHub Client Secret
- OAuth callback URL
- Nginx routing
- Backend environment variables

### Backend cannot access Docker

Check:

- Docker socket mount
- Backend container permissions
- Docker Engine availability
- Docker-related configuration

### Code changes are not reflected

Check:

- Bind mounts
- Development watcher
- Vite configuration
- TypeScript watcher
- Container logs

Normal source-code changes should not require recreating the entire Compose stack.

---

# 25. Adding a New Feature

New features should follow a practical development process.

```
Requirement
    ↓
Understand existing architecture
    ↓
Identify affected components
    ↓
Check database impact
    ↓
Implement backend changes
    ↓
Implement API changes
    ↓
Implement frontend changes
    ↓
Add / update tests
    ↓
Manual verification
    ↓
Update documentation
    ↓
Commit
    ↓
Pull Request
    ↓
Self-review
    ↓
Merge
```

Not every feature requires every step.

For example, a documentation-only change does not require database or frontend changes.

The purpose of the workflow is to ensure that changes affecting multiple parts of Nimbus are considered across the appropriate layers.

---

# 26. Definition of Done

A feature or significant change is considered complete when applicable items below have been satisfied.

### Requirement

- [ ]  Requirement is clearly understood.
- [ ]  Implementation matches the intended behavior.
- [ ]  Existing architecture decisions are respected.

### Implementation

- [ ]  Backend implemented where required.
- [ ]  Frontend implemented where required.
- [ ]  Database changes implemented where required.
- [ ]  API changes implemented where required.
- [ ]  Validation and error handling implemented.

### Security

- [ ]  Authentication requirements considered.
- [ ]  Authorization / ownership checks implemented.
- [ ]  Secrets are not exposed or committed.
- [ ]  Security-sensitive changes are reviewed.

### Testing

- [ ]  Relevant automated tests added or updated.
- [ ]  Manual testing completed.
- [ ]  Existing tests pass.
- [ ]  Relevant failure scenarios checked.

### Documentation

- [ ]  Relevant documentation updated.
- [ ]  New development/setup requirements documented.
- [ ]  Architecture documentation updated if an approved architectural decision changed.

### Git

- [ ]  Changes committed using the project's commit convention.
- [ ]  Pull Request created where appropriate.
- [ ]  Self-review completed.
- [ ]  Pull Request merged into `main`.

### Final

- [ ]  No known critical errors remain.
- [ ]  Feature behaves correctly in the Docker Compose development environment.
- [ ]  Source-code changes work through the configured development volumes/hot reload workflow.