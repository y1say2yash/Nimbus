# Architecture Overview

Nimbus follows a **single-host architecture**, where the entire platform and all deployed applications run on a single Linux machine.

The platform acts as an orchestration layer between developers, GitHub, and Docker Engine.

Nimbus itself does not execute applications directly. Instead, it coordinates the deployment process by retrieving source code from GitHub, building Docker images, creating Docker containers, and managing their lifecycle through Docker Engine.

All user applications are deployed as isolated Docker containers on the same host machine. Nimbus maintains ownership of deployment metadata, project configuration, and deployment history, while Docker remains responsible for image management, container execution, networking, and runtime state.

This architecture intentionally prioritizes simplicity over scalability, allowing the project to focus on understanding deployment fundamentals before introducing distributed systems and cloud-native concepts.

This document identifies the major elements of Nimbus using the C4 Model. It serves as a reference while creating the System Context, Container, and Component diagrams.

---

# 1. System Context Diagram (C4 Level 1)

 **Purpose:** Shows who interacts with Nimbus and the external systems it depends upon.

```
                       +----------------------+
                       |      Developer       |
                       +----------------------+
                                  │
                                  │ Uses
                                  ▼
    ┌──────────────────────────────────────────────────┐
    │                      Nimbus                      │
    │    Self-Hosted Continuous Deployment Platform    │
    └──────────────────────────────────────────────────┘
      ▲                    ▲                        │
      │                    │                        │
      │ Authenticates      │ Builds & Manages       │ Deploys &
      │ & Clones Repos     │ Containers             ▼ Runs
+--------------------+  +----------------------+  +-----------------------+
|      GitHub        |  |    Docker Engine     |  | Deployed Applications |
+--------------------+  +----------------------+  +-----------------------+
```

## Developer (Primary Actor)

The developer is the primary user of Nimbus.

Responsibilities:

- Register/Login (GitHub OAuth)
- Create and manage projects
- Connect Git repositories
- Trigger deployments
- View deployment history
- Monitor running applications
- View logs
- Restart, stop and redeploy applications

---

## External Systems

### GitHub

GitHub acts as the source code provider.

Nimbus interacts with GitHub to:

- Authenticate users
- Access user repositories
- Clone repositories
- Retrieve repository metadata
- Read commit and branch information

GitHub remains the source of truth for repository data.

---

### Docker Engine

Docker Engine performs all container-related operations.

Nimbus uses Docker Engine to:

- Build Docker images
- Create containers
- Start containers
- Stop containers
- Restart containers
- Remove containers
- Inspect containers
- Stream container logs

Docker remains the source of truth for images and containers.

---

### Deployed Applications

Once deployed, applications run independently of Nimbus.

Nimbus:

- Deploys the application
- Records deployment history
- Provides the application's URL

End users interact directly with the deployed application rather than through Nimbus.

---

## Browser (Optional)

The browser is simply the client through which developers access Nimbus.

It is generally **not modeled as an external software system** in the C4 System Context Diagram because it is only the delivery mechanism for the user interface.

---

# 2. Container Diagram (C4 Level 2)

**Purpose:** Describes the major applications and services that together make up Nimbus.

```
                          +----------------+
                          |   Developer    |
                          +----------------+
                                  │ Interacts 
                                  ▼ with
                          +----------------+
                          |    Browser     |
                          +----------------+
                                  │ 
                                  ▼
                          +----------------+
                          |     Nginx      |
                          | Reverse Proxy  |
                          +----------------+
                             │         │
                   Serves UI │         │ Routes Requests
                             ▼         ▼
                  +----------------+   +----------------------+
                  | React Frontend |   | Running Applications |
                  |     (Vite)     |   |  Docker Containers    |
                  +----------------+   +----------------------+
                           │
                     REST API Calls
                           ▼
               +-------------------------+
               |     Express Backend     |
               |      (Node.js API)      |
               +-------------------------+
                            │
                ┌──────────────────┐───────────────────┐
                │                  │                   │
                ▼                  ▼                   ▼
         +--------------+  +----------------+  +----------------+
         | PostgreSQL   |  | Docker Engine  |  |    GitHub      |
         | Platform DB  |  |   External     |  |    External    |
         +--------------+  +----------------+  +----------------+
```

## React Frontend

Technology

- React
- Vite
- Tailwind CSS

Responsibilities

- Authentication UI
- Dashboard
- Project Management
- Deployment Management
- Logs Viewer
- User Settings

Communicates with the Backend API.

---

## Backend API

Technology

- Node.js
- Express

Responsibilities

- Business logic
- Authentication
- Deployment orchestration
- Git integration
- Docker integration
- Database access
- REST API

This is the core of the Nimbus platform.

---

## PostgreSQL

Stores all Nimbus-owned data.

Examples include:

- Users
- Projects
- Repository Connections
- Deployment History
- Build History
- Environment Variables
- Platform Events
- User Settings

GitHub and Docker remain the source of truth for their respective domains.

---

## Nginx

Responsibilities

- Reverse proxy for Nimbus
- Request routing
- SSL termination (future)
- Reverse proxy for deployed applications (future)

---

## Docker Engine (External)

Provides container runtime.

Responsibilities

- Build Images
- Manage Containers
- Runtime Logs
- Container Inspection

---

