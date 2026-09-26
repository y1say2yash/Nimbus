# User Flows

## 1. Overview

This document defines the primary user journeys and interface flows for Nimbus.

Nimbus is designed around a simple workflow:

```
Authenticate
    ↓
Dashboard
    ↓
Create / Select Project
    ↓
Configure Project
    ↓
Deploy
    ↓
Monitor Deployment Status
    ↓
Access Application
    ↓
Redeploy / Stop / View Logs
```

The flows describe how a developer interacts with Nimbus rather than the internal implementation of each operation.

---

# 2. User Personas

## 2.1 Developer / User

The only application persona in Semester 1 is the **Developer / User**.

The user can:

- Authenticate using GitHub
- View their profile
- View their own projects
- Create and configure projects
- Connect GitHub repositories
- Select branches
- Deploy applications
- View deployment status
- View deployment history
- View build and runtime logs
- Redeploy previous deployments
- Cancel in-progress deployments
- Stop running deployments
- Deactivate their projects

Nimbus does not include an Admin persona or administrative user interface in Semester 1.

---

# 3. Authentication Flow

Nimbus uses GitHub OAuth for authentication.

```
User
  │
  ▼
Nimbus Login
  │
  ▼
"Continue with GitHub"
  │
  ▼
GitHub OAuth
  │
  ├── Authorization denied
  │        ↓
  │    Return to Nimbus
  │    Show authentication error
  │
  └── Authorization successful
           ↓
      GitHub Callback
           ↓
      Create / Update User
           ↓
      Create Session
           ↓
      Set HTTP-only Cookie
           ↓
      Nimbus Dashboard
```

### Returning User

For an existing authenticated user:

```
Open Nimbus
    ↓
Session Cookie
    ↓
Validate Session
    ↓
Authenticated
    ↓
Dashboard
```

If the session is invalid or expired:

```
Invalid Session
      ↓
Login Screen
      ↓
GitHub OAuth
```

---

# 4. Onboarding Flow

After successful GitHub authentication, Nimbus checks whether the user already has projects.

```
GitHub Login
     ↓
Dashboard
     ↓
Has Projects?
   ┌───────┴────────┐
   │                │
  No               Yes
   │                │
   ▼                ▼
Empty State       Dashboard
   │
   ▼
"Create Project"
```

## New User

A new user with no projects sees an empty-state dashboard.

The empty state should clearly explain that the user can connect a GitHub repository and create their first Nimbus project.

Primary action:

```
Create Project
```

## Existing User

A user who already has projects is taken directly to the normal dashboard.

The dashboard can show:

- Projects
- Current deployment status
- Recent deployments
- Application URLs
- Relevant deployment actions

---

# 5. Main User Journey

The primary Nimbus journey is:

```
Login
  ↓
Dashboard
  ↓
Create Project
  ↓
Configure Project
  ↓
Project Created
  ↓
Project Details
  ↓
Deploy
  ↓
Select Branch
  ↓
Confirm Deployment
  ↓
Deployment Starts
  ↓
Poll Deployment Status
  ↓
Build / Start / Health Verification
  ↓
Running
  ↓
Application URL
```

After deployment, the user can:

```
Running Application
       │
       ├── View Logs
       ├── View Deployment History
       ├── Redeploy
       └── Stop Deployment
```

---

# 6. Core Feature Flow

The core Nimbus feature is deploying a Dockerized application from GitHub.

```
GitHub Repository
       ↓
Nimbus Project
       ↓
Selected Branch
       ↓
Deployment
       ↓
Clone Source
       ↓
Build Docker Image
       ↓
Start Container
       ↓
Health Verification
       ↓
Expose Application
       ↓
Generated URL
```

The user does not need to manually execute Docker commands.

Nimbus handles the deployment workflow behind the interface.

---

# 7. Create / Configure Flow

Project creation is separate from deployment.

```
Dashboard
    ↓
Create Project
    ↓
Project Name
    ↓
Choose Repository
    ├── Select GitHub Repository
    └── Enter Repository URL
    ↓
Select Default Branch
    ↓
Configure Container Port
    ↓
Review Configuration
    ↓
Create Project
    ↓
Project Details
```

## Repository Selection

The user can either:

- Select a repository discovered through GitHub
- Enter a GitHub repository URL manually

Nimbus validates that the authenticated GitHub identity can access the repository.

## Project Configuration

The user provides:

```
Project Name
Repository
Default Branch
Container Port
```

The container port represents the port on which the application listens inside its Docker container.

