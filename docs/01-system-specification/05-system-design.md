# System Design

## 1. Design Overview

Nimbus is designed as a modular, self-hosted Continuous Deployment (CD) platform for Dockerized applications.

The system follows a **modular backend architecture** where each major domain has its own responsibilities. The Deployment module acts as the primary orchestrator and coordinates Git operations, Docker image builds, container execution, and log handling.

Nimbus runs on a **single Linux host** and uses Docker Engine to execute user applications as isolated containers.

### High-Level Architecture

```
                    ┌──────────────────────┐
                    │       Developer      │
                    │      Web Browser     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Nginx           │
                    │ Reverse Proxy        │
                    └──────────┬───────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
   ┌──────────────────────┐          ┌──────────────────────┐
   │ Nimbus Frontend      │          │ Nimbus Backend       │
   │ React + Vite         │◄────────►│ Node.js + Express    │
   └──────────────────────┘          └──────────┬───────────┘
                                                │
                 ┌──────────────────────────────┼─────────────────────┐
                 │                              │                     │
                 ▼                              ▼                     ▼
        ┌─────────────────┐           ┌─────────────────┐    ┌─────────────────┐
        │   PostgreSQL    │           │   GitHub        │    │  Docker Engine  │
        │   Nimbus Data   │           │ OAuth + Git     │    │   Applications  │
        └─────────────────┘           └─────────────────┘    └─────────────────┘
```

### Core Design Principles

- Modular backend architecture
- Feature-oriented code organization
- Single Linux host
- Docker-based application isolation
- GitHub as the only supported source provider
- Dockerfile-based deployments
- Temporary deployment workspaces
- Persistent deployment metadata
- Deployment-specific images and containers
- PostgreSQL as the persistent application state store
- Docker as the runtime state source
- Manual deployment in Semester 1
- Simple in-process background execution
- No Kubernetes or multi-node orchestration

---

## 2. Core Modules

Nimbus is divided into the following major modules:

```
Backend
│
├── Auth
├── Users
├── Projects
├── Deployments
│   ├── Git
│   ├── Build
│   ├── Docker
│   └── Logs
│
└── Config
```

### Module Overview

| Module | Purpose |
| --- | --- |
| Auth | GitHub OAuth authentication and session handling |
| Users | User profile and GitHub identity management |
| Projects | Project configuration and ownership |
| Deployments | Deployment lifecycle orchestration |
| Git | Repository cloning, fetching, checkout and commit operations |
| Build | Docker image build operations |
| Docker | Container and image management |
| Logs | Build and runtime log collection and storage |
| Config | Environment and application configuration |

The Deployment module coordinates the lower-level deployment modules rather than directly implementing every operation itself.

---

## 3. Module Responsibilities

### 3.1 Auth Module

Responsible for:

- Initiating GitHub OAuth
- Handling OAuth callbacks
- Creating authenticated sessions
- Reading authenticated user information
- Protecting authenticated routes

Authentication is based exclusively on GitHub.

---

### 3.2 Users Module

Responsible for:

- Storing user information
- Managing GitHub identity information
- Returning the authenticated user's profile
- Maintaining user-related database records

GitHub information such as username, email and profile picture can be obtained through the GitHub API.

---

### 3.3 Projects Module

Responsible for:

- Creating projects
- Updating project configuration
- Listing projects belonging to the current user
- Deactivating projects
- Deleting/deactivating project resources
- Storing repository configuration
- Storing default branch
- Storing application/container port
- Managing project ownership

Projects are always associated with their owning user.

---

### 3.4 Deployments Module

The Deployment module is the main orchestration layer.

```
Deployment Module
       │
       ├── Git Module
       │
       ├── Build Module
       │
       ├── Docker Module
       │
       └── Log Module
```

It is responsible for:

- Creating deployments
- Capturing deployment configuration
- Managing deployment states
- Starting deployment workflows
- Coordinating Git, Build, Docker and Log operations
- Verifying the new application
- Replacing the previous deployment
- Handling deployment failures
- Maintaining deployment history

---

### 3.5 Git Module

Responsible for:

