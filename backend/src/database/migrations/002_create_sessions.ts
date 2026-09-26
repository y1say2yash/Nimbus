import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('sessions', (table) => {
        table
            .uuid('session_id')
            .primary()
            .defaultTo(knex.raw('gen_random_uuid()'));

        table
            .uuid('user_id')
            .notNullable()
            .references('user_id')
            .inTable('users')
            .onDelete('CASCADE');

        table.text('token_hash').notNullable().unique();

        table
            .timestamp('expires_at', { useTz: true })
            .notNullable();

        table
            .timestamp('created_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());

        table.timestamp('revoked_at', { useTz: true });

        table.index(['user_id']);
        table.index(['expires_at']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('sessions');
}