Nimbus automatically handles host-port allocation.

## After Creation

Creating a project does **not** automatically deploy it.

The user is taken to the project view and can explicitly choose:

```
Deploy
```

This keeps project configuration and deployment as separate actions.

---

# 8. Deploy Flow

Deployment is an explicit user action.

```
Project View
     ↓
Deploy
     ↓
Select Branch
     ↓
Review Deployment
     ↓
Confirm
     ↓
Create Deployment
     ↓
202 Accepted
     ↓
Deployment Progress
```

The selected branch determines the source commit for a new deployment.

Nimbus uses the latest commit available on that branch.

## Deployment Progress

The user sees the current deployment state:

```
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

The frontend periodically polls the deployment endpoint to retrieve updated status.

Polling continues while the deployment is active.

Example:

```
Frontend
   │
   ├── GET deployment status
   │
   ├── wait
   │
   ├── GET deployment status
   │
   ├── wait
   │
   └── GET deployment status
```

Polling stops when the deployment reaches a terminal state.

Terminal states include:

```
RUNNING
FAILED
CANCELLED
STOPPED
```

## Successful Deployment

```
Health Verification
       ↓
Successful
       ↓
Deployment RUNNING
       ↓
Application URL displayed
       ↓
User can open application
```

When replacing an existing deployment:

```
New Deployment
      ↓
Build
      ↓
Start New Container
      ↓
Verify New Container
      ↓
Stop Previous Active Container
      ↓
New Deployment Active
```

The previous deployment is not stopped until the new deployment has successfully started and passed runtime verification.

---

# 9. Redeploy Flow

Redeployment creates a new deployment using the **exact commit** associated with a previous deployment.

```
Project View
     ↓
Deployment History
     ↓
Select Previous Deployment
     ↓
Redeploy
     ↓
Confirmation
     ↓
Create New Deployment
     ↓
Use Exact Previous Commit
     ↓
Normal Deployment Flow
```

The previous deployment remains part of the deployment history.

The redeployment creates a new deployment record.

```
Deployment A
commit: abc123
     │
     │ Redeploy
     ▼
Deployment B
commit: abc123
```

The commit is the same, but the deployment records are separate.

---

# 10. Failure Flow

A deployment can fail during cloning, building, starting, or runtime verification.

```
Deployment
     ↓
Failure
     ↓
Mark Deployment FAILED
     ↓
Capture Error
     ↓
Write Logs
     ↓
Clean Temporary Resources
     ↓
Keep Previous Active Deployment
     ↓
Show Failure State
```

If a previous deployment is currently running, it remains available when the new deployment fails.

```
Previous Deployment
       │
       │ RUNNING
       ▼
New Deployment
       │
       ▼
FAILED
       │
       ▼
Previous Deployment remains RUNNING
```

The user can inspect the error and logs before attempting another deployment.

### Example

```
Deployment Failed

Dockerfile not found in selected branch.

[View Build Logs]
[Try Again]
```

The exact presentation can vary by error type, but the underlying failure should be clearly understandable to the user.

---

# 11. Deployment Status Flow

Semester 1 does not provide a full runtime metrics monitoring dashboard.

Instead, Nimbus provides deployment and runtime status information.

The user can see:

- Current deployment status
- Deployment history
- Build status
- Container status
- Application URL
- Build logs
- Runtime logs

Example:

```
Project
  │
  ├── Current Status: RUNNING
  ├── Application URL
  ├── Current Deployment
  ├── Deployment History
  └── Logs
       ├── Build
       └── Runtime
```

### Status Polling

The frontend periodically polls active deployments.

Polling is used instead of WebSockets or Server-Sent Events in Semester 1.

Polling frequency should be configurable and reasonable for the self-hosted environment.

Logs can also refresh automatically at defined intervals while a deployment is active.

Once the deployment reaches a terminal state, automatic polling stops.

### Out of Scope

The following are not part of Semester 1 monitoring:

- CPU usage
- Memory usage
- Network usage
- Container resource graphs
- Historical infrastructure metrics
- Alerting

---

# 12. Error States

Nimbus uses three levels of error presentation.

## 12.1 Inline Validation

Used for errors directly related to user input.

Examples:

```
Project name is required.

Container port must be between 1 and 65535.

Repository URL is invalid.
```

Inline validation appears close to the relevant field.

---

## 12.2 Toast Notifications

Used for short-lived operation feedback.

Examples:

```
Project created successfully.

Deployment started.

Deployment stopped.

Deployment cancelled.

