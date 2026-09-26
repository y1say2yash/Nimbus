import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('projects', (table) => {
        table
            .uuid('project_id')
            .primary()
            .defaultTo(knex.raw('gen_random_uuid()'));

        table
            .uuid('user_id')
            .notNullable()
            .references('user_id')
            .inTable('users')
            .onDelete('CASCADE');

        table.bigInteger('github_repository_id').notNullable();

        table.text('repository_url').notNullable();

        table.string('project_name', 255).notNullable();

        table.string('default_branch', 255).notNullable();

        table
            .integer('container_port')
            .notNullable()
            .checkBetween([1, 65535]);

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

        table.unique(['user_id', 'project_name']);

        table.index(['user_id']);
        table.index(['github_repository_id']);
        table.index(['is_active']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('projects');
}