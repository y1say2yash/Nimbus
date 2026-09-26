import express from 'express';

const app = express();

app.use(express.json());

app.get('/api/v1/health', (_req, res) => {
    res.json({
        data: {
            status: 'ok',
            service: 'nimbus-backend',
        },
    });
});

export default app;