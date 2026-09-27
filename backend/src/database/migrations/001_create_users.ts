import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('users', (table) => {
        table
            .uuid('user_id')
            .primary()
            .defaultTo(knex.raw('gen_random_uuid()'));

        table.bigInteger('github_id').notNullable().unique();

        table.string('github_username', 255).notNullable().unique();

        table.string('email', 255).notNullable().unique();

        table.text('github_access_token_encrypted').nullable();

        table.text('avatar_url');

        table.boolean('is_active').notNullable().defaultTo(true);

        table
            .timestamp('created_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());

        table
            .timestamp('updated_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());

        table.timestamp('deleted_at', { useTz: true });

        table.index(['github_id']);
        table.index(['github_username']);
        table.index(['email']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('users');
}