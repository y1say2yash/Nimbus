import { Router, type Request } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../auth/auth-middleware.js';
import {
    getDashboardAnalytics,
    getDashboardCharts,
    getDashboardSummary,
} from './dashboard-service.js';

const router = Router();

router.use(requireAuth);

function getUserId(req: Request): string {
    return (req as AuthenticatedRequest).user.user_id;
}

router.get('/summary', async (req, res) => {
    try {
        res.json({ data: await getDashboardSummary(getUserId(req)) });
    } catch (error) {
        console.error('Dashboard summary request failed:', error);
        res.status(500).json({
            error: {
                code: 'DASHBOARD_SUMMARY_FAILED',
                message: 'Dashboard summary could not be loaded.',
            },
        });
    }
});

router.get('/charts', async (req, res) => {
    try {
        res.json({ data: await getDashboardCharts(getUserId(req)) });
    } catch (error) {
        console.error('Dashboard charts request failed:', error);
        res.status(500).json({
            error: {
                code: 'DASHBOARD_CHARTS_FAILED',
                message: 'Dashboard charts could not be loaded.',
            },
        });
    }
});

router.get('/analytics', async (req, res) => {
    try {
        const data = await getDashboardAnalytics(getUserId(req));
        res.json({ data });
    } catch (error) {
        console.error('Dashboard analytics request failed:', error);
        res.status(500).json({
            error: {
                code: 'DASHBOARD_ANALYTICS_FAILED',
                message: 'Dashboard analytics could not be loaded.',
            },
        });
    }
});

export default router;