Project configuration updated.
```

Errors can also generate a toast:

```
Deployment failed. View deployment details for more information.
```

Toasts should not be the only place where important deployment errors are displayed.

---

## 12.3 Persistent Error State

Important operational errors are displayed prominently in the relevant project or deployment view.

Examples:

```
Deployment Failed

Dockerfile not found in selected branch.

[View Build Logs]
[Deploy Again]
```

or:

```
Repository Unavailable

Nimbus could not access the configured GitHub repository.

Check repository access and configuration before trying again.
```

Persistent errors remain visible until the relevant state changes or the user navigates away.

This ensures important errors are not lost when a toast disappears.

---

# 13. Edge Cases

## 13.1 Repository Unavailable

```
Repository
    ↓
Access / availability check fails
    ↓
Show repository error
    ↓
Do not start deployment
```

The user can update the repository configuration and try again.

---

## 13.2 Branch Unavailable

If the selected branch no longer exists:

```
Deployment
    ↓
Branch validation fails
    ↓
Show branch error
    ↓
Deployment does not proceed
```

The user can select another available branch.

---

## 13.3 Dockerfile Missing

```
Source
   ↓
Dockerfile not found
   ↓
Deployment FAILED
```

The error is shown prominently and build logs remain available.

---

## 13.4 Port Conflict

If an automatically selected host port is unavailable, Nimbus selects another available host port.

The user does not manually manage host-port allocation.

---

## 13.5 Deployment Already in Progress

If a deployment is already running for the same project:

```
User selects Deploy
       ↓
Existing deployment operation detected
       ↓
Confirmation / warning
       ↓
User decides whether to continue
```

Nimbus allows different projects to deploy concurrently.

The deployment concurrency restriction applies per project.

---

## 13.6 User Cancels Deployment

For an in-progress deployment:

```
Cancel
  ↓
Confirmation
  ↓
Deployment CANCELLED
  ↓
Cleanup
```

The deployment record and relevant logs remain available.

---

## 13.7 User Stops Running Deployment

For a running deployment:

```
Stop
  ↓
Confirmation
  ↓
Container stopped
  ↓
Deployment STOPPED
```

The historical deployment record remains available.

---

## 13.8 Failed New Deployment

If the current active deployment is healthy and a new deployment fails:

```
Old Deployment → remains RUNNING

New Deployment → FAILED
```

Nimbus does not replace a working deployment with a failed one.

---

## 13.9 Project Deactivation

When a user deactivates a project:

```
Delete / Deactivate Project
        ↓
Confirmation
        ↓
Active deployment?
   ┌────┴────┐
   │         │
  Yes        No
   │         │
   ▼         │
Warn user    │
   │         │
   └────┬────┘
        ↓
Stop active container if required
        ↓
Deactivate Project
        ↓
Keep historical records
```

Project deactivation is a soft operation.

---

## 13.10 Unauthorized Resource Access

Nimbus scopes resources to the authenticated user.

```
User Request
     ↓
Authenticate
     ↓
Find Resource Within User Scope
     ↓
 ┌───┴───────────────┐
 │                   │
Found             Not Found /
 │                Not Accessible
 ▼                   ▼
Continue             404
```

Nimbus returns `404 Not Found` rather than revealing whether another user's resource exists.

This applies consistently to projects, deployments and associated logs.

---

# 14. UI Navigation

Nimbus uses a simple **single-level left navigation**.

There is no separate nested project navigation.

Conceptually:

```
┌──────────────────────────────────────────┐
│ Nimbus                                   │
│                                          │
│  Dashboard                               │
│  Projects                                │
│  Deployments                             │
│                                          │
│                                          │
│                                          │
│                                          │
│                                          │
│  ──────────────────────────────────────  │
│  [PFP] GitHub Username                   │
└──────────────────────────────────────────┘
```

The exact visual design can evolve during frontend implementation.

## Navigation Items

### Dashboard

Provides the main overview of the user's Nimbus environment.

Possible information:

- Projects
- Active deployments
- Recent deployment activity
- Application status

---

### Projects

Displays the user's projects.

From a project, the user can access its relevant information without requiring a separate nested navigation system.

A project view can contain:

```
Project Information
Repository Configuration
Current Deployment
Deployment History
Logs
Application URL
Actions
```

---

### Deployments

Provides a broader view of the user's deployment activity.

Deployment information remains scoped to projects owned by the authenticated user.

---

### Profile

The profile section is positioned at the bottom of the left navigation.

It displays basic GitHub identity information:

```
[PFP]
GitHub Username
```

Selecting the profile area can open the user's profile/account view.

GitHub-controlled identity fields remain read-only from Nimbus.

---

# 15. User Journey Diagrams

## 15.1 New User Journey

```
┌──────────────┐
│    Login     │
└──────┬───────┘
       ↓
