import { Router, type Request, type Response } from 'express';

import {
    createProject,
    deleteProject,
    getProject,
    listProjects,
    ProjectConflictError,
    ProjectNotFoundError,
    ProjectValidationError,
    updateProject,
    type CreateProjectInput,
    type UpdateProjectInput,
} from './project-service.js';

import {
    requireAuth,
    type AuthenticatedRequest,
} from '../auth/auth-middleware.js';

import {
    getAvailableRepositories,
    getProjectBranches,
    getGitHubRepository,
    GitHubRepositoryError,
} from './project-github.js';

const router = Router();

router.use(requireAuth);

function getUserId(req: Request): string {
    return (req as unknown as AuthenticatedRequest).user.user_id;
}

function handleProjectError(error: unknown, res: Response): void {
    if (error instanceof ProjectValidationError) {
        res.status(422).json({
            error: {
                code: 'PROJECT_VALIDATION_FAILED',
                message: error.message,
            },
        });
        return;
    }

    if (error instanceof ProjectConflictError) {
        res.status(409).json({
            error: {
                code: 'PROJECT_CONFLICT',
                message: error.message,
            },
        });
        return;
    }

    if (error instanceof ProjectNotFoundError) {
        res.status(404).json({
            error: {
                code: 'PROJECT_NOT_FOUND',
                message: error.message,
            },
        });
        return;
    }

    console.error('Project request failed:', error);

    res.status(500).json({
        error: {
            code: 'PROJECT_OPERATION_FAILED',
            message: 'Project operation failed.',
        },
    });
}

router.get('/', async (req, res) => {
    try {
        const projects = await listProjects(
            getUserId(req),
        );

        res.json({
            data: projects,
        });
    } catch (error) {
        handleProjectError(error, res);
    }
});

router.post('/', async (req, res) => {
    try {
        const input = req.body as CreateProjectInput;

        const userId = getUserId(req);

        const repository = await getGitHubRepository(
            userId,
            input.github_repository_id,
        );

        if (
            input.repository_url !== repository.html_url
        ) {
            res.status(422).json({
                error: {
                    code: 'REPOSITORY_MISMATCH',
                    message:
                        'Repository URL does not match the selected GitHub repository.',
                },
            });
            return;
        }

        const branchExists = (
            await getProjectBranches(
                userId,
                repository.id,
            )
        ).some(
            (branch) => branch.name === input.default_branch,
        );

        if (!branchExists) {
            res.status(422).json({
                error: {
                    code: 'BRANCH_NOT_FOUND',
                    message:
                        'The selected default branch does not exist in the GitHub repository.',
                },
            });
            return;
        }

        const project = await createProject(userId, {
            ...input,
            github_repository_id: repository.id,
            repository_url: repository.html_url,
            default_branch: input.default_branch,
        });

        res.status(201).json({
            data: project,
        });
    } catch (error) {
        if (error instanceof GitHubRepositoryError) {
            res.status(422).json({
                error: {
                    code: 'GITHUB_REPOSITORY_UNAVAILABLE',
                    message: error.message,
                },
            });
            return;
        }

        handleProjectError(error, res);
    }
});

router.get('/repositories', async (req, res) => {
    try {
        const repositories = await getAvailableRepositories(
            getUserId(req),
        );

        res.json({
            data: repositories,
        });
    } catch (error) {
        if (error instanceof GitHubRepositoryError) {
            res.status(502).json({
                error: {
                    code: 'GITHUB_REPOSITORIES_UNAVAILABLE',
                    message: error.message,
                },
            });
            return;
        }

        console.error('GitHub repository discovery failed:', error);

        res.status(500).json({
            error: {
                code: 'GITHUB_REPOSITORY_DISCOVERY_FAILED',
                message: 'GitHub repository discovery failed.',
            },
        });
    }
});

router.get('/:projectId/branches', async (req, res) => {
    try {
        const project = await getProject(
            getUserId(req),
            req.params.projectId,
        );

        const branches = await getProjectBranches(
            getUserId(req),
            Number(project.github_repository_id),
        );

        res.json({
            data: branches,
        });
    } catch (error) {
        if (error instanceof ProjectNotFoundError) {
            res.status(404).json({
                error: {
                    code: 'PROJECT_NOT_FOUND',
                    message: error.message,
                },
            });
            return;
        }

        if (error instanceof GitHubRepositoryError) {
            res.status(502).json({
                error: {
                    code: 'GITHUB_BRANCHES_UNAVAILABLE',
                    message: error.message,
                },
            });
            return;
        }

        console.error('GitHub branch discovery failed:', error);

        res.status(500).json({
            error: {
                code: 'GITHUB_BRANCH_DISCOVERY_FAILED',
                message: 'GitHub branch discovery failed.',
            },
        });
    }
});

router.get('/:projectId', async (req, res) => {
    try {
        const project = await getProject(
            getUserId(req),
            req.params.projectId,
        );

        res.json({
            data: project,
        });
    } catch (error) {
        handleProjectError(error, res);
    }
});

router.patch('/:projectId', async (req, res) => {
    try {
        const input = req.body as UpdateProjectInput;

        const project = await updateProject(
            getUserId(req),
            req.params.projectId,
            input,
        );

        res.json({
            data: project,
        });
    } catch (error) {
        handleProjectError(error, res);
    }
});

router.delete('/:projectId', async (req, res) => {
    try {
        await deleteProject(
            getUserId(req),
            req.params.projectId,
        );

        res.status(204).send();
    } catch (error) {
        handleProjectError(error, res);
    }
});

export default router;