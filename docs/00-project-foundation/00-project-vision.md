# Nimbus

> **A Self-Hosted Continuous Deployment (CD) Platform for Dockerized Applications**
> 

Nimbus is a self-hosted Continuous Deployment (CD) platform designed to automate the deployment of Dockerized applications from Git repositories onto a single Linux host.

Inspired by platforms like **Render**, **Railway**, and **Heroku**, Nimbus enables developers to build, deploy, and manage applications through a web interface without manually interacting with Docker.

Rather than replicating a production-grade cloud platform, Nimbus is built as a learning project to understand how modern deployment platforms work under the hood.

---

# Vision

Modern deployment platforms hide much of the complexity involved in deploying applications. A developer pushes code, clicks **Deploy**, and within minutes the application is running.

Nimbus aims to demystify this process by implementing the core building blocks of a deployment platform from scratch.

Instead of manually cloning repositories, building Docker images, creating containers, and managing deployments through the command line, developers should be able to perform these tasks through a browser-based dashboard while still understanding every step taking place behind the scenes.

The goal of Nimbus is not simply to host applications, but to serve as a practical exploration of deployment automation, platform engineering, and backend system design.

---

# Primary Objective

The primary objective of Nimbus is to understand and implement the core concepts behind a Continuous Deployment (CD) platform.

Throughout development, the project will explore:

- Git-based source management
- Docker image creation
- Container lifecycle management
- Reverse proxying
- Deployment orchestration
- Runtime management
- Logging and error reporting
- Platform architecture
- Backend system design

Nimbus prioritizes learning deployment internals over building production-scale infrastructure.

---

# Project Scope

Semester 1 focuses entirely on building a deployment platform that operates on a **single Linux host**.

The platform should allow a developer to complete the following workflow:

```
Developer Login
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
Clone Latest Source
        │
        ▼
Build Docker Image
        │
        ▼
Run Docker Container
        │
        ▼
View Build Logs
        │
        ▼
View Runtime Logs
        │
        ▼
Manage Deployment
```

Deployments are initiated manually by the developer through the Nimbus dashboard.

Each deployment automatically clones the latest version of the configured branch before building and deploying the application.

---

# What Nimbus Is

Nimbus is a browser-based deployment platform that abstracts the Docker workflow behind a simple interface.

A developer should be able to:

- Authenticate using GitHub
- Create and manage projects
- Connect Git repositories
- Deploy Dockerized applications
- View deployment history
- View build logs
- View runtime logs
- Restart, stop, redeploy, and delete deployments

Throughout this workflow, Nimbus acts as the orchestration layer between GitHub, Docker Engine, and the deployed applications.

---

# Development Philosophy

Nimbus is developed as an educational platform.

Every feature introduced into the project should teach one or more software engineering concepts.

Rather than maximizing the number of features, Nimbus focuses on understanding how deployment platforms are built internally.

Each milestone should answer a specific engineering question.

| Feature | Engineering Concept |
| --- | --- |
| GitHub Authentication | OAuth & Authentication |
| Git Integration | Source Control |
| Docker Builds | Containerization |
| Deployment Engine | Continuous Deployment |
| Runtime Management | Container Lifecycle |
| Reverse Proxy | Networking |
| Logging | Debugging & Observability |
| Database Design | State Management |
| REST API | Backend Architecture |

---

# Semester 1 Constraints

To keep the project focused, the following features are intentionally excluded from Semester 1:

- Kubernetes
- Container orchestration
- Multi-node deployments
- Horizontal scaling
- Load balancing
- Background workers
- Deployment queues
- Automatic deployments
- GitHub Webhooks
- CI pipelines
- Monitoring dashboards
- Metrics collection
- High availability
- Multi-region deployments

The objective is to first understand how a deployment platform works before introducing automation and distributed systems.

---

# Semester 1 Deliverables

By the end of Semester 1, Nimbus should support:

- GitHub Authentication
- Project Management
- Git Repository Integration
- Manual Deployments
- Repository Cloning
- Docker Image Builds
- Container Deployment
- Build Log Collection
- Runtime Log Viewing
- Deployment History
- Restart / Stop / Delete Operations
- Reverse Proxy Configuration
- Self-hosted Deployment Platform

At this stage, Nimbus should function as a complete self-hosted Continuous Deployment platform capable of deploying Dockerized applications onto a single Linux machine.

---

# Future Direction

Nimbus is designed to be modular and extensible.

After completing the core deployment platform, future iterations may explore additional platform engineering concepts such as:

- GitHub Webhooks
- Automatic Deployments
- CI Integration (GitHub Actions)
- Deployment Queues
- Background Workers
- Monitoring & Metrics
- Custom Domains
- SSL Automation
- Notifications
- Deployment Strategies
- Container Orchestration

The exact direction of future development will be determined after the successful completion of the Semester 1 platform.

---

# Core Design Principles

Throughout development, Nimbus follows a few guiding principles:

- **Understand before automating.** Every deployment step should first be implemented manually before introducing automation.
- **Build only what is necessary.** Features should solve real problems or teach important engineering concepts.
- **Keep responsibilities separate.** GitHub manages source code, Docker manages containers, and Nimbus orchestrates the deployment lifecycle.
- **Prioritize simplicity.** A well-understood single-host platform is more valuable than a partially implemented distributed system.
- **Design for extensibility.** The architecture should allow advanced features to be added later without requiring major redesigns.

---

# Project Identity

Nimbus is **not** a cloud provider.

Nimbus is **not** a Kubernetes platform.

Nimbus is **not** a CI platform.

Nimbus is a **self-hosted Continuous Deployment platform** that helps developers understand how modern deployment systems build, deploy, and manage Dockerized applications.