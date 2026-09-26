import type { Knex } from 'knex';

const config: Knex.Config = {
    client: 'pg',

    connection: {
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT),
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
    },

    migrations: {
        directory: './src/database/migrations',
        extension: 'ts',
    },
};

export default config;