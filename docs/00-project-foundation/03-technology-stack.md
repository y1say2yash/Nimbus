# Technology Stack

This document defines the technologies used to build **Nimbus** and explains the role of each technology within the system architecture.

Nimbus is intentionally designed as a **learning-focused, self-hosted Continuous Deployment platform**. Every technology has been selected to expose an important engineering concept while keeping the overall architecture simple enough to understand and implement.

---

# 1. Technology Summary

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React + Vite + Tailwind CSS | Web dashboard |
| Backend | Node.js + Express | REST API and business logic |
| Database | PostgreSQL | Persistent platform data |
| Query Builder | Knex.js | Database queries and migrations |
| Authentication | GitHub OAuth + JWT | User authentication and authorization |
| Container Runtime | Docker Engine | Build images and run containers |
| Reverse Proxy | Nginx | Request routing |
| Source Control | Git | Repository operations |
| Repository Hosting | GitHub | OAuth and source code hosting |
| Development | Docker Compose | Local development environment |

---

# 2. Frontend

## React

**Role**

Builds the Nimbus web dashboard used to manage projects, deployments, logs, and user settings.

**Why React**

- Component-based architecture.
- Well suited for dashboard-style applications.
- Large ecosystem and strong community support.
- Easy integration with REST APIs.

---

## Vite

**Role**

Frontend development server and build tool.

**Why Vite**

- Extremely fast development experience.
- Minimal configuration.
- Optimized production builds.
- Keeps development focused on application architecture rather than tooling.

---

## Tailwind CSS

**Role**

Styling framework for the user interface.

**Why Tailwind CSS**

- Rapid UI development.
- Consistent design language.
- Utility-first approach reduces custom CSS.
- Well suited for internal dashboards.

---

# 3. Backend API

## Node.js

**Role**

Runtime environment for the Nimbus backend.

**Why Node.js**

- Excellent for building REST APIs.
- Large ecosystem for authentication and integrations.
- Native support for asynchronous workflows.
- Well suited for interacting with Git and Docker through system processes.

---

## Express

**Role**

HTTP framework responsible for exposing the Nimbus REST API.

**Responsibilities**

- Route incoming requests.
- Execute middleware.
- Handle authentication.
- Invoke business services.
- Return API responses.

**Why Express**

- Lightweight and flexible.
- Encourages clean architectural separation.
- Fits naturally with the Controller → Service → Repository pattern used in Nimbus.

---

# 4. Database Layer

## PostgreSQL

**Role**

Primary database for all Nimbus-owned data.

**Nimbus stores**

- Users
- Projects
- Repository connections
- Deployment history
- Build history
- Environment variables
- Platform events
- User settings

**Why PostgreSQL**

- Excellent relational database.
- Strong support for structured data.
- Reliable and widely adopted.
- Easy to self-host.
- Well suited for deployment metadata and historical records.

---

## Knex.js

**Role**

SQL query builder and migration tool.

**Responsibilities**

- Database migrations
- Schema versioning
- SQL query generation
- Transaction management

**Why Knex.js**

- Keeps SQL explicit while reducing boilerplate.
- Makes database schema version-controlled.
- Integrates well with a repository-based backend architecture.
- Provides flexibility without hiding SQL concepts behind a full ORM.

---

# 5. Container Runtime

## Docker Engine

**Role**

External container runtime responsible for building Docker images and managing containers.

Nimbus interacts with Docker Engine to:

- Build Docker images
- Create containers
- Start containers
- Stop containers
- Restart containers
- Remove containers
- Inspect runtime state
- Retrieve container logs

**Why Docker Engine**

- Central technology behind the project.
- Enables isolated application deployment.
- Allows Nimbus to focus on deployment orchestration instead of container execution.

Docker Engine remains an external dependency and the source of truth for images, containers, and runtime state.

---

# 6. Networking

## Nginx

**Role**

Reverse proxy and entry point for Nimbus.

**Responsibilities**

- Route requests to the React frontend.
- Route API requests to the Express backend.
- Provide a single public entry point.
- Support future SSL termination.
- Support future routing to deployed applications.

**Why Nginx**

- Industry-standard reverse proxy.
- Lightweight and reliable.
- Ideal for a single-host deployment architecture.

---

# 7. External Integrations

## Git

**Role**

Source control system used by Nimbus to retrieve application code.

Nimbus uses Git to:

- Clone repositories
- Fetch updates
- Switch branches
- Read commit history

Git operations are executed through the Git CLI using Node.js.

---

## GitHub

**Role**

Repository hosting platform and authentication provider.

Nimbus uses GitHub for:

- OAuth authentication
- Repository access
- Repository metadata
- Branch information
- Commit information

GitHub remains the source of truth for user identity and application source code.

---

# 8. Authentication

Nimbus authentication consists of three layers.

## GitHub OAuth

Provides user authentication and identity.

## JWT (JSON Web Tokens)

Maintains authenticated API sessions after login.

## Authorization

Controls access to platform resources and protects user-owned projects.

Role-Based Access Control (RBAC) may be introduced as the platform evolves.

---

# 9. Development Environment

Nimbus is developed using a containerized local development environment.

## Docker Compose

**Role**

Coordinates the services required for local development.

Typical services include:

- Frontend
- Backend
- PostgreSQL
- Nginx

Docker Compose allows the complete development environment to be started using a single command while maintaining consistency across development machines.

---

# 10. Future Technologies

The following technologies are intentionally excluded from Semester 1 and may be introduced in future iterations of Nimbus:

- GitHub Webhooks
- Automatic deployments
- Background workers
- Deployment queues
- Redis
- SSL automation (Let's Encrypt)
- Prometheus
- Grafana
- Kubernetes
- Multi-host orchestration
- Object storage for build artifacts

---

# 11. Technology Selection Philosophy

Nimbus prioritizes technologies that expose the underlying engineering concepts rather than hiding them behind complex abstractions.

The objective of the project is not simply to deploy applications, but to understand how modern deployment platforms are built. Each technology has therefore been selected based on three principles:

- Educational value
- Industry relevance
- Compatibility with a single-host Continuous Deployment architecture

As Nimbus evolves, additional technologies will be introduced only when they help demonstrate the next stage of modern cloud and platform engineering.