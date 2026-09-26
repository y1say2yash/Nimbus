import express from 'express';
import cookieParser from 'cookie-parser';

import database from './config/knex.js';
import authRoutes from './auth/auth-routes.js';
// import { } from './auth/auth-middleware.js';
import userRoutes from './users/user-routes.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/users', userRoutes);

app.get('/api/v1/health', async (_req, res) => {
    try {
        await database.raw('SELECT 1');

        res.json({
            data: {
                status: 'ok',
                service: 'nimbus-backend',
                database: 'connected',
            },
        });
    } catch (error) {
        console.error('Database health check failed:', error);

        res.status(503).json({
            error: {
                code: 'DATABASE_UNAVAILABLE',
                message: 'Database is unavailable.',
            },
        });
    }
});

export default app;