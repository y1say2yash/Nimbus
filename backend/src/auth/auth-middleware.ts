import type { NextFunction, Request, Response } from 'express';

import { getSessionUser } from './auth-session.js';

export interface AuthenticatedRequest extends Request {
    user: {
        user_id: string;
        github_id: string;
        github_username: string;
        email: string;
        avatar_url: string | null;
        is_active: boolean;
    };
}

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const token = req.cookies?.nimbus_session;

        if (!token) {
            res.status(401).json({
                error: {
                    code: 'UNAUTHENTICATED',
                    message: 'Authentication is required.',
                },
            });
            return;
        }

        const user = await getSessionUser(token);

        if (!user) {
            res.status(401).json({
                error: {
                    code: 'INVALID_SESSION',
                    message: 'Authentication is required.',
                },
            });
            return;
        }

        (req as AuthenticatedRequest).user = {
            user_id: user.user_id,
            github_id: String(user.github_id),
            github_username: user.github_username,
            email: user.email,
            avatar_url: user.avatar_url,
            is_active: user.is_active,
        };

        next();
    } catch (error) {
        console.error('Authentication middleware failed:', error);

        res.status(500).json({
            error: {
                code: 'AUTHENTICATION_ERROR',
                message: 'Authentication could not be verified.',
            },
        });
    }
}