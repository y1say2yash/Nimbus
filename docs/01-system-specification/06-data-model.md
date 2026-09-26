# Data Model

## 1. Database Overview

Nimbus uses **PostgreSQL** as its primary persistent data store.

The database stores Nimbus-owned application data such as:

- User accounts
- Authentication sessions
- Projects
- Deployment history
- Deployment configuration snapshots
- Deployment and runtime metadata

Docker resources such as containers and images are **not stored as database entities**. PostgreSQL stores the identifiers and metadata required to associate those resources with Nimbus deployments, while Docker remains the source of truth for actual runtime resources.

Logs are also not stored in PostgreSQL. Build and runtime logs are stored as filesystem files and associated with deployments through their deployment ID.

### Database Responsibilities

```
PostgreSQL
│
├── Users
├── Sessions
├── Projects
└── Deployments
```

### External Resource Responsibilities

```
GitHub
└── Repositories / Commits / User Identity

Docker
├── Images
├── Containers
└── Runtime State

Filesystem
└── Build / Runtime Logs
```

---

## 2. ER Diagram

The core Nimbus database relationships are:

```
┌──────────────────────┐
│        users         │
├──────────────────────┤
│ PK user_id           │
│    github_id         │
│    github_username   │
│    email             │
│    avatar_url        │
│    is_active         │
│    created_at        │
│    updated_at        │
│    deleted_at        │
└──────────┬───────────┘
           │
           │ 1
           │
      ┌────┴────┐
      │         │
      │ N       │ N
      ▼         ▼
┌────────────┐  ┌──────────────────────┐
│  sessions  │  │      projects        │
├────────────┤  ├──────────────────────┤
│ PK         │  │ PK project_id        │
│ session_id │  │ FK user_id           │
│ user_id FK │  │ github_repository_id │
│ token_hash │  │ repository_url       │
│ expires_at │  │ project_name         │
│ created_at │  │ default_branch       │
│ revoked_at │  │ container_port       │
└────────────┘  │ is_active            │
                │ created_at           │
                │ updated_at           │
                │ deleted_at           │
                └──────────┬───────────┘
                           │
                           │ 1
                           │
                           │ N
                           ▼
                ┌──────────────────────┐
                │     deployments      │
                ├──────────────────────┤
                │ PK deployment_id     │
                │ FK project_id        │
                │ repository_url       │
                │ branch               │
                │ commit_sha           │
                │ container_port       │
                │ host_port            │
                │ image_tag            │
                │ container_name       │
                │ status               │
                │ error_message        │
                │ created_at           │
                │ started_at           │
                │ finished_at          │
                └──────────────────────┘
```

### Relationship Summary

```
User
 │
 ├──< Sessions
 │
 └──< Projects
          │
          └──< Deployments
```

---

## 3. Entity List

| Entity | Table | Purpose |
| --- | --- | --- |
| User | `users` | Stores Nimbus user and GitHub identity information |
| Session | `sessions` | Stores authenticated Nimbus sessions |
| Project | `projects` | Stores user-owned project configuration |
| Deployment | `deployments` | Stores deployment history and deployment configuration snapshots |

The following are **not database entities**:

| Resource | Storage / Source |
| --- | --- |
| GitHub repository | GitHub |
| Git commit | GitHub / Git |
| Docker image | Docker Engine |
| Docker container | Docker Engine |
| Build logs | Filesystem |
| Runtime logs | Filesystem |

---

## 4. Entity Responsibilities

### 4.1 User

The `users` entity represents a Nimbus account associated with a GitHub identity.

It stores the current GitHub identity information required by Nimbus.

A user's GitHub username may change on GitHub. Nimbus therefore treats `github_id` as the stable external identity and updates the stored username when required.

---

### 4.2 Session

The `sessions` entity represents an authenticated Nimbus session.

Session information is kept separate from the user record.

The browser receives the session through an HTTP-only secure cookie, while the database stores the corresponding session information.

---

### 4.3 Project

The `projects` entity represents an application configured for deployment through Nimbus.

A project belongs to exactly one user.

It stores the repository and deployment configuration that represents the project's current configuration.

---

### 4.4 Deployment

The `deployments` entity represents one attempt to deploy a project.

Each deployment stores an immutable snapshot of the important configuration used for that deployment.

This allows Nimbus to retain accurate historical information even when the project's configuration changes later.

---

## 5. Table Structures