- Accessing GitHub repositories
- Cloning repositories
- Fetching updates
- Checking out branches
- Checking out specific commits
- Retrieving the commit used for deployment
- Detecting unavailable repositories or branches

GitHub API operations are used for authentication and repository metadata.

Normal Git operations are used for source retrieval and version control operations.

---

### 3.6 Build Module

Responsible for:

- Validating the source workspace
- Checking for a Dockerfile
- Building Docker images
- Generating deployment-specific image tags
- Capturing build output
- Reporting build failures

The Build module works with the Docker module instead of directly managing the complete deployment lifecycle.

```
Deployment
    ↓
Build
    ↓
Docker
```

---

### 3.7 Docker Module

Responsible for:

- Building Docker images
- Creating containers
- Starting containers
- Checking container state
- Stopping containers
- Removing containers
- Removing unused images
- Allocating available host ports
- Retrieving container logs

For Semester 1, Docker interaction can be implemented using the Docker CLI through Node.js process execution. Docker-specific operations remain abstracted inside this module so the implementation can later be changed to use the Docker Engine API if required.

---

### 3.8 Logs Module

Responsible for:

- Capturing build logs
- Capturing runtime logs
- Persisting logs to the filesystem
- Providing logs to the frontend
- Associating logs with individual deployments

Logs are retained as part of deployment history and cannot be manually deleted through the Nimbus interface.

---

## 4. Authentication Design

Nimbus uses **GitHub OAuth** as its only authentication mechanism in Semester 1.

### Authentication Flow

```
User
 │
 │ Click "Login with GitHub"
 ▼
Nimbus Frontend
 │
 ▼
Nimbus Backend
 │
 │ OAuth redirect
 ▼
GitHub
 │
 │ Authorization
 ▼
Nimbus OAuth Callback
 │
 │ GitHub user information
 ▼
User Record
 │
 ▼
HTTP-only Secure Cookie
 │
 ▼
Authenticated Nimbus Session
```

### Authentication Principles

- No username/password authentication
- GitHub is the identity provider
- GitHub identity is associated with a Nimbus user
- Authentication state is maintained using an HTTP-only secure cookie
- Protected backend routes require an authenticated user
- User identity is determined by the authenticated session

---

## 5. User Management Design

Semester 1 contains only one application role:

```
User
```

There is no administrative role in the current system.

### User Isolation

All user-owned resources are scoped to the authenticated user.

```
Authenticated User
       │
       ├── Projects
       │      ├── Deployments
       │      └── Logs
       │
       └── Profile
```

A user cannot access another user's projects or deployment resources.

### Profile Information

Nimbus stores relevant GitHub identity information such as:

- Nimbus user ID
- GitHub user ID
- GitHub username
- Email
- Profile picture
- Authentication-related metadata

GitHub remains the source of the user's external identity.

---

## 6. Core Business Logic

### 6.1 Project Ownership

Every project belongs to exactly one Nimbus user.

Project operations must verify ownership before allowing access or modification.

```
Request
   ↓
Authenticated User
   ↓
Project Lookup
   ↓
Ownership Check
   ↓
Allowed / Rejected
```

---

### 6.2 Project Configuration

A project stores deployment-related configuration such as:

- Project name
- GitHub repository
- Default branch
- Application/container port
- Active/deactivated state

The branch can be changed at deployment time.

---

### 6.3 Deployment Configuration Snapshot

Every deployment stores a snapshot of the configuration used to create it.

The snapshot includes information such as:

- Repository
- Branch
- Commit SHA
- Container/application port
- Relevant deployment configuration

This makes deployment history independent of later project configuration changes.

For example:

```
Project
Repository: user/app
Default Branch: main
Port: 3000

        │
        │ Deploy
        ▼

Deployment #101
Repository: user/app
Branch: main
Commit: abc123
Port: 3000
```

If the project is later changed to use another branch or port, Deployment #101 still represents the original configuration.

---

### 6.4 New Deployment

A normal new deployment uses the **latest commit from the selected branch**.

```
Selected Branch
      ↓
Fetch Repository
      ↓
Latest Commit
      ↓
Clone / Checkout
      ↓
Build
      ↓
Deploy
```

---

### 6.5 Redeployment

A redeployment uses the **exact commit associated with the previous deployment**.

