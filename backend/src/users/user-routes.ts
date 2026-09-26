import { Router } from 'express';

import {
    requireAuth,
    type AuthenticatedRequest,
} from '../auth/auth-middleware.js';

const router = Router();

router.get('/me', requireAuth, (req, res) => {
    const user = (req as AuthenticatedRequest).user;

    return res.json({
        data: {
            user,
        },
    });
});

export default router;