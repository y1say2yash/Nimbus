import { Pool } from 'pg';

const databasePool = new Pool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
});

databasePool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error);
});

export default databasePool;