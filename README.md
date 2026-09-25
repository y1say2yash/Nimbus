# Nimbus

> **A Self-Hosted Continuous Deployment (CD) Platform for Dockerized Applications**

Nimbus is a learning-focused, self-hosted Continuous Deployment platform designed to automate the deployment of Dockerized applications from Git repositories onto a single Linux host.

Inspired by platforms such as Render, Railway, and Heroku, Nimbus provides a web-based interface through which developers can connect repositories, deploy applications, view logs, and manage running containers without manually interacting with Docker.

The project focuses on understanding how deployment platforms work internally, with particular emphasis on deployment automation, containerization, backend architecture, networking, and platform engineering.

---

## Project Overview

Nimbus acts as an orchestration layer between:

* **Developers** using the Nimbus web dashboard
* **GitHub** for authentication and source code
* **Docker Engine** for building images and running containers
* **PostgreSQL** for storing Nimbus-owned platform data
* **Nginx** for reverse proxying and request routing

The Semester 1 implementation intentionally uses a **single Linux host** to keep the architecture simple and focus on understanding the core deployment lifecycle.

### Deployment Flow

```text
Developer
    │
    ▼
Nimbus Dashboard
    │
    ▼
Connect Git Repository
    │
    ▼
Deploy
    │
    ▼
Clone Repository
    │
    ▼
Build Docker Image
    │
    ▼
Create & Start Container
    │
    ▼
Application Running
    │
    ├── Build Logs
    └── Runtime Logs
```

---

## Core Features

Nimbus is planned to support the following Semester 1 capabilities:

* GitHub Authentication
* Project Management
* Git Repository Integration
* Manual Deployments
* Repository Cloning
* Docker Image Builds
* Container Deployment
* Container Lifecycle Management
* Deployment History
* Build Log Collection
* Runtime Log Viewing
* Deployment Status
* Reverse Proxy Configuration

The current scope intentionally excludes Kubernetes, multi-node deployments, automatic deployments, CI pipelines, monitoring dashboards, metrics collection, and other distributed-platform features.

---

## Technology Stack

| Layer              | Technology                  | Purpose                          |
| ------------------ | --------------------------- | -------------------------------- |
| Frontend           | React + Vite + Tailwind CSS | Web dashboard                    |
| Backend            | Node.js + Express           | REST API and business logic      |
| Database           | PostgreSQL                  | Platform data                    |
| Query Builder      | Knex.js                     | Queries and migrations           |
| Authentication     | GitHub OAuth + JWT          | Authentication and authorization |
| Container Runtime  | Docker Engine               | Image builds and containers      |
| Reverse Proxy      | Nginx                       | Request routing                  |
| Source Control     | Git                         | Repository operations            |
| Repository Hosting | GitHub                      | Source code and OAuth            |
| Development        | Docker Compose              | Local development environment    |

---

## Repository Structure

```text
nimbus/
│
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── docker-compose.yml
│
├── docs/
│   ├── README.md
│   │
│   ├── 00-project-foundation/
│   │   ├── 00-project-vision.md
│   │   ├── 01-project-scope.md
│   │   ├── 02-system-architecture.md
│   │   └── 03-technology-stack.md
│   │
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

Nimbus follows a **feature-oriented application structure** rather than organizing the backend primarily by file type. This keeps related functionality together as the platform grows.

---

## Documentation

The `docs/` directory contains the project's technical documentation and is organized according to the project's development lifecycle.

### Project Foundation

Defines the project's identity, scope, architecture, and technology decisions.

* [Project Vision](docs/00-project-foundation/00-project-vision.md)
* [Project Scope](docs/00-project-foundation/01-project-scope.md)
* [System Architecture](docs/00-project-foundation/02-system-architecture.md)
* [Technology Stack](docs/00-project-foundation/03-technology-stack.md)

### System Specification

Will define the detailed functional and technical behavior of Nimbus.

* Functional Requirements
* System Design
* Data Model
* API Design
* User Flows

### Engineering

Will document implementation and operational practices.

* Development Guide
* Security
* Testing Strategy
* Deployment
* Observability

### Project Memory

Will record architectural decisions and the evolution of the project.

* Architecture Decisions
* Project Roadmap
* Known Issues
* Future Enhancements
* Research Notes
* Glossary

See [`docs/README.md`](docs/README.md) for the complete documentation structure.

---

## Architecture

Nimbus uses a **single-host architecture**.

```text
                    ┌──────────────┐
                    │   Developer  │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Nginx     │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌──────────────┐         ┌──────────────┐
       │   Frontend   │         │   Backend    │
       │ React / Vite │────────▶│ Node/Express │
       └──────────────┘         └──────┬───────┘
                                       │
                         ┌─────────────┼─────────────┐
                         ▼             ▼             ▼
                  ┌────────────┐ ┌───────────┐ ┌──────────┐
                  │ PostgreSQL │ │  GitHub   │ │  Docker  │
                  └────────────┘ └───────────┘ │  Engine  │
                                               └────┬─────┘
                                                    │
                                  ┌─────────────────┼─────────────────┐
                                  ▼                 ▼                 ▼
                             Application       Application       Application
                              Container         Container         Container
```

Nimbus does not execute applications directly. It orchestrates Git and Docker operations while maintaining the platform's own metadata and deployment history.

---

## Project Philosophy

Nimbus is primarily an **educational platform engineering project**.

The project follows a few principles:

* **Understand before automating**
* **Build only what is necessary**
* **Keep responsibilities separate**
* **Prioritize simplicity**
* **Design for extensibility**

The objective is not to reproduce a production-scale cloud platform, but to understand the engineering concepts behind modern deployment platforms.

---

## Current Status

### Phase 1 — Project Foundation

**Status: Complete**

* [x] Project Vision
* [x] Project Scope
* [x] System Architecture
* [x] Technology Stack
* [x] Initial Repository Structure

### Phase 2 — System Specification

**Status: Next**

The next stage will define:

* Functional Requirements
* System Design
* Data Model
* API Design
* User Flows

Implementation will begin after the system specification has been sufficiently defined.

---

## Project Scope

Nimbus Semester 1 is intentionally limited to:

* A single Linux host
* Dockerized applications
* Manual deployments
* One backend server
* One frontend application
* One PostgreSQL database

The project does **not** currently aim to provide Kubernetes-based orchestration, horizontal scaling, high availability, automatic deployments, CI pipelines, or multi-node infrastructure.

These concepts may be explored in future iterations.

---

## Future Direction

After the core deployment platform is completed, Nimbus may evolve to explore:

* GitHub Webhooks
* Automatic Deployments
* CI Integration
* Deployment Queues
* Background Workers
* Monitoring and Metrics
* Custom Domains
* SSL Automation
* Notifications
* Deployment Strategies
* Container Orchestration

Future features will be introduced only when they support the project's learning and platform-engineering objectives.

---

## License

This project is licensed under the terms specified in [`LICENSE`](LICENSE).
