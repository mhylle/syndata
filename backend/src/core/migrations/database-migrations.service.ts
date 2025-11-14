import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseMigrationsService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseMigrationsService.name);

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const environment = this.configService.get<string>('environment');

    // Only run migrations in production mode
    if (environment === 'production') {
      this.logger.log('Running database migrations...');
      await this.runMigrations();
      this.logger.log('Database migrations completed successfully');
    } else {
      this.logger.log(
        `Skipping migrations in ${environment} mode (synchronize is enabled)`,
      );
    }
  }

  private async runMigrations(): Promise<void> {
    try {
      // Ensure migrations table exists
      await this.createMigrationsTable();

      // Run all migrations in sequence
      await this.runMigration('001_initial_schema', () =>
        this.migration001InitialSchema(),
      );

      // Add future migrations here
      // await this.runMigration('002_add_notes_table', () => this.migration002AddNotesTable());
    } catch (error) {
      this.logger.error('Migration failed', error);
      throw error;
    }
  }

  private async createMigrationsTable(): Promise<void> {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  private async runMigration(
    name: string,
    migration: () => Promise<void>,
  ): Promise<void> {
    // Check if migration already executed
    const result = await this.dataSource.query(
      'SELECT * FROM migrations WHERE name = $1',
      [name],
    );

    if (result.length > 0) {
      this.logger.log(`Migration ${name} already executed, skipping...`);
      return;
    }

    this.logger.log(`Executing migration: ${name}`);

    // Run migration in a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await migration();

      // Record migration as completed
      await queryRunner.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [name],
      );

      await queryRunner.commitTransaction();
      this.logger.log(`Migration ${name} completed successfully`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Migration ${name} failed`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Migration 001: Initial Schema
   * Creates the initial database schema for users table
   */
  private async migration001InitialSchema(): Promise<void> {
    // Create users table if it doesn't exist
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create index on email for faster lookups
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Create index on username for faster lookups
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
  }

  /**
   * Example of how to add a new migration:
   *
   * private async migration002AddNotesTable(): Promise<void> {
   *   await this.dataSource.query(`
   *     CREATE TABLE IF NOT EXISTS notes (
   *       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   *       user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   *       title VARCHAR(255) NOT NULL,
   *       content TEXT,
   *       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   *       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   *     );
   *   `);
   *
   *   await this.dataSource.query(`
   *     CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
   *   `);
   * }
   */
}
