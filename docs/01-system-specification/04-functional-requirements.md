# Functional Requirements

## 1. Requirements Overview

Nimbus is a self-hosted Continuous Deployment (CD) platform for Dockerized applications.

This document defines the functional requirements for the Semester 1 implementation of Nimbus. It describes **what the system must do** from the perspective of its users and platform behavior.

The requirements focus on:

- GitHub-based authentication
- User and project management
- GitHub repository integration
- Dockerfile-based deployments
- Deployment lifecycle management
- Build and runtime logs
- Deployment status
- Error handling
- Basic application access through Nimbus-generated URLs

The Semester 1 implementation is intentionally limited to a **single Linux host** and a **single application container per project deployment**.

### Out of Scope

The following are not part of the current functional requirements:

- Kubernetes
- Multi-node deployments
- Docker Compose deployments
- Automatic deployments through webhooks
- CI pipeline execution
- Horizontal scaling
- Advanced monitoring and metrics
- Multi-role administration
- Production-grade infrastructure management

These may be considered in future iterations.

---

## 2. User Requirements

Nimbus shall provide authenticated users with the ability to manage and deploy their own applications.

### UR-01 — User Authentication

The system shall allow users to authenticate using their GitHub account.

### UR-02 — User Isolation

A user shall only be able to access and manage resources belonging to their own account.

### UR-03 — Project Management

An authenticated user shall be able to create, view, modify, and manage their own projects.

### UR-04 — Repository Connection

A user shall be able to connect a GitHub repository to a Nimbus project.

### UR-05 — Deployment

A user shall be able to manually initiate a deployment for a configured project.

### UR-06 — Deployment History

A user shall be able to view the deployment history of their projects.

### UR-07 — Logs

A user shall be able to view build logs and runtime logs associated with their deployments.

### UR-08 — Deployment Status

A user shall be able to view the current status of a deployment.

### UR-09 — Redeployment

A user shall be able to redeploy a previously created deployment using the same source version and deployment configuration.

### UR-10 — Application Access

A user shall be able to access a successfully deployed application through a Nimbus-generated application URL.

---

## 3. Authentication Requirements

### FR-AUTH-01 — GitHub Authentication

Nimbus shall authenticate users exclusively through GitHub OAuth.

### FR-AUTH-02 — GitHub Identity

Nimbus shall associate an authenticated Nimbus user with their GitHub identity.

### FR-AUTH-03 — Authenticated Access

Protected Nimbus resources shall only be accessible to authenticated users.

### FR-AUTH-04 — Session Management

Nimbus shall maintain an authenticated session for users after successful GitHub authentication.

### FR-AUTH-05 — Logout

Nimbus shall allow authenticated users to log out of Nimbus.

### FR-AUTH-06 — Unauthorized Access

The system shall reject requests to protected resources when the user is not authenticated.

### FR-AUTH-07 — Resource Authorization

Nimbus shall verify that the authenticated user owns a requested project, deployment, or related resource before allowing access.

---

## 4. User Management Requirements

### FR-USER-01 — User Creation

Nimbus shall create a user record when a user successfully authenticates for the first time.

### FR-USER-02 — Existing User Recognition

Nimbus shall recognize returning users using their GitHub identity.

### FR-USER-03 — Profile Information

Nimbus shall allow a user to view their associated GitHub profile information.

### FR-USER-04 — User Projects

Nimbus shall allow a user to view the projects associated with their account.

### FR-USER-05 — User Resource Isolation

Nimbus shall prevent users from viewing, modifying, deploying, or accessing resources belonging to another user.

### FR-USER-06 — User Project Management

Nimbus shall allow users to manage only projects that they own.

### FR-USER-07 — No Administrative Role

The Semester 1 implementation shall use a single user role.

Platform-wide administrative functionality shall not be required.

---

## 5. Core Feature Requirements

The core Nimbus functionality shall provide the following workflow:

```
Authenticate
    ↓
Create Project
    ↓
Connect GitHub Repository
    ↓
Configure Deployment
    ↓
Deploy
    ↓
Build
    ↓
Start Container
    ↓
Application Running
    ↓
View Logs / Status
    ↓
Redeploy when required
```

### FR-CORE-01 — Project-Based Deployment

Nimbus shall organize deployments around user-created projects.

### FR-CORE-02 — Manual Deployment

Nimbus shall allow an authenticated user to manually initiate a deployment.

### FR-CORE-03 — Deployment Tracking

Nimbus shall create a deployment record for each deployment attempt.

### FR-CORE-04 — Deployment Status

Nimbus shall maintain the current state of each deployment.

### FR-CORE-05 — Deployment History

Nimbus shall retain deployment history for projects.

### FR-CORE-06 — Deployment Logs

Nimbus shall associate build and runtime logs with their respective deployments.

### FR-CORE-07 — Application Access

