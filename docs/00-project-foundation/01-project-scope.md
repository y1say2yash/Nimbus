# Project Scope

## Project Overview

Nimbus is a self-hosted Continuous Deployment (CD) platform that enables developers to deploy Dockerized applications from Git repositories onto a single Linux host.

The platform provides a browser-based interface that abstracts the deployment process, allowing developers to build, deploy, and manage applications without manually interacting with Docker.

Semester 1 focuses on understanding the complete deployment lifecycle—from connecting a Git repository to running a Docker container—while maintaining a simple, single-host architecture.

---

# Project Objectives

The primary objectives of Nimbus are:

- Understand how modern deployment platforms operate internally.
- Learn the complete deployment lifecycle of Dockerized applications.
- Design and implement a modular backend architecture.
- Integrate GitHub as the source code provider.
- Build and manage Docker images and containers.
- Provide a web-based dashboard for deployment management.
- Record deployment history and build information.
- Capture and display build and runtime logs.
- Build a maintainable and extensible platform for future enhancements.

---

# Target Users

## Developer

The primary user of Nimbus is a software developer.

The developer should be able to:

- Authenticate using GitHub.
- Create and manage projects.
- Connect Git repositories.
- Configure deployment settings.
- Deploy Dockerized applications.
- View deployment history.
- View build logs.
- View runtime logs.
- Restart, stop, redeploy, and delete deployments.

---

# Semester 1 Features

## User Management

- GitHub Authentication
- User Profile
- User Settings

## Project Management

- Create Project
- Update Project
- Delete Project
- Configure Environment Variables

## Git Integration

- Connect GitHub Repository
- Validate Repository
- Clone Repository
- Select Deployment Branch
- Retrieve Repository Metadata

## Deployment

- Manual Deployment
- Docker Image Build
- Container Creation
- Container Startup
- Deployment History

## Runtime Management

- Start Container
- Stop Container
- Restart Container
- Remove Container
- Redeploy Application

## Logging

- Build Log Collection
- Runtime Log Viewing
- Build Failure Reporting
- Deployment Error Reporting

---

# Functional Scope

Nimbus shall provide the following capabilities:

- Authenticate developers using GitHub OAuth.
- Manage user projects.
- Connect GitHub repositories.
- Clone repositories during deployment.
- Build Docker images from application source code.
- Deploy applications as Docker containers.
- Manage the lifecycle of deployed containers.
- Maintain deployment history.
- Store build information.
- Display build logs.
- Display runtime logs.
- Provide deployment status through the dashboard.

---

# Non-Functional Scope

Nimbus should satisfy the following quality attributes:

- Modular backend architecture.
- RESTful API design.
- Responsive web interface.
- Persistent data storage using PostgreSQL.
- Secure authentication using JWT.
- Clear separation of responsibilities between modules.
- Maintainable and extensible codebase.
- Single-host deployment architecture.
- Docker-based development environment.

---

# Project Boundaries

Nimbus acts as an orchestration platform and does not replace external systems.

| Nimbus Owns | External Systems Own |
| --- | --- |
| Users | GitHub Identity |
| Projects | Source Code |
| Project Configuration | Git Repositories |
| Deployment History | Docker Images |
| Build History | Running Containers |
| Environment Variables | Container Runtime |
| Platform Settings | Docker Networks |
| Platform Database | Live Runtime Logs |

Nimbus stores only the information required to manage deployments. GitHub remains the source of truth for source code, while Docker Engine remains the source of truth for images, containers, and runtime state.

---

# Assumptions

Nimbus assumes that:

- Docker Engine is installed and running.
- The host machine has internet connectivity.
- Developers have a valid GitHub account.
- Connected repositories contain valid Dockerfiles.
- The host machine has sufficient CPU, memory, and storage resources.
- Docker has permission to create and manage containers.

---

# Constraints

Semester 1 intentionally limits the scope of the project.

The platform will support:

- Single Linux host deployment.
- Dockerized applications only.
- Manual deployments initiated by the developer.
- One PostgreSQL database.
- One backend server.
- One frontend application.

---

# Out of Scope

The following features are intentionally excluded from Semester 1:

- Kubernetes
- Multi-node deployments
- Horizontal scaling
- High availability
- Automatic deployments
- GitHub Webhooks
- CI Pipelines
- Background workers
- Deployment queues
- Monitoring dashboards
- Metrics collection
- Prometheus
- Grafana
- Custom domains
- SSL automation
- Load balancing
- Multi-region deployments

These features may be explored in future iterations after the core deployment platform has been completed.

---

# Expected Deliverables

By the end of Semester 1, Nimbus should provide:

- GitHub Authentication
- Project Management Dashboard
- Git Repository Integration
- Manual Deployment Pipeline
- Docker Image Builds
- Container Deployment
- Build Log Collection
- Runtime Log Viewing
- Deployment History
- Container Lifecycle Management
- REST API
- PostgreSQL Database
- Docker-based Development Environment
- Complete Technical Documentation

---

# Success Criteria

Nimbus will be considered successful if a developer can complete the following workflow without manually interacting with Docker:

```
Login
    │
    ▼
Create Project
    │
    ▼
Connect Git Repository
    │
    ▼
Deploy
    │
    ▼
Docker Image Built
    │
    ▼
Container Running
    │
    ▼
Application Accessible
    │
    ▼
Manage Deployment
```

This represents the Minimum Viable Continuous Deployment Platform for Semester 1.