```
Previous Deployment
       │
       │ Stored Commit SHA
       ▼
Exact Commit
       ↓
Clone / Checkout
       ↓
Build
       ↓
New Deployment
```

This allows a previous source version to be deployed again even when newer commits exist.

---

### 6.6 Deployment Replacement

A new deployment must not immediately stop the currently running deployment.

The sequence is:

```
Build New Image
      ↓
Start New Container
      ↓
Verify New Container
      ↓
New Container Running
      ↓
Stop Old Container
      ↓
Route Traffic to New Deployment
```

The previous deployment remains active until the new deployment has successfully reached a usable running state.

If the new deployment fails, the existing deployment remains running.

---

## 7. Major Workflows

### 7.1 New Deployment Workflow

```
User selects project
        ↓
Select branch
        ↓
Create deployment record
        ↓
PENDING
        ↓
Create temporary workspace
        ↓
Clone repository
        ↓
Checkout selected branch
        ↓
CLONING
        ↓
Verify Dockerfile
        ↓
Build Docker image
        ↓
BUILDING
        ↓
Create container
        ↓
STARTING
        ↓
Verify application
        ↓
RUNNING
        ↓
Stop previous active deployment
        ↓
Deployment becomes active
        ↓
Cleanup workspace
```

---

### 7.2 Failed Deployment Workflow

```
Deployment
    ↓
Git / Build / Start / Verification
    ↓
Failure
    ↓
FAILED
    │
    ├── Preserve previous active deployment
    │
    ├── Capture error/logs
    │
    ├── Remove failed container if required
    │
    ├── Remove unused image
    │
    └── Delete temporary workspace
```

A failed deployment does not replace a successfully running deployment.

---

### 7.3 Dockerfile Validation

Nimbus supports Dockerfile-based applications in Semester 1.

Before building:

```
Temporary Workspace
       ↓
Dockerfile exists?
    ┌──┴──┐
   YES    NO
    │      │
    ▼      ▼
 Build   FAILED
          │
          └── "Dockerfile not found in selected branch."
```

Docker Compose is not supported in Semester 1.

---

### 7.4 Deployment Workspace

Each deployment receives its own temporary source workspace.

```
Deployment A → /temporary/workspace/A
Deployment B → /temporary/workspace/B
Deployment C → /temporary/workspace/C
```

This prevents source files from different deployments from interfering with one another.

After the deployment completes or fails, the workspace is permanently deleted.

Deployment metadata, logs, image/container references and commit information are retained separately.

---

### 7.5 Application URL Workflow

Nimbus automatically assigns an available host port to a deployed application.

The user configures the application's internal/container port.

```
Application
Container Port: 3000
        │
        ▼
Nimbus Host Port Allocation
        │
        ▼
Nginx
        │
        ▼
Project Path
        │
        ▼
Application
```

Nimbus uses **path-based routing** for deployed applications.

Example:

```
http://localhost/project-a
http://localhost/project-b
http://localhost/project-c
```

The exact routing and Nginx configuration are handled by the infrastructure layer.

---

## 8. Request Lifecycle

A typical frontend request follows this lifecycle:

```
Browser
   ↓
Nginx
   ↓
Frontend / Backend
   ↓
Authentication Middleware
   ↓
Route
   ↓
Controller
   ↓
Service
   ↓
Repository / Data Access
   ↓
PostgreSQL
   ↓
Service
   ↓
Controller
   ↓
HTTP Response
   ↓
Frontend
   ↓
Browser
```

### Backend Layer Responsibilities

#### Route

Defines the API endpoint and HTTP method.

#### Middleware

Handles cross-cutting concerns such as:

- Authentication
- Request validation
- Authorization

#### Controller

Handles:

- Request input
- Calling the appropriate service
- Formatting the HTTP response

#### Service

Contains application and business logic.

#### Repository

Handles database access for the relevant feature.

Example:

```
projects/
├── routes
├── controller
├── service
└── repository
```

This keeps database access close to the feature that owns the data.

---

## 9. State Management

Nimbus maintains state across two primary sources:

```
              Nimbus State
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   PostgreSQL             Docker
 Persistent State       Runtime State
```