Nimbus shall provide access to successfully running applications through Nimbus-generated URLs.

---

## 6. Project Management Requirements

### FR-PROJ-01 — Create Project

A user shall be able to create a new Nimbus project.

### FR-PROJ-02 — Project Name

Each project shall have a user-defined project name.

### FR-PROJ-03 — GitHub Repository

Each deployable project shall be associated with a GitHub repository.

### FR-PROJ-04 — Repository Selection

Nimbus shall allow the user to select a GitHub repository accessible through their authenticated GitHub account.

### FR-PROJ-05 — Branch Selection

Nimbus shall allow the user to configure a default Git branch for a project.

### FR-PROJ-06 — Deployment-Time Branch Selection

Nimbus shall allow the user to select a branch when initiating a deployment.

The deployment branch may differ from the project's configured default branch.

### FR-PROJ-07 — Dockerfile Requirement

A deployable repository shall contain a Dockerfile.

### FR-PROJ-08 — Docker Compose

Nimbus shall not support Docker Compose-based deployments during Semester 1.

Repositories containing Docker Compose files may exist, but Nimbus shall not use those files as the deployment definition.

### FR-PROJ-09 — Application Port

The user shall configure the application/container port required by the deployed application.

### FR-PROJ-10 — Project Modification

A user shall be able to modify the configuration of their own project.

### FR-PROJ-11 — Project Removal

A user shall be able to remove or deactivate their own project.

### FR-PROJ-12 — Project Ownership

Every project shall belong to exactly one Nimbus user.

---

## 7. Deployment / Execution Requirements

### FR-DEP-01 — Deployment Initiation

Nimbus shall allow an authenticated project owner to initiate a deployment.

### FR-DEP-02 — Repository Retrieval

Nimbus shall retrieve the configured GitHub repository for a deployment.

### FR-DEP-03 — Branch Checkout

Nimbus shall deploy the branch selected for the deployment.

### FR-DEP-04 — Dockerfile Validation

Nimbus shall verify that the repository contains a Dockerfile before attempting to build the application.

### FR-DEP-05 — Docker Image Build

Nimbus shall build a Docker image from the project's Dockerfile.

### FR-DEP-06 — Deployment Container

Nimbus shall create and start a Docker container from the successfully built image.

### FR-DEP-07 — Application Port Mapping

Nimbus shall configure the deployed container using the application port configured for the project.

### FR-DEP-08 — Deployment Status Lifecycle

A deployment shall progress through defined lifecycle states.

The Semester 1 deployment states shall include:

| Status | Description |
| --- | --- |
| `PENDING` | Deployment has been created but execution has not started. |
| `CLONING` | Nimbus is retrieving the repository. |
| `BUILDING` | Nimbus is building the Docker image. |
| `STARTING` | Nimbus is creating and starting the application container. |
| `RUNNING` | The application container is running successfully. |
| `FAILED` | The deployment failed during execution. |
| `STOPPED` | The deployed application container has been stopped. |

### FR-DEP-09 — Successful Deployment Replacement

When a new deployment succeeds, Nimbus shall replace the previously running deployment for that project.

### FR-DEP-10 — Failed Deployment Preservation

If a new deployment fails, Nimbus shall not stop the currently running deployment.

The previously successful deployment shall remain available.

### FR-DEP-11 — Deployment Record

Nimbus shall record information about each deployment attempt.

### FR-DEP-12 — Deployment Version

Each deployment shall be associated with the source version/commit used for that deployment.

### FR-DEP-13 — Redeployment

Nimbus shall allow a user to redeploy a previous deployment using the exact source version/commit associated with that deployment.

### FR-DEP-14 — New Deployment

A normal new deployment shall use the latest available commit from the branch selected for that deployment.

### FR-DEP-15 — Application URL

Nimbus shall generate an application URL for a project deployment.

### FR-DEP-16 — Local Application URL

During local development, Nimbus shall expose deployed applications through localhost-based URLs.

The exact URL routing mechanism shall be defined in the System Design and Deployment documentation.

---

## 8. Logging Requirements

Nimbus shall provide visibility into both the build process and the running application.

### FR-LOG-01 — Build Logs

Nimbus shall capture logs produced during the Docker image build process.

### FR-LOG-02 — Runtime Logs

Nimbus shall capture logs produced by the running application container.

### FR-LOG-03 — Deployment Association

Logs shall be associated with their corresponding deployment.

### FR-LOG-04 — Build Log Viewing

An authenticated project owner shall be able to view build logs for their deployments.

### FR-LOG-05 — Runtime Log Viewing

An authenticated project owner shall be able to view runtime logs for their deployments.

### FR-LOG-06 — Log Refresh

The user shall be able to refresh the displayed logs.

### FR-LOG-07 — Log Retention

Nimbus shall retain deployment logs as part of the deployment history.

### FR-LOG-08 — Log Deletion