┌──────────────┐
│ GitHub OAuth │
└──────┬───────┘
       ↓
┌──────────────┐
│   Dashboard  │
└──────┬───────┘
       ↓
┌──────────────┐
│ No Projects  │
└──────┬───────┘
       ↓
┌──────────────┐
│Create Project│
└──────┬───────┘
       ↓
┌──────────────┐
│  Configure   │
└──────┬───────┘
       ↓
┌──────────────┐
│Project View  │
└──────────────┘
```

---

## 15.2 Existing User Journey

```
┌──────────────┐
│    Login     │
└──────┬───────┘
       ↓
┌──────────────┐
│ GitHub OAuth │
└──────┬───────┘
       ↓
┌──────────────┐
│   Dashboard  │
└──────┬───────┘
       ↓
┌──────────────┐
│ View Projects│
└──────┬───────┘
       ↓
┌──────────────┐
│ Select Project│
└──────────────┘
```

---

## 15.3 Deployment Journey

```
┌───────────────┐
│ Project View  │
└───────┬───────┘
        ↓
┌───────────────┐
│    Deploy     │
└───────┬───────┘
        ↓
┌───────────────┐
│ Select Branch │
└───────┬───────┘
        ↓
┌───────────────┐
│    Confirm    │
└───────┬───────┘
        ↓
┌───────────────┐
│    PENDING    │
└───────┬───────┘
        ↓
┌───────────────┐
│    CLONING    │
└───────┬───────┘
        ↓
┌───────────────┐
│   BUILDING    │
└───────┬───────┘
        ↓
┌───────────────┐
│   STARTING    │
└───────┬───────┘
        ↓
┌───────────────┐
│ Health Check  │
└───────┬───────┘
        ↓
┌───────────────┐
│    RUNNING    │
└───────┬───────┘
        ↓
┌───────────────┐
│ Application   │
│     URL       │
└───────────────┘
```

---

## 15.4 Deployment Failure Journey

```
             Deployment
                  │
                  ▼
             ┌─────────┐
             │ Running │
             │ Process │
             └────┬────┘
                  │
                  ▼
              Error
                  │
                  ▼
             ┌─────────┐
             │ FAILED  │
             └────┬────┘
                  │
        ┌─────────┴─────────┐
        ↓                   ↓
   Show Error           Save Logs
        │                   │
        └─────────┬─────────┘
                  ↓
       Keep Previous Active
          Deployment
                  │
                  ▼
          User Investigates
                  │
                  ▼
             Deploy Again
```

---

## 15.5 Redeployment Journey

```
Deployment History
        ↓
Select Deployment
        ↓
     Redeploy
        ↓
   Confirmation
        ↓
Exact Previous Commit
        ↓
New Deployment
        ↓
Normal Deployment Flow
```

---

## 15.6 Runtime Control Journey

```
                    Project
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
       Deploy       Logs        History
          │
          ↓
       RUNNING
          │
     ┌────┴─────┐
     ↓          ↓
   Stop      Redeploy
     ↓          ↓
 STOPPED    New Deployment
```

---

# 16. Flow Design Principles

Nimbus user flows follow these principles:

### Explicit Actions

Important operations such as deployment, redeployment, stopping and project deactivation require deliberate user actions.

### Clear State

The interface should always communicate the current deployment state.

### Safe Replacement

A new deployment must succeed before replacing an existing active deployment.

### Recoverable Failures

Deployment failures should preserve the previous active deployment whenever possible.

### Visible Errors

Important errors should not depend only on temporary notifications.

### Simple Interaction

Semester 1 avoids unnecessary complexity such as real-time sockets, advanced monitoring dashboards and administrative workflows.

### User Ownership

Users can only interact with resources belonging to their own account.

### Consistent Feedback

Operations should provide appropriate inline validation, toast notifications and persistent error states.

---

# 17. Semester 1 Flow Boundaries

The following workflows are intentionally outside the Semester 1 user flows:

- Automatic deployments
- GitHub webhooks
- CI pipeline configuration
- Kubernetes deployment
- Multi-node deployments
- Automatic horizontal scaling
- Runtime metrics dashboards
- Infrastructure alerting
- Admin workflows
- Advanced team collaboration
- Multiple application environments
- Deployment scheduling