## GitHub (External)

Stores application source code and repository metadata.

---

## Deployed Applications

Represents deployed user applications managed by Docker Engine.

These applications execute independently after deployment.

---

# 3. Backend Component Diagram (C4 Level 3)

## Purpose

**Purpose:** Shows the internal modules that make up the Backend API. This ensures each module has a single responsibility.

```
                     +--------------------------------+
                     |        Backend API             |
                     |    Controllers / Routes        |
                     +--------------------------------+
                                    │
                                    ▼
                     +-------------------------------+
                     |     Authentication Service    |
                     +-------------------------------+
                                    │
                 ┌──────────────────┴────────────────┐
                 ▼                                   ▼
      +----------------------+            +----------------------+
      |   Project Service    |            |    User Service      |
      +----------------------+            +----------------------+
                 │
                 ▼
      +-------------------------------+
      |      Deployment Engine        |
      | (Deployment Orchestrator)     |
      +-------------------------------+
          │             │             │
          ▼             ▼             ▼
 +---------------+ +---------------+ +---------------+
 |  Git Service  | | Build Service | | Runtime Svc   |
 +---------------+ +---------------+ +---------------+
          │              │               │
          │              │               │
          └───────┬──────┴───────┬───────┘
                  ▼              ▼
          +-------------------------------+
          |         Docker Service        |
          | (Wrapper around Docker API)   |
          +-------------------------------+
                      │
                      ▼
             +------------------+
             |  Docker Engine   |
             |    External      |
             +------------------+
```

```
          +-----------------------------------------------+
          |             Logging Service                   |
          +-----------------------------------------------+
                                ▲
                                │
                  Build Service │ Runtime Service
                                │
                                ▼
```

```
          +-----------------------------------------------+
          |              Database Layer                   |
          |-----------------------------------------------|
          | • User Repository                             |
          | • Project Repository                          |
          | • Repository Repository                       |
          | • Deployment Repository                       |
          | • Build Repository                            |
          | • Container Repository                        |
          | • Log Repository                              |
          +-----------------------------------------------+
                          │
                          ▼
                 +----------------------+
                 |     PostgreSQL       |
                 +----------------------+
```

## API Layer

Responsibilities

- Route handling
- Request validation
- Response formatting
- Invoking business services

---

## Authentication Service

Responsibilities

- GitHub OAuth
- JWT generation
- Authorization
- Role-Based Access Control (RBAC)

Uses

- User Repository

---

## User Service

Responsibilities

- User profile management
- User settings
- Account information

Uses

- User Repository

---

## Project Service

Responsibilities

- Create projects
- Update projects
- Delete projects
- Manage project configuration
- Manage environment variables

Uses

- Project Repository

---

## Deployment Engine

The orchestration layer of Nimbus.

Responsibilities

- Coordinate deployment workflow
- Trigger Git operations
- Trigger Docker builds
- Start containers
- Record deployment history

Typical workflow

```
Clone Repository
        ↓
Validate Repository
        ↓
Build Docker Image
        ↓
Create Container
        ↓
Start Container
        ↓
Record Deployment
        ↓
Return Application URL
```

Uses

- Git Service
- Build Service
- Runtime Service
- Deployment Repository

---

## Git Service

Responsibilities

- Repository validation
- Clone repository
- Pull latest changes
- Branch selection
- Repository metadata

Uses

- Git CLI
- child_process

---

## Build Service

Responsibilities

- Build Docker images
- Tag images
- Capture build logs
- Handle build failures

Uses

- Docker Service
- Build Repository
- Log Repository

---

## Runtime Service

Responsibilities

- Deploy containers
- Restart containers
- Stop containers
- Delete containers
- Inspect running containers
- Retrieve runtime status

Uses

- Docker Service
- Container Repository
- Deployment Repository

---

## Docker Service

Acts as an abstraction over Docker Engine.

Responsibilities

- Build images
- Create containers
- Start containers
- Stop containers
- Restart containers
- Remove containers
- Inspect containers
- Stream logs

This is the only module that communicates directly with Docker Engine.

---

## Logging Service

Responsibilities

- Store build logs
- Retrieve runtime logs
- Parse errors
- Present meaningful deployment failures

Uses

- Log Repository

---

## Database Layer

Provides persistence for the backend.

Responsibilities

- Hide SQL queries
- Manage transactions
- Perform CRUD operations
- Abstract database implementation

Contains repositories such as:

- User Repository
- Project Repository
- Repository Repository
- Deployment Repository
- Build Repository
- Container Repository
- Log Repository

Communicates directly with PostgreSQL.

---

## Backend Component Summary

- API Layer
- Authentication Service
- User Service
- Project Service
- Deployment Engine
- Git Service
- Build Service
- Runtime Service
- Docker Service
- Logging Service
- Database Layer

---

# Architectural Principles

Nimbus acts as an **orchestrator** rather than replacing external systems.

Ownership of data is divided as follows:

### GitHub owns

- User identity
- Source code
- Repository metadata
- Branches
- Commits

---

### Docker owns

- Docker images
- Containers
- Networks
- Runtime state
- Live logs

---

### Nimbus owns

- Users
- Projects
- Repository connections
- Deployment history
- Build history
- Environment variables
- Platform events
- User settings
- Permissions
- Deployment orchestration