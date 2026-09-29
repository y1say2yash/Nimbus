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
    createDeployment,
    DeploymentConflictError,
    DeploymentNotFoundError,
    DeploymentProjectNotFoundError,
    DeploymentStateError,
    getDeployment,
    getDeploymentLogs,
    listDeployments,
    stopDeployment,
} from './deployment-service.js';

const router = Router();

router.use(requireAuth);

function getUserId(req: Request): string {
    return (
        req as unknown as AuthenticatedRequest
    ).user.user_id;
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
    '/projects/:projectId/deployments',
    async (req, res) => {
        try {
            const deployments =
                await listDeployments(
                    getUserId(req),
                    req.params.projectId,
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