### 5.1 `users`

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `user_id` | UUID | PK | Internal Nimbus user identifier |
| `github_id` | BIGINT | NOT NULL, UNIQUE | Stable GitHub user identifier |
| `github_username` | VARCHAR | NOT NULL, UNIQUE | Current GitHub username |
| `email` | VARCHAR | NOT NULL, UNIQUE | User email obtained through GitHub |
| `avatar_url` | TEXT | NULL | GitHub profile picture URL |
| `is_active` | BOOLEAN | NOT NULL | Whether the user is active |
| `created_at` | TIMESTAMP | NOT NULL | Account creation time |
| `updated_at` | TIMESTAMP | NOT NULL | Last modification time |
| `deleted_at` | TIMESTAMP | NULL | Soft deletion timestamp |

### Notes

`github_id` is the stable external identity.

`github_username` may change if the user changes their GitHub username. Nimbus should update the stored value rather than treating the username as the permanent identity.

---

### 5.2 `sessions`

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `session_id` | UUID | PK | Unique session identifier |
| `user_id` | UUID | FK, NOT NULL | Associated Nimbus user |
| `token_hash` | TEXT | NOT NULL, UNIQUE | Stored representation of session token |
| `expires_at` | TIMESTAMP | NOT NULL | Session expiration time |
| `created_at` | TIMESTAMP | NOT NULL | Session creation time |
| `revoked_at` | TIMESTAMP | NULL | Session revocation time |

The actual session token should not be stored as plaintext in the database.

---

### 5.3 `projects`

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `project_id` | UUID | PK | Unique project identifier |
| `user_id` | UUID | FK, NOT NULL | Project owner |
| `github_repository_id` | BIGINT | NOT NULL | Stable GitHub repository identifier |
| `repository_url` | TEXT | NOT NULL | GitHub repository URL |
| `project_name` | VARCHAR | NOT NULL | Nimbus project name |
| `default_branch` | VARCHAR | NOT NULL | Default branch for the project |
| `container_port` | INTEGER | NOT NULL | Application port inside the container |
| `is_active` | BOOLEAN | NOT NULL | Whether the project is active |
| `created_at` | TIMESTAMP | NOT NULL | Project creation time |
| `updated_at` | TIMESTAMP | NOT NULL | Last modification time |
| `deleted_at` | TIMESTAMP | NULL | Soft deletion timestamp |

Project names are unique per user.

Therefore:

```
User A → my-api       ✓
User A → my-api       ✗
User B → my-api       ✓
```

---

### 5.4 `deployments`

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| `deployment_id` | UUID | PK | Unique deployment identifier |
| `project_id` | UUID | FK, NOT NULL | Project being deployed |
| `repository_url` | TEXT | NOT NULL | Repository used for deployment |
| `branch` | VARCHAR | NOT NULL | Branch selected for deployment |
| `commit_sha` | VARCHAR | NOT NULL | Exact source commit |
| `container_port` | INTEGER | NOT NULL | Application port inside container |
| `host_port` | INTEGER | NOT NULL | Nimbus-assigned host port |
| `image_tag` | VARCHAR | NOT NULL | Deployment-specific Docker image tag |
| `container_name` | VARCHAR | NOT NULL | Deployment-specific Docker container name |
| `status` | deployment_status | NOT NULL | Current deployment state |
| `error_message` | TEXT | NULL | User-relevant deployment error |
| `created_at` | TIMESTAMP | NOT NULL | Deployment creation time |
| `started_at` | TIMESTAMP | NULL | Deployment execution start time |
| `finished_at` | TIMESTAMP | NULL | Deployment completion time |

The deployment table contains a snapshot of configuration rather than depending entirely on the current project record.

For example, if a project's branch changes from `main` to `develop`, an earlier deployment still records that it was deployed from `main`.

---

## 6. Primary Keys

Nimbus uses UUIDs for internal primary keys.

| Table | Primary Key |
| --- | --- |
| `users` | `user_id` |
| `sessions` | `session_id` |
| `projects` | `project_id` |
| `deployments` | `deployment_id` |

UUIDs provide globally unique identifiers and avoid relying on sequential IDs for resources exposed through the application.

---

## 7. Foreign Keys

### Sessions

```
sessions.user_id
        ↓
users.user_id
```

### Projects

```
projects.user_id
        ↓
users.user_id
```

### Deployments

```
deployments.project_id
        ↓
projects.project_id
```

### Foreign Key Summary

