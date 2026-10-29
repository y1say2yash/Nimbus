import {
    Router,
    type Request,
    type Response,
} from 'express';

import {
    requireAuth,
    type AuthenticatedRequest,
} from '../auth/auth-middleware.js';

import {
    cancelDeployment,
    createDeployment,
    DeploymentConflictError,
    DeploymentNotFoundError,
    DeploymentProjectNotFoundError,
    DeploymentStateError,
    getDeployment,
    getDeploymentLogs,
    listDeployments,
    redeployDeployment,
    stopDeployment,
} from './deployment-service.js';

const router = Router();

router.use(requireAuth);

const deploymentStatuses = [
    'PENDING',
    'CLONING',
    'BUILDING',
    'STARTING',
    'RUNNING',
    'FAILED',
    'STOPPED',
    'CANCELLED',
] as const;

type DeploymentStatus = typeof deploymentStatuses[number];

function getUserId(req: Request): string {
    return (
        req as unknown as AuthenticatedRequest
    ).user.user_id;
}

function getDeploymentListOptions(
    req: Request,
): {
    page: number;
    pageSize: number;
    statuses?: DeploymentStatus[];
    projectId?: string;
} | null {
    const pageValue = req.query.page;
    const pageSizeValue = req.query.page_size;
    const statusValue = req.query.status;
    const projectValue = req.query.project_id;

    if (
        (pageValue !== undefined && typeof pageValue !== 'string') ||
        (pageSizeValue !== undefined && typeof pageSizeValue !== 'string') ||
        (statusValue !== undefined && typeof statusValue !== 'string') ||
        (projectValue !== undefined && (
            typeof projectValue !== 'string' ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectValue)
        ))
    ) {
        return null;
    }

    const page = pageValue === undefined ? 1 : Number(pageValue);
    const pageSize = pageSizeValue === undefined ? 10 : Number(pageSizeValue);

    if (
        !Number.isSafeInteger(page) ||
        page < 1 ||
        !Number.isSafeInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 100 ||
        !Number.isSafeInteger((page - 1) * pageSize)
    ) {
        return null;
    }

    let statuses: DeploymentStatus[] | undefined;
    if (statusValue !== undefined) {
        const requestedStatuses = statusValue.split(',');
        if (
            requestedStatuses.length === 0 ||
            requestedStatuses.some((status) =>
                !deploymentStatuses.includes(status as DeploymentStatus),
            )
        ) {
            return null;
        }
        statuses = [...new Set(requestedStatuses as DeploymentStatus[])];
    }

    return {
        page,
        pageSize,
        statuses,
        ...(typeof projectValue === 'string' ? { projectId: projectValue } : {}),
    };
}

function handleDeploymentError(
    error: unknown,
    res: Response,
): void {
    if (
        error instanceof
        DeploymentProjectNotFoundError
    ) {
        res.status(404).json({
            error: {
                code: 'PROJECT_NOT_FOUND',
                message: error.message,
            },
        });

        return;
    }

    if (
        error instanceof DeploymentNotFoundError
    ) {
        res.status(404).json({
            error: {
                code: 'DEPLOYMENT_NOT_FOUND',
                message: error.message,
            },
        });

        return;
    }

    if (
        error instanceof DeploymentConflictError
    ) {
        res.status(409).json({
            error: {
                code: 'DEPLOYMENT_IN_PROGRESS',
                message: error.message,
            },
        });

        return;
    }

    if (
        error instanceof DeploymentStateError
    ) {
        res.status(409).json({
            error: {
                code: 'INVALID_DEPLOYMENT_STATE',
                message: error.message,
            },
        });

        return;
    }


    console.error(
        'Deployment request failed:',
        error,
    );

    res.status(500).json({
        error: {
            code: 'DEPLOYMENT_OPERATION_FAILED',
            message:
                'Deployment operation failed.',
        },
    });
}

router.get(
    '/deployments',
    async (req, res) => {
        const options = getDeploymentListOptions(req);
        if (!options) {
            res.status(400).json({
                error: {
                    code: 'INVALID_DEPLOYMENT_QUERY',
                    message: 'Deployment page, page_size, status, or project_id filter is invalid.',
                },
            });
            return;
        }

        try {
            const deployments = await listDeployments(
                getUserId(req),
                {
                    ...options,
                    includeProjectName: true,
                },
            );
            res.json({ data: deployments });
        } catch (error) {
            handleDeploymentError(error, res);
        }
    },
);

router.get(
    '/projects/:projectId/deployments',
    async (req, res) => {
        const options = getDeploymentListOptions(req);
        if (!options) {
            res.status(400).json({
                error: {
                    code: 'INVALID_DEPLOYMENT_QUERY',
                    message: 'Deployment page, page_size, or status filter is invalid.',
                },
            });
            return;
        }

        try {
            const deployments =
                await listDeployments(
                    getUserId(req),
                    {
                        ...options,
                        projectId: req.params.projectId,
                    },
                );

            res.json({
                data: deployments,
            });
        } catch (error) {
            handleDeploymentError(
                error,
                res,
            );
        }
    },
);

router.post(
    '/projects/:projectId/deployments',
    async (req, res) => {
        try {
            const deployment =
                await createDeployment(
                    getUserId(req),
                    req.params.projectId,
                    {
                        branch:
                            typeof req.body?.branch ===
                                'string'
                                ? req.body.branch
                                : undefined,
                    },
                );

            res.status(202).json({
                data: deployment,
            });
        } catch (error) {
            handleDeploymentError(
                error,
                res,
            );
        }
    },
);

router.post(
    '/projects/:projectId/deployments/:deploymentId/stop',
    async (req, res) => {
        try {
            const deployment =
                await stopDeployment(
                    getUserId(req),
                    req.params.projectId,
                    req.params.deploymentId,
                );

            res.json({
                data: deployment,
            });
        } catch (error) {
            handleDeploymentError(
                error,
                res,
            );
        }
    },
);

router.post(
    '/projects/:projectId/deployments/:deploymentId/cancel',
    async (req, res) => {
        try {
            const deployment =
                await cancelDeployment(
                    getUserId(req),
                    req.params.projectId,
                    req.params.deploymentId,
                );

            res.json({
                data: deployment,
            });
        } catch (error) {
            handleDeploymentError(
                error,
                res,
            );
        }
    },
);

router.post(
    '/projects/:projectId/deployments/:deploymentId/redeploy',
    async (req, res) => {
        try {
            const deployment =
                await redeployDeployment(
                    getUserId(req),
                    req.params.projectId,
                    req.params.deploymentId,
                );

            res.status(202).json({
                data: deployment,
            });
        } catch (error) {
            handleDeploymentError(
                error,
                res,
            );
        }
    },
);

router.get(
    '/projects/:projectId/deployments/:deploymentId/logs',
    async (req, res) => {
        try {
            const logs =
                await getDeploymentLogs(
                    getUserId(req),
                    req.params.projectId,
                    req.params.deploymentId,
                );

            res.json({
                data: logs,
            });
        } catch (error) {
            handleDeploymentError(
                error,
                res,
            );
        }
    },
);

router.get(
    '/projects/:projectId/deployments/:deploymentId',
    async (req, res) => {
        try {
            const deployment =
                await getDeployment(
                    getUserId(req),
                    req.params.projectId,
                    req.params.deploymentId,
                );

            res.json({
                data: deployment,
            });
        } catch (error) {
            handleDeploymentError(
                error,
                res,
            );
        }
    },
);

export default router;