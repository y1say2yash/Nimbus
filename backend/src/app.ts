import express from 'express';
import databasePool from './config/database.js';

const app = express();

app.use(express.json());

app.get('/api/v1/health', async (_req, res) => {
    try {
        await databasePool.query('SELECT 1');

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