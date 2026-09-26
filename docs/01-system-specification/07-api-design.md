# API Design

## 1. API Overview

Nimbus exposes a REST-style HTTP API used by the React frontend and backend services.

The API is responsible for:

- Authentication
- User information
- Project management
- GitHub repository discovery
- Branch discovery
- Deployment creation
- Deployment history
- Deployment control
- Build and runtime logs

The API is versioned from the beginning using:

```
/api/v1
```

### API Principles

- REST-style resource endpoints
- JSON request and response bodies
- HTTP status codes communicate request results
- Authenticated resources are scoped to the current user
- Deployment operations execute asynchronously
- Consistent error response format
- API versioning through URL paths
- No administrative API in Semester 1

---

## 2. API Architecture

The API follows the backend's feature-oriented architecture.

```
React Frontend
      │
      ▼
   Nginx
      │
      ▼
Express API
      │
      ▼
Authentication Middleware
      │
      ▼
Routes
      │
      ▼
Controllers
      │
      ▼
Services
      │
      ├──────────────► PostgreSQL
      │
      ├──────────────► GitHub
      │
      └──────────────► Docker
```

### Backend Request Layers

```
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Repository / External Module
  ↓
Database / GitHub / Docker
```

### Resource Ownership

Authenticated resource endpoints operate within the current user's authorization scope.

For example:

```
GET /api/v1/projects
```

returns projects belonging to the **currently authenticated user only**.

A user cannot retrieve, modify or delete another user's projects by changing an ID in the request.

---

## 3. Base URL

The API is versioned under:

```
/api/v1
```

During local development, the API may be exposed through the Nimbus backend directly, for example:

```
http://localhost:5000/api/v1
```

The exact development port is configurable.

In the deployed Nimbus environment, Nginx acts as the reverse proxy in front of the API.

### Endpoint Examples

```
GET  /api/v1/auth/me
GET  /api/v1/projects
GET  /api/v1/projects/:projectId
POST /api/v1/projects/:projectId/deployments
```

---

## 4. Authentication

Nimbus uses GitHub OAuth for authentication.

Authentication is handled through HTTP-only secure cookies containing the authenticated session.

### Authentication Flow

```
Browser
   │
   │ Login
   ▼
GET /api/v1/auth/github
   │
   ▼
GitHub OAuth
   │
   ▼
GET /api/v1/auth/github/callback
   │
   ▼
Create / Update User
   │
   ▼
Create Session
   │
   ▼
HTTP-only Cookie
```

### Authentication Endpoints

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/auth/github` | No | Start GitHub OAuth |
| GET | `/api/v1/auth/github/callback` | No | Handle OAuth callback |
| POST | `/api/v1/auth/logout` | Yes | Logout current session |
| GET | `/api/v1/auth/me` | Yes | Return authenticated user |

### Protected Requests

Authenticated requests automatically include the session cookie.

The backend validates the session before allowing access to protected resources.

---

## 5. Request Conventions

### Content Type

JSON is used for normal API requests.

```
Content-Type: application/json
```

OAuth redirects are handled separately.

---

### Request Body

Request bodies use JSON.

Example:

```json
{
  "project_name": "my-api",
  "repository_url": "https://github.com/user/my-api",
  "default_branch": "main",
  "container_port": 3000
}
```

---

### Resource IDs

Nimbus uses UUID-based identifiers for internal resources.

Examples:

```
:userId
:projectId
:deploymentId
```

---

### Authentication

Protected requests rely on the authenticated session cookie rather than requiring a user ID in the request body.

For example:

```
GET /api/v1/projects
```

does not require:

```json
{
  "user_id": "..."
}
```

The user is determined from the authenticated session.

---

### Repository Input

Nimbus supports two ways to select a GitHub repository.

#### Repository Discovery

The frontend can retrieve repositories available to the authenticated GitHub user:

```
GET /api/v1/projects/repositories
```

The user can select one from the returned list.

#### Manual Repository URL

The user can also provide a GitHub repository URL manually.

Example:

```json
{
  "repository_url": "https://github.com/user/my-api"
}
```

Nimbus validates that the repository can be accessed through the authenticated GitHub identity.

---

## 6. Response Conventions

Successful API responses use a consistent `data` wrapper.

Example:

```json
{
  "data": {
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "my-api"
  }
}
```

Collections also use the `data` property.

```json
{
  "data": [
    {
      "project_id": "...",
      "project_name": "my-api"
    },
    {
      "project_id": "...",
      "project_name": "frontend"
    }
  ]
}
```

Paginated responses additionally contain pagination metadata.

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

### Response Principles

- Use appropriate HTTP status codes.
- Return JSON for normal API responses.
- Keep response structures consistent.
- Do not expose internal implementation details.
- Do not expose sensitive authentication information.

---

## 7. Error Response Format

API errors use a consistent structure:

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project was not found."
  }
}
```

