# Database Migrations

The dev database uses SQLite (zero-config). When you're ready to deploy on PostgreSQL, follow these steps:

## 1. Switch the schema provider

In `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // was: sqlite
  url      = env("DATABASE_URL")
}
```

## 2. Set DATABASE_URL

In `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/clinic?schema=public"
```

## 3. Create the initial migration

```bash
bun run db:migrate -- --name init
```

This creates a `prisma/migrations/` folder with the SQL needed to provision a fresh PostgreSQL database from scratch.

## 4. Apply migrations

```bash
bun run db:migrate
```

## 5. Seed

```bash
bun run db:seed
```

## Schema notes

- All enum-like fields use `String` (not Prisma enums) so the same schema works on both SQLite and PostgreSQL without changes.
- All timestamps use `DateTime` with `@default(now())` and `@updatedAt`.
- Soft deletes use a nullable `deletedAt` column (spec #52) — queries filter on `deletedAt: null`.
- Tenant isolation is enforced at the application layer via `clinicId` foreign keys + indexes.

## Production checklist

- [ ] Enable `pg_dump` automated backups
- [ ] Set up Point-In-Time Recovery if using managed PostgreSQL
- [ ] Configure connection pooling (PgBouncer or Supabase/Neon pooler)
- [ ] Run `prisma migrate deploy` in CI/CD, not `prisma db push`
- [ ] Document the restore procedure