### PostgreSQL

PostgreSQL is the source of truth for persistent Nimbus information such as:

- Users
- Projects
- Deployments
- Deployment configuration snapshots
- Deployment status
- Commit information
- Container/image references
- Deployment history

### Docker

Docker provides runtime state such as:

- Whether a container exists
- Whether a container is running
- Container status
- Container logs
- Images available on the host

### State Reconciliation

When Nimbus starts, it should perform a basic reconciliation process:

```
Nimbus Startup
      ↓
Read deployment state from PostgreSQL
      ↓
Check Docker runtime state
      ↓
Compare expected vs actual state
      ↓
Update runtime-related state if required
```

This allows Nimbus to recover information about containers that existed before a backend restart.

---

## 10. Internal Communication

Nimbus modules communicate internally through normal backend function/service calls.

There is no microservice architecture in Semester 1.

```
Controller
    ↓
Service
    ↓
Repository / Infrastructure Module
```

Deployment orchestration follows:

```
Deployment Service
       │
       ├── Git Service
       │
       ├── Build Service
       │
       ├── Docker Service
       │
       └── Log Service
```

### External Communication

Nimbus communicates with:

- GitHub API for authentication and repository metadata
- GitHub repositories through Git operations
- Docker Engine through Docker operations
- PostgreSQL through the database layer
- Nginx through host-level configuration/runtime integration

---

## 11. Background Processes

Semester 1 uses a **simple in-process worker model** for deployment execution.

A deployment request does not need to perform the entire deployment workflow synchronously inside the HTTP request.

```
API Request
    ↓
Create Deployment
    ↓
Queue / Start In-Process Job
    ↓
Return Deployment Information
    ↓
Background Deployment Worker
    │
    ├── Git
    ├── Build
    ├── Docker
    └── Logs
```

No external queue system such as Redis or BullMQ is required for Semester 1.

This keeps the architecture simple while allowing deployments to execute as longer-running operations.

---

## 12. Error Handling

Nimbus uses two levels of error handling.

### Backend Errors

Backend errors should:

- Be captured by the appropriate module
- Update deployment state when applicable
- Store useful error information
- Return a structured API error response
- Avoid exposing unnecessary internal details

### Frontend Errors

User-facing errors are displayed through a toast or equivalent notification mechanism.

Examples:

```
Dockerfile not found in selected branch.
Repository unavailable.
Selected branch does not exist.
Deployment failed.
Port allocation failed.
Project is already deploying.
```

### Deployment Failure

When a deployment fails:

1. Mark deployment as `FAILED`.
2. Preserve the previous active deployment.
3. Capture relevant logs/error information.
4. Remove the failed container if necessary.
5. Remove unused build images.
6. Delete the temporary workspace.
7. Notify the user.

---

## 13. Concurrency Considerations

### 13.1 Same Project

Only one active deployment operation is allowed for a project at a time.

If the user attempts another deployment while one is already running, Nimbus should warn the user before proceeding.

```
Deployment A
     │
     │ Running
     ▼
New Deployment Request
     │
     ▼
Warning
"Deployment already in progress."
     │
     ▼
User Confirmation
```

The deployment lifecycle must prevent two deployment operations for the same project from incorrectly replacing or modifying each other's resources.

---

### 13.2 Different Projects

Different projects can deploy concurrently.

```
Project A → Deployment A ───────►
Project B → Deployment B ───────────►
Project C → Deployment C ─────►
```

Each deployment receives its own:

- Temporary workspace
- Deployment ID
- Docker image/tag
- Container name
- Deployment state
- Log files

This provides isolation between concurrent deployments.

---

### 13.3 Unique Docker Resources

Docker resources use deployment-specific identifiers.

Example:

```
nimbus-<project-id>-<deployment-id>
```

This prevents resource naming collisions between projects and deployments.

---

## 14. Resource Management

### 14.1 Temporary Workspaces

Each deployment uses a temporary workspace.

```
Create Workspace
      ↓
Clone Source
      ↓
Build / Deploy
      ↓
Delete Workspace
```

Workspaces are permanently deleted after deployment completion or failure.

---

### 14.2 Docker Images

Each deployment receives a unique Docker image/tag.