### Error Fields

| Field | Description |
| --- | --- |
| `code` | Machine-readable error identifier |
| `message` | Human-readable error message |

### Example Errors

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication is required."
  }
}
```

```json
{
  "error": {
    "code": "DOCKERFILE_NOT_FOUND",
    "message": "Dockerfile not found in selected branch."
  }
}
```

```json
{
  "error": {
    "code": "DEPLOYMENT_IN_PROGRESS",
    "message": "A deployment is already in progress for this project."
  }
}
```

---

## 8. HTTP Status Codes

Nimbus uses standard HTTP status codes.

| Status | Usage |
| --- | --- |
| `200 OK` | Successful request |
| `201 Created` | Resource successfully created |
| `202 Accepted` | Asynchronous operation accepted |
| `204 No Content` | Successful operation with no response body |
| `400 Bad Request` | Invalid request |
| `401 Unauthorized` | Authentication required or invalid |
| `403 Forbidden` | Authenticated user is not authorized |
| `404 Not Found` | Resource does not exist or is inaccessible |
| `409 Conflict` | Request conflicts with current resource state |
| `422 Unprocessable Entity` | Validation failure |
| `429 Too Many Requests` | Rate limit exceeded, if rate limiting is introduced |
| `500 Internal Server Error` | Unexpected server error |
| `502 Bad Gateway` | External dependency failure where appropriate |
| `503 Service Unavailable` | Required service temporarily unavailable |

---

## 9. Authentication Endpoints

### Start GitHub OAuth

```
GET /api/v1/auth/github
```

Starts the GitHub OAuth authentication flow.

No authentication is required.

---

### GitHub OAuth Callback

```
GET /api/v1/auth/github/callback
```

GitHub redirects the user to this endpoint after authorization.

Nimbus:

1. Validates the OAuth response.
2. Retrieves GitHub user information.
3. Creates or updates the Nimbus user.
4. Creates an authenticated session.
5. Sets the HTTP-only secure cookie.
6. Redirects the user to the Nimbus frontend.

---

### Logout

```
POST /api/v1/auth/logout
```

Invalidates the current session.

Response:

```
204 No Content
```

---

### Current Authentication

```
GET /api/v1/auth/me
```

Returns the currently authenticated user.

Example:

```json
{
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "github_id": 12345678,
    "github_username": "example-user",
    "email": "user@example.com",
    "avatar_url": "https://github.com/example-user.png"
  }
}
```

---

## 10. User Endpoints

### Get Current User

```
GET /api/v1/users/me
```

Returns the authenticated user's Nimbus/GitHub profile.

The endpoint only returns information belonging to the current session.

---

### Update User

No general user profile update endpoint is implemented in Semester 1.

GitHub-controlled information such as:

- Username
- Email
- Profile picture

is read from or synchronized with GitHub.

Nimbus does not allow users to independently modify these identity fields through the API.

---

## 11. Core Feature Endpoints

## 11.1 Project Endpoints

### List Current User's Projects

```
GET /api/v1/projects
```

Returns only projects owned by the authenticated user.

Example:

```json
{
  "data": [
    {
      "project_id": "...",
      "project_name": "my-api",
      "repository_url": "https://github.com/user/my-api",
      "default_branch": "main",
      "container_port": 3000,
      "is_active": true
    }
  ]
}
```

---

### Create Project

```
POST /api/v1/projects
```

Creates a project belonging to the authenticated user.

Example:

```json
{
  "project_name": "my-api",
  "repository_url": "https://github.com/user/my-api",
  "default_branch": "main",
  "container_port": 3000
}
```

Nimbus validates:

- Project name
- Repository URL
- GitHub repository
- Default branch
- Container port
- Current user's ownership/access

Response:

```
201 Created
```

---

### Get Project

```
GET /api/v1/projects/:projectId
```

Returns the specified project only if it belongs to the authenticated user.

---

### Update Project

```
PATCH /api/v1/projects/:projectId
```

Updates project configuration.

Possible fields include:

```json
{
  "project_name": "updated-api",
  "repository_url": "https://github.com/user/updated-api",
  "default_branch": "develop",
  "container_port": 8080
}
```

The endpoint cannot modify historical deployment snapshots.

---

### Deactivate Project

```
DELETE /api/v1/projects/:projectId
```

Performs a soft deletion/deactivation.

If the project has an active deployment, Nimbus warns the user before stopping the active container and deactivating the project.

The project and deployment history remain in the database.

---

## 11.2 GitHub Repository Endpoints

### List Available Repositories

```
GET /api/v1/projects/repositories
```

Returns repositories available to the authenticated GitHub user.

This supports repository selection during project creation.

---

### Repository URL Input

Users may alternatively provide a GitHub repository URL directly when creating or updating a project.

Example:

```json
{
  "repository_url": "https://github.com/user/my-api"
}
```

Nimbus validates repository availability before accepting the configuration.

---

## 11.3 Branch Endpoints

### List Repository Branches

```
GET /api/v1/projects/:projectId/branches
```

Returns available branches for the project's configured GitHub repository.

Example:

```json
{
  "data": [
    {
      "name": "main"
    },
    {
      "name": "develop"
    },
    {
      "name": "feature/auth"
    }
  ]
}
```

Branches can be selected during deployment.

---

## 11.4 Deployment Endpoints

### List Project Deployments

```
GET /api/v1/projects/:projectId/deployments
```

Returns deployment history for the authenticated user's project.

---

### Create Deployment

```
POST /api/v1/projects/:projectId/deployments
```

Creates a new deployment using the latest commit from the selected branch.

Example:

```json
{
  "branch": "main"
}
```

Nimbus:

1. Validates project ownership.
2. Validates the selected branch.
3. Retrieves the latest commit.
4. Creates a deployment record.
5. Stores the deployment configuration snapshot.
6. Starts the deployment worker.
7. Returns the deployment information.

Response:

```
202 Accepted
```

Example:

```json
{
  "data": {
    "deployment_id": "...",
    "status": "PENDING"
  }
}
```

---

### Get Deployment

```
GET /api/v1/deployments/:deploymentId
```

Returns deployment status and metadata.

Example:

```json
{
  "data": {
    "deployment_id": "...",
    "project_id": "...",
    "branch": "main",
    "commit_sha": "abc123...",
    "status": "RUNNING",
    "host_port": 48123,
    "url": "http://localhost/my-api"
  }
}
```

---

### Redeploy

```
POST /api/v1/deployments/:deploymentId/redeploy
```

Creates a new deployment using the exact commit associated with the selected previous deployment.

The client does not need to provide the commit SHA.

Example response:

```
202 Accepted
```

```json
{
  "data": {
    "deployment_id": "...",
    "status": "PENDING",
    "source_deployment_id": "..."
  }
}
```

---

### Cancel Deployment

```
POST /api/v1/deployments/:deploymentId/cancel
```

Cancels a deployment that is currently in progress.

A cancelled deployment receives:

```
CANCELLED
```

Its deployment record and relevant logs remain available.

---

### Stop Running Deployment

```
POST /api/v1/deployments/:deploymentId/stop
```

Stops a currently running deployment.

The deployment transitions to:

```
STOPPED
```

The operation does not delete the deployment's historical record.

---

## 11.5 Log Endpoints

### Get Deployment Logs

```
GET /api/v1/deployments/:deploymentId/logs?type=build
```

or:

```
GET /api/v1/deployments/:deploymentId/logs?type=runtime
```

The `type` parameter determines which log stream is returned.

Supported values:

```
build
runtime
```

Logs are read from the filesystem using the deployment ID.

Users cannot delete logs through the API.

---

## 11.6 Deployment Status and URL

Deployment responses include relevant runtime information when available.

Example:

```json
{
  "data": {
    "deployment_id": "...",
    "status": "RUNNING",
    "host_port": 48123,
    "url": "http://localhost/my-api"
  }
}
```

The generated URL represents the deployed application endpoint exposed through Nimbus/Nginx.

---

## 12. Administrative Endpoints

No administrative API endpoints are implemented in Semester 1.

There is currently no `Admin` application role.

Future versions may introduce administrative functionality for areas such as:

- User management
- Project management
- Platform configuration
- Runtime inspection
- System administration

These are outside the current API scope.

---

## 13. Request Validation

Nimbus validates incoming requests before executing business logic.

### Authentication Validation

Protected endpoints verify:

- Session existence
- Session validity
- Session expiration
- Session revocation
- Active user status

---

### Project Validation

Project requests validate:

- Project name
- Repository URL
- GitHub repository accessibility
- Default branch
- Container port
- Project ownership

---

### Deployment Validation

Deployment requests validate:

- Project ownership
- Project active status
- Selected branch
- Deployment state
- Existing deployment operation
- Repository availability

---

### Port Validation

Container ports and host ports must fall within:

```
1–65535
```

Host ports are allocated automatically by Nimbus.

---

### Dockerfile Validation

A deployment source must contain a Dockerfile.

If no Dockerfile exists:

```
HTTP 422
```

with:

```json
{
  "error": {
    "code": "DOCKERFILE_NOT_FOUND",
    "message": "Dockerfile not found in selected branch."
  }
}
```

---

## 14. Pagination

Pagination is used for collections where the number of records can grow, particularly deployment history.

### Query Parameters

```
?page=1&limit=20
```

Defaults:

```
page = 1
limit = 20
```

Example:

```
GET /api/v1/projects/:projectId/deployments?page=1&limit=20
```

### Response

```json
{
  "data": [
    {
      "deployment_id": "...",
      "status": "RUNNING"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

Pagination limits should be validated to prevent excessively large requests.

---

## 15. Filtering

Semester 1 uses simple filtering.

### Deployment Status

```
GET /api/v1/projects/:projectId/deployments?status=FAILED
```

Supported status values correspond to the deployment status enum:

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

Additional complex filtering is not required for Semester 1.

---

## 16. Sorting

Collection endpoints can support sorting through:

```
?sort=created_at&order=desc
```

Example:

```
GET /api/v1/projects/:projectId/deployments?sort=created_at&order=desc
```

Default deployment history ordering is:

```
created_at DESC
```

This displays the newest deployments first.

---

## 17. Rate Limiting

No dedicated API rate-limiting system is implemented in Semester 1.

This is appropriate for the current architecture because Nimbus is:

- Self-hosted
- Running on a single host
- Intended as a college coursework project
- Not serving a large public user base

Rate limiting can be introduced as a future security and scalability enhancement.

The API reserves:

```
429 Too Many Requests
```

for future use if rate limiting is added.

---

## 18. API Versioning

Nimbus uses URL-based API versioning.

Current version:

```
/api/v1
```

Examples:

```
/api/v1/auth/me
/api/v1/projects
/api/v1/projects/:projectId
/api/v1/deployments/:deploymentId
```

### Versioning Principle

Breaking API changes should result in a new API version.

For example:

```
/api/v1/...
/api/v2/...
```

Version `v2` is not required unless a future change introduces incompatible API behavior.

---

## 19. Example Requests

### Get Current User

```
GET /api/v1/auth/me
```

---

### Create Project

```
POST /api/v1/projects
Content-Type: application/json
```

```json
{
  "project_name": "my-api",
  "repository_url": "https://github.com/user/my-api",
  "default_branch": "main",
  "container_port": 3000
}
```

---

### List Projects

```
GET /api/v1/projects
```

The response contains only projects owned by the authenticated user.

---

### List Repository Branches

```
GET /api/v1/projects/550e8400-e29b-41d4-a716-446655440000/branches
```

---

### Create Deployment

```
POST /api/v1/projects/550e8400-e29b-41d4-a716-446655440000/deployments
Content-Type: application/json
```

```json
{
  "branch": "main"
}
```

---

### Get Deployment

```
GET /api/v1/deployments/550e8400-e29b-41d4-a716-446655440000
```

---

### Redeploy

```
POST /api/v1/deployments/550e8400-e29b-41d4-a716-446655440000/redeploy
```

No request body is required.

---

### Stop Deployment

```
POST /api/v1/deployments/550e8400-e29b-41d4-a716-446655440000/stop
```

---

### Retrieve Build Logs

```
GET /api/v1/deployments/550e8400-e29b-41d4-a716-446655440000/logs?type=build
```

---

### Retrieve Runtime Logs

```
GET /api/v1/deployments/550e8400-e29b-41d4-a716-446655440000/logs?type=runtime
```

---

### Filter Deployment History

```
GET /api/v1/projects/550e8400-e29b-41d4-a716-446655440000/deployments?status=FAILED
```

---

### Paginate Deployment History

```
GET /api/v1/projects/550e8400-e29b-41d4-a716-446655440000/deployments?page=1&limit=20
```

---

## 20. Example Responses

### Successful Project Creation

```json
{
  "data": {
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "my-api",
    "repository_url": "https://github.com/user/my-api",
    "default_branch": "main",
    "container_port": 3000,
    "is_active": true
  }
}
```

---

### Deployment Accepted

```json
{
  "data": {
    "deployment_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "PENDING"
  }
}
```

The `202 Accepted` response indicates that the deployment request was accepted and will continue asynchronously.

---

### Running Deployment

```json
{
  "data": {
    "deployment_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "branch": "main",
    "commit_sha": "abc123def456",
    "status": "RUNNING",
    "host_port": 48123,
    "url": "http://localhost/my-api"
  }
}
```

---

### Failed Deployment

```json
{
  "data": {
    "deployment_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "status": "FAILED",
    "error_message": "Dockerfile not found in selected branch."
  }
}
```

---

### Inaccessible Resource

If a user attempts to access another user's project, Nimbus returns the same response used when the project does not exist:

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project was not found."
  }
}
```

---

### Resource Not Found

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project was not found."
  }
}
```

For protected resources, Nimbus should avoid unnecessarily revealing whether a resource belonging to another user exists.

---

### Validation Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Container port must be between 1 and 65535."
  }
}
```