# Database Migrations Guide

## Overview

This project uses TypeORM for database migrations to manage schema changes in a version-controlled, repeatable way.

## Migration Workflow

### 1. Creating a New Migration

**Automatic Generation** (Recommended):
```bash
# TypeORM will compare your entities with the database and generate a migration
npm run migration:generate -- -n MigrationName
```

**Manual Creation**:
```bash
# Create a blank migration file
npm run migration:create -- -n MigrationName
```

### 2. Running Migrations

```bash
# Apply all pending migrations
npm run migration:run

# Verify migrations were applied
npm run migration:show
```

### 3. Reverting Migrations

```bash
# Revert the last migration
npm run migration:revert
```

## Migration Best Practices

### DO ✅

1. **Test locally first**
   - Always test migrations on a local database copy
   - Verify both `up` and `down` methods work

2. **Make migrations reversible**
   - Always implement the `down` method
   - Ensure you can rollback if needed

3. **Keep migrations small**
   - One logical change per migration
   - Easier to debug and revert

4. **Use transactions**
   - TypeORM wraps migrations in transactions by default
   - For complex migrations, use `queryRunner.startTransaction()`

5. **Backup before production**
   - Always backup database before running migrations in production
   - Have a rollback plan

### DON'T ❌

1. **Don't modify existing migrations**
   - Once applied, migrations are immutable
   - Create a new migration instead

2. **Don't hardcode IDs**
   - Use queries to find records dynamically
   - Example: `SELECT id FROM users WHERE email = 'admin@example.com'`

3. **Don't delete data without confirmation**
   - Add safety checks
   - Consider soft deletes instead

4. **Don't skip testing**
   - Untested migrations can cause production outages

## Migration Examples

### Adding a Column

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailVerifiedColumn1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('users', new TableColumn({
      name: 'email_verified',
      type: 'boolean',
      default: false,
      isNullable: false
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'email_verified');
  }
}
```

### Adding an Index

```typescript
import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddEmailIndex1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex('users', new TableIndex({
      name: 'idx_users_email',
      columnNames: ['email']
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'idx_users_email');
  }
}
```

### Data Migration

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateUserRoles1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update existing users to have default role
    await queryRunner.query(`
      UPDATE users 
      SET role = 'customer' 
      WHERE role IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to NULL for users that had NULL before
    // Note: This is a simplified example
    await queryRunner.query(`
      UPDATE users 
      SET role = NULL 
      WHERE role = 'customer'
    `);
  }
}
```

## Production Deployment Checklist

- [ ] Migration tested locally
- [ ] Migration tested on staging database
- [ ] Database backup created
- [ ] Downtime window scheduled (if needed)
- [ ] Rollback plan documented
- [ ] Team notified of deployment
- [ ] Migration applied
- [ ] Application restarted
- [ ] Verification tests run
- [ ] Monitoring checked for errors

## Troubleshooting

### Migration Failed

1. Check the error message in the console
2. Verify database connection
3. Check if migration was partially applied
4. Revert the migration: `npm run migration:revert`
5. Fix the issue and run again

### Migration Already Applied

TypeORM tracks applied migrations in the `migrations` table. To re-run:
1. Manually delete the entry from `migrations` table
2. Or create a new migration with a different timestamp

### Can't Generate Migration

1. Ensure entities are properly defined
2. Check TypeORM configuration in `ormconfig.json` or `data-source.ts`
3. Verify database connection
4. Try running with `--pretty` flag for better output

## Current Migration Status

### Applied Migrations

Run `npm run migration:show` to see which migrations have been applied.

### Pending Features

The following schema changes are tracked in code but may need migrations:
- Knowledge base indexes (✅ Already applied via SQL)
- Settings table column additions (✅ Already applied)

## Resources

- [TypeORM Migrations Documentation](https://typeorm.io/migrations)
- [Migration API Reference](https://typeorm.io/migrations#migration-api)
- Project Migration Files: `backend/src/migrations/`

---

**Last Updated:** 2025-11-28  
**Maintainer:** Development Team