| Child Table | Column | Parent Table | Column |
| --- | --- | --- | --- |
| `sessions` | `user_id` | `users` | `user_id` |
| `projects` | `user_id` | `users` | `user_id` |
| `deployments` | `project_id` | `projects` | `project_id` |

---

## 8. Relationships

### User → Sessions

One user can have multiple sessions.

```
User 1 ─────────── N Sessions
```

This allows the same user to have multiple authenticated sessions where required.

---

### User → Projects

One user can own multiple projects.

```
User 1 ─────────── N Projects
```

A project cannot exist without an owning user.

---

### Project → Deployments

One project can have many deployments.

```
Project 1 ─────────── N Deployments
```

Deployment history is retained even after a newer deployment becomes active.

---

### Complete Relationship

```
User
 │
 ├──────────────< Session
 │
 └──────────────< Project
                    │
                    └──────────────< Deployment
```

---

## 9. Constraints

### User Constraints

- `user_id` must be unique.
- `github_id` must be unique.
- `github_username` must be unique.
- `email` must be unique.
- `github_id` cannot be NULL.
- `email` cannot be NULL.
- `github_username` cannot be NULL.
- An inactive/deleted user should not be allowed to create new projects or deployments.

---

### Session Constraints

- Every session must belong to a valid user.
- `token_hash` must be unique.
- `expires_at` must be present.
- Revoked sessions must not be accepted for authentication.

---

### Project Constraints

- Every project must belong to a valid user.
- `project_name` cannot be NULL.
- Project name must be unique for a given user.
- `repository_url` cannot be NULL.
- `github_repository_id` cannot be NULL.
- `default_branch` cannot be NULL.
- `container_port` must be between `1` and `65535`.

Conceptually:

```
UNIQUE(user_id, project_name)
```

---

### Deployment Constraints

- Every deployment must belong to a valid project.
- `repository_url` cannot be NULL.
- `branch` cannot be NULL.
- `commit_sha` cannot be NULL.
- `container_port` must be between `1` and `65535`.
- `host_port` must be between `1` and `65535`.
- `image_tag` cannot be NULL.
- `container_name` cannot be NULL.
- `status` cannot be NULL.
- Deployment IDs must be unique.

---

## 10. Indexes

Indexes are used for frequently queried fields.

### `users`

```
UNIQUE INDEX github_id
UNIQUE INDEX github_username
UNIQUE INDEX email
```

---

### `sessions`

```
UNIQUE INDEX token_hash
INDEX user_id
INDEX expires_at
```

These support session lookup, user session management and expiration checks.

---

### `projects`

```
INDEX user_id
UNIQUE INDEX (user_id, project_name)
INDEX github_repository_id
INDEX is_active
```

The user ID index supports listing the authenticated user's projects.

---

### `deployments`

```
INDEX project_id
INDEX project_id, created_at
INDEX status
INDEX created_at
```

The project + creation timestamp index supports deployment history queries.

The status index supports queries for active/running or failed deployments.

---

## 11. Enumerations / Statuses

### Deployment Status

Nimbus uses a PostgreSQL enum for deployment status.

```
deployment_status
```

Values:

```
PENDING
CLONING
BUILDING
STARTING
RUNNING
FAILED
STOPPED
CANCELLED
```

### Status Meaning

| Status | Meaning |
| --- | --- |
| `PENDING` | Deployment created but execution has not started |
| `CLONING` | Repository source is being retrieved |
| `BUILDING` | Docker image is being built |
| `STARTING` | Container is being created/started |
| `RUNNING` | Deployment has successfully started and passed runtime verification |
| `FAILED` | Deployment failed |
| `STOPPED` | Deployment was previously running but has been stopped |
| `CANCELLED` | Deployment was cancelled before successful completion |

### Project State

Projects use:

```
is_active BOOLEAN
deleted_at TIMESTAMP NULL
```

This avoids requiring a separate project-status enum for the current Semester 1 requirements.

### User State

Users similarly use:

```
is_active BOOLEAN
deleted_at TIMESTAMP NULL
```

---

## 12. Audit Fields

Nimbus uses common audit fields on persistent entities.

### Standard Fields

```
created_at
updated_at
```

These are present on:

- Users
- Sessions
- Projects
- Deployments

### Soft Deletion

Users and projects additionally contain:

```
deleted_at
```

`deleted_at = NULL` means the record has not been soft-deleted.

A populated `deleted_at` indicates that the record has been soft-deleted.

