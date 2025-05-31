# Database Migrations

## Overview

This directory is for database migrations that need to be applied to the ServiceFix database. The migrations are managed using direct SQL applied through the Supabase admin interface rather than TypeORM's migration system.

## Migration Strategy

### How Migrations Are Applied

1. Migrations are written as plain SQL scripts
2. Migrations are applied directly to Supabase using the Supabase admin interface or API
3. Each migration is tracked in the `schema_version` table
4. Schema validation runs on application startup to ensure the database is properly configured

### Creating a New Migration

To create a new migration:

1. Write your SQL script with the necessary changes
2. Apply the migration using the Supabase admin interface
3. Update the `schema_version` table with a new version record:

```sql
INSERT INTO schema_version (version, description) 
VALUES ('YYYY_MM_DD_description', 'Description of your migration');
```

4. If necessary, update the schema validation in `schemaValidator.ts`

## Schema Version Tracking

The `schema_version` table tracks all applied migrations:

```
version (VARCHAR) - Primary key, typically YYYY_MM_DD_description format
description (TEXT) - Human readable description of the migration
applied_at (TIMESTAMP) - When the migration was applied
applied_by (VARCHAR) - Who applied the migration
```

## Validation

On application startup, the `validateDatabaseSchema` function in `schemaValidator.ts` verifies that:

1. All required tables exist
2. Critical columns are present
3. Required functions and triggers are defined
4. Indexes for performance optimization are in place

If any issues are detected, warnings are logged and, in some cases, automatic fixes are attempted.

## Emergency Fixes

If the schema is significantly out of sync, the full schema can be restored using the SQL script in `backend/sql/schema.sql`.

## Migration Files

- `2023_10_12_create_schema_version_table.ts`: Creates the schema version tracking table
- `2023_10_12_sync_entities_schema.ts`: Ensures all entity tables and columns exist in the database

## Best Practices

1. **Always test migrations**: Test migrations on a development database before applying to production
2. **Include up and down methods**: Always implement both the `up` and `down` methods for reversibility
3. **Keep migrations small**: Each migration should focus on a specific change
4. **Use schema_version table**: Always update the schema_version table in your migrations
5. **Avoid direct schema modification**: Don't modify the database schema directly, always use migrations

## Common Issues

### Handling Failed Migrations

If a migration fails, you can:

1. Fix the migration file
2. Run `npm run migrations:run` again
3. If needed, manually fix the database and mark the migration as applied in the `schema_version` table

### Handling Conflicts

If multiple developers create migrations simultaneously, there might be conflicts. In such cases:

1. Check which migrations have been applied using `SELECT * FROM schema_version ORDER BY applied_at`
2. Merge the conflicting migrations if needed
3. Ensure all changes are included in the final migration files

## Migration Structure

A typical migration file has this structure:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationName implements MigrationInterface {
  name = 'MigrationName';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Schema changes to apply
    
    // Update schema version
    await queryRunner.query(`
      INSERT INTO schema_version (version, description, applied_at)
      VALUES ('${this.name}', 'Description', CURRENT_TIMESTAMP)
      ON CONFLICT (version) DO UPDATE SET applied_at = CURRENT_TIMESTAMP;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback logic
    
    // Remove from schema version
    await queryRunner.query(`DELETE FROM schema_version WHERE version = '${this.name}';`);
  }
} 