Example:

```
nimbus/project-12/deployment-105
```

Nimbus retains approximately **5 deployment images per project**.

Older unused images can be cleaned up after successful deployments.

Active deployment images must not be removed during cleanup.

---

### 14.3 Containers

Each deployment receives a unique container name.

Example:

```
nimbus-12-105
```

Only the active deployment should remain serving the project after a successful replacement.

---

### 14.4 Host Ports

Nimbus automatically selects an available host port.

The user only specifies the application's internal/container port.

```
Container
Port: 3000
   │
   ▼
Nimbus
   │
   ▼
Available Host Port
```

If a preferred host port is already occupied, Nimbus selects another available port.

---

### 14.5 Logs

Logs are stored as filesystem files rather than in PostgreSQL.

A conceptual structure is:

```
/var/lib/nimbus/logs/
└── <deployment-id>/
    ├── build.log
    └── runtime.log
```

PostgreSQL stores the metadata needed to associate the logs with their deployment.

---

### 14.6 Resource Limits

Semester 1 does not enforce application-level:

- CPU limits
- Memory limits
- Disk quotas
- Network bandwidth limits

These can be considered as future platform enhancements.

---

## 15. Edge Cases

### 15.1 Repository Unavailable

If a GitHub repository is deleted, renamed or otherwise unavailable:

```
Deployment Request
      ↓
Repository Check
      ↓
Unavailable
      ↓
Deployment FAILED
```

Nimbus should display a clear error and allow the user to update the repository configuration.

---

### 15.2 Branch Unavailable

If the selected branch has been deleted:

```
Selected Branch
      ↓
Branch Check
      ↓
Not Found
      ↓
Deployment FAILED
```

The user can update the project or deployment branch configuration.

---

### 15.3 Dockerfile Missing

If the selected source version does not contain a Dockerfile:

```
Dockerfile Check
      ↓
Not Found
      ↓
FAILED
```

The user receives:

```
Dockerfile not found in selected branch.
```

---

### 15.4 Build Failure

If Docker image creation fails:

```
Build
  ↓
Failure
  ↓
FAILED
  ├── Previous deployment remains active
  ├── Build logs retained
  ├── Unused image cleaned
  └── Workspace removed
```

---

### 15.5 Container Fails to Start

If the newly created container does not start correctly:

```
Start Container
      ↓
Failure
      ↓
FAILED
      ↓
Previous deployment remains active
```

The failed container and unused image are cleaned up where appropriate.

---

### 15.6 Application Fails Runtime Verification

Nimbus verifies that the newly started application is actually usable before replacing the previous deployment.

The planned verification mechanism is an HTTP health check using:

```
/health
```

The new deployment must pass runtime verification before the previous active deployment is stopped.

---

### 15.7 Port Already Occupied

If a selected host port is unavailable:

```
Requested / Selected Port
          ↓
      Already Used
          ↓
Find Available Port
          ↓
      Assign Port
```

Nimbus automatically selects another available host port.

---

### 15.8 Project Deactivation

If a project with an active deployment is deactivated:

```
Deactivate Project
       ↓
Warning
       ↓
Stop Active Container
       ↓
Deactivate Project
       ↓
Retain Deployment History
```

Historical deployment and log records are retained.

---

### 15.9 Project Deletion

Project records are not immediately destroyed from the system database.

Nimbus uses a soft-deactivation approach so that historical information can remain available according to the project's lifecycle rules.

Active runtime resources must be stopped before the project becomes inactive.

---

### 15.10 Nimbus Restart

If the Nimbus backend restarts while deployed applications exist:

```
Nimbus Restart
      ↓
Load PostgreSQL State
      ↓
Inspect Docker
      ↓
Reconcile Runtime State
      ↓
Resume Normal Operation
```

The reconciliation mechanism ensures Nimbus does not rely solely on in-memory state to determine whether deployed containers exist.

---

### 15.11 GitHub Configuration Changes

If repository or branch information changes after a previous deployment:

- Existing deployment snapshots remain unchanged.
- New deployments use the current selected configuration.
- Previous deployments retain their original repository, branch and commit information.

This preserves deployment history and makes each deployment independently identifiable.