Users shall not be able to manually clear or delete deployment logs through the Nimbus interface.

---

## 9. Monitoring Requirements

Advanced monitoring is intentionally deferred to a future semester.

### FR-MON-01 — Deployment Status

Nimbus shall provide the current deployment state of an application.

### FR-MON-02 — Basic Runtime State

Nimbus shall provide basic information indicating whether the deployed application container is running or stopped.

### FR-MON-03 — Advanced Monitoring Deferred

Nimbus shall not require CPU, memory, network, request-rate, or other resource metrics during Semester 1.

### FR-MON-04 — Monitoring Dashboard Deferred

A dedicated monitoring and metrics dashboard shall be considered a future enhancement.

### FR-MON-05 — Monitoring Infrastructure Deferred

Prometheus, Grafana, or equivalent monitoring infrastructure shall not be required for the Semester 1 implementation.

---

## 10. Error Handling Requirements

Nimbus shall provide clear feedback when an operation cannot be completed.

### FR-ERR-01 — Authentication Errors

Nimbus shall inform the user when authentication fails.

### FR-ERR-02 — Repository Errors

Nimbus shall inform the user when the configured repository cannot be accessed.

### FR-ERR-03 — Branch Errors

Nimbus shall inform the user when the selected branch cannot be found or accessed.

### FR-ERR-04 — Dockerfile Errors

Nimbus shall report an error when a required Dockerfile is missing or invalid.

### FR-ERR-05 — Build Errors

Nimbus shall report Docker image build failures.

### FR-ERR-06 — Container Errors

Nimbus shall report failures that occur while creating or starting an application container.

### FR-ERR-07 — Deployment Errors

Nimbus shall mark unsuccessful deployments as `FAILED`.

### FR-ERR-08 — User Feedback

Nimbus shall provide user-readable feedback for errors occurring during user interactions.

### FR-ERR-09 — UI Notifications

The frontend shall use toast notifications or an equivalent user-interface mechanism for appropriate success, warning, and error messages.

### FR-ERR-10 — Error Context

Where practical, error messages shall provide enough information for the user to understand which operation failed.

### FR-ERR-11 — Failed Deployment Preservation

A failed deployment shall not automatically replace a previously successful running deployment.

---

## 11. Administration Requirements

Nimbus will not implement a dedicated administration role during Semester 1.

### FR-ADM-01 — Single User Role

The Semester 1 system shall operate with a single `User` role.

### FR-ADM-02 — No Administrative Dashboard

Nimbus shall not require a platform-wide administrative dashboard.

### FR-ADM-03 — User Isolation

Platform resources shall remain isolated between users without requiring an administrator role.

### FR-ADM-04 — Future Administration

Platform-wide administration may be introduced in a future version if Nimbus evolves into a multi-user hosted platform.

Potential future administrative capabilities may include:

- User management
- Project management
- Deployment management
- Platform configuration
- System health information

These are not Semester 1 requirements.

---

## 12. Requirement IDs

Nimbus requirements shall use structured identifiers based on their functional category.

| Prefix | Category |
| --- | --- |
| `FR-AUTH` | Authentication |
| `FR-USER` | User Management |
| `FR-CORE` | Core Features |
| `FR-PROJ` | Project Management |
| `FR-DEP` | Deployment / Execution |
| `FR-LOG` | Logging |
| `FR-MON` | Monitoring |
| `FR-ERR` | Error Handling |
| `FR-ADM` | Administration |

Each requirement shall use a unique numeric identifier.

Example:

```
FR-DEP-05
```

represents the fifth requirement under Deployment / Execution.

---

## 13. Requirement Priority

Nimbus shall use three requirement priority levels.

| Priority | Meaning |
| --- | --- |
| `P0` | Must Have — required for the core Semester 1 implementation. |
| `P1` | Should Have — important functionality that supports the platform but does not define the minimum core deployment workflow. |
| `P2` | Future / Nice to Have — functionality that can be deferred without affecting the Semester 1 core platform. |

Priority indicates the importance of a requirement within the current project scope.

---

## 14. Requirement Status

Nimbus shall use the following requirement lifecycle statuses.

| Status | Meaning |
| --- | --- |
| `PLANNED` | Requirement has been defined but implementation has not started. |
| `IN PROGRESS` | Requirement is currently being implemented. |
| `IMPLEMENTED` | Requirement has been implemented. |
| `TESTED` | Requirement has been implemented and verified through testing. |
| `DEFERRED` | Requirement has intentionally been postponed to a future phase or semester. |
| `OUT OF SCOPE` | Requirement is explicitly excluded from the current project scope. |

Requirement status may change throughout the development lifecycle.

For example:

```
FR-MON-04
Priority: P2
Status: DEFERRED
```

indicates that the monitoring dashboard is recognized as a future capability but is not part of the current Semester 1 implementation.