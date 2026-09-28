import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
    CREATE TYPE deployment_status AS ENUM (
      'PENDING',
      'CLONING',
      'BUILDING',
      'STARTING',
      'RUNNING',
      'FAILED',
      'STOPPED',
      'CANCELLED'
    )
  `);

    await knex.schema.createTable('deployments', (table) => {
        table
            .uuid('deployment_id')
            .primary()
            .defaultTo(knex.raw('gen_random_uuid()'));

        table
            .uuid('project_id')
            .notNullable()
            .references('project_id')
            .inTable('projects')
            .onDelete('CASCADE');

        table.text('repository_url').notNullable();

        table.string('branch', 255).notNullable();

        table.string('commit_sha', 40).nullable();

        table
            .integer('container_port')
            .nullable()
            .checkBetween([1, 65535]);

        table
            .integer('host_port')
            .notNullable()
            .checkBetween([1, 65535]);

        table.string('image_tag', 255).notNullable();

        table.string('container_name', 255).notNullable();

        table
            .specificType('status', 'deployment_status')
            .notNullable()
            .defaultTo('PENDING');

        table.text('error_message');

        table.timestamp('created_at', { useTz: true })
            .notNullable()
            .defaultTo(knex.fn.now());

        table.timestamp('started_at', { useTz: true });

        table.timestamp('finished_at', { useTz: true });

        table.index(['project_id']);
        table.index(['status']);
        table.index(['created_at']);
        table.index(['project_id', 'created_at']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('deployments');

    await knex.raw('DROP TYPE IF EXISTS deployment_status');
}