import knex from 'knex';

const database = knex({
    client: 'pg',
    connection: {
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT),
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
    },
    pool: {
        min: 2,
        max: 10,
    },
});

export default database;