---

### Deployment Timestamps

Deployments additionally track:

```
started_at
finished_at
```

This allows Nimbus to determine deployment execution duration and lifecycle timing.

---

## 13. Data Lifecycle

### User Lifecycle

```
GitHub Login
    ↓
Create User
    ↓
Active User
    ↓
User Deactivation
    ↓
Soft Deleted User
```

User records are retained rather than physically deleted.

---

### Project Lifecycle

```
Create Project
      ↓
Active
      ↓
Deployments
      ↓
Deactivate / Delete
      ↓
Soft Deleted
```

Project history remains associated with the project.

---

### Deployment Lifecycle

```
Create
  ↓
PENDING
  ↓
CLONING
  ↓
BUILDING
  ↓
STARTING
  ↓
RUNNING
```

Failure path:

```
Any Deployment Stage
        ↓
      FAILED
```

Cancellation path:

```
Active Deployment Operation
        ↓
    CANCELLED
```

Previously running deployments can later become:

```
STOPPED
```

when replaced by a successful newer deployment or stopped through project lifecycle operations.

---

### Docker Resource Lifecycle

Docker resources follow the deployment lifecycle but are not database-owned records.

```
Deployment
    ↓
Docker Image
    ↓
Docker Container
    ↓
Runtime Verification
    ↓
Active Deployment
    ↓
Deployment Replaced
    ↓
Old Container Stopped
```

Unused images are cleaned according to the project image-retention policy.

---

## 14. Data Retention

### Users

User records are retained after soft deletion.

```
is_active = false
deleted_at = <timestamp>
```

---

### Projects

Projects are soft-deleted/deactivated rather than immediately removed.

Deployment history associated with the project can therefore remain available for record keeping.

---

### Deployments

Deployment records are retained as historical records.

Important deployment information such as:

- Commit SHA
- Branch
- Repository
- Configuration snapshot
- Status
- Image tag
- Container name
- Timestamps
- Error information

remains associated with the deployment.

---

### Logs

Logs are stored on the filesystem and retained with the deployment.

Conceptual structure:

```
/var/lib/nimbus/logs/
└── <deployment-id>/
    ├── build.log
    └── runtime.log
```

Log paths are derived from the deployment ID rather than stored as database columns.

---

### Docker Images

Nimbus aims to retain approximately **5 deployment images per project**.

Image cleanup is handled using Docker resource information and deployment metadata.

Soft-deleting a user does **not automatically mean deleting every Docker image immediately**.

Instead:

```
User Deactivated
      ↓
Projects Deactivated
      ↓
Active Containers Stopped
      ↓
Deployment History Retained
      ↓
Normal Image Retention / Cleanup
```

This keeps database lifecycle management separate from Docker resource cleanup.

---

## 15. Database Migrations

Nimbus uses database migrations to version and manage schema changes.

The migration structure is:

```
database/
└── migrations/
    ├── <timestamp>_create_users.js
    ├── <timestamp>_create_sessions.js
    ├── <timestamp>_create_projects.js
    ├── <timestamp>_create_deployments.js
    └── ...
```

Migrations should be applied in dependency order.

### Recommended Order

```
1. Users
      ↓
2. Sessions
      ↓
3. Projects
      ↓
4. Deployments
```

This ensures referenced tables exist before foreign keys are created.

### Migration Principles

- Schema changes are version-controlled.
- Migrations should be reproducible.
- Existing migration files should not be modified after they have been applied to shared environments.
- New schema changes should be introduced through new migrations.
- Foreign key relationships should be created through migrations.
- PostgreSQL enums should be created before tables that depend on them.

---

## 16. Seed Data

Nimbus uses seed data only for local development and testing.

Seed data should be minimal and should not attempt to reproduce real GitHub authentication.

### Example Development Data

```
Users
├── Development User 1
├── Development User 2
└── Development User 3

Projects
├── User 1 → Sample API
├── User 2 → Sample Frontend
└── User 3 → Sample Application
```

Deployment seed data can be added where useful for testing deployment history and UI states:

```
Sample Project
├── Deployment → RUNNING
├── Deployment → STOPPED
└── Deployment → FAILED
```

### Seed Data Principles

- No real OAuth tokens.
- No real session tokens.
- No production credentials.
- No dependency on live GitHub repositories unless explicitly required for development.
- Seed data should be safe to reset in a development environment.
- Production environments should not rely on development seed data.