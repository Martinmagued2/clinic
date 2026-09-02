# Deployment Guide — Vercel + Supabase

This guide walks you through deploying the Clinic Command Center to Vercel with a Supabase PostgreSQL database.

## Prerequisites

- A [GitHub](https://github.com) account (repo already pushed)
- A [Vercel](https://vercel.com) account (free tier is fine)
- A [Supabase](https://supabase.com) account (free tier is fine)

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it (e.g., `clinic-command-center`)
3. Set a strong database password — **save this**, you'll need it
4. Choose a region close to your users (e.g., `Southeast Asia (Singapore)` for Egypt/Europe)
5. Wait ~2 minutes for the project to provision

### Get your connection string

1. In Supabase dashboard → **Settings** → **Database**
2. Find **Connection string** → **URI** format
3. Copy it — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefg.supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` with the password you set in step 3

---

## Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your GitHub repo: `Martinmagued2/clinic`
3. Vercel auto-detects Next.js — **don't change the framework preset**
4. **Environment Variables** — add these:

   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres` |
   | `SESSION_SECRET` | Run `openssl rand -hex 32` in terminal and paste the result |
   | `NODE_ENV` | `production` |

5. Click **Deploy** — Vercel will:
   - Install dependencies with `bun install`
   - Switch Prisma to PostgreSQL (`sed` command in `vercel.json`)
   - Generate Prisma client
   - Push the database schema to Supabase
   - Build the Next.js app
   - Deploy to a global CDN

6. Wait ~3-5 minutes for the first deployment to complete

---

## Step 3: Seed the Database

After the first deployment, you need to seed the database with demo data:

### Option A: Use Vercel terminal (recommended)

1. In Vercel dashboard → your project → **Developer Tools** → **Terminal**
2. Run:
   ```bash
   bun run db:seed
   ```

### Option B: Use Supabase SQL Editor

1. In Supabase dashboard → **SQL Editor**
2. Paste the contents of `scripts/seed.sql` (if available) or run the seed script locally with the Supabase URL

---

## Step 4: Verify the Deployment

1. Visit your Vercel URL (e.g., `https://clinic-command-center.vercel.app`)
2. Log in with:
   - **Email:** `admin@clinic.test`
   - **Password:** `admin123`
3. You should see the dashboard with data

---

## Step 5: Custom Domain (optional)

1. In Vercel dashboard → your project → **Settings** → **Domains**
2. Add your domain (e.g., `clinic.yourdomain.com`)
3. Add the DNS records Vercel shows you
4. HTTPS is automatic

---

## How It Works

### Database (Supabase PostgreSQL)

The `vercel.json` build command automatically:
1. Switches the Prisma provider from `sqlite` to `postgresql` using `sed`
2. Runs `prisma generate` to create the client
3. Runs `prisma db push` to create all tables in Supabase
4. Builds the Next.js app

This means:
- **Local dev:** uses SQLite (fast, zero-config)
- **Production (Vercel):** uses Supabase PostgreSQL (scalable, persistent)

### File Storage (Documents)

- **Local dev:** files stored in `/uploads` directory
- **Vercel:** files stored as base64 in the database (serverless-friendly)
- The app auto-detects the environment via `process.env.VERCEL`

### Rate Limiting

- **Local dev:** in-memory rate limiting works perfectly
- **Vercel:** in-memory rate limiting resets per serverless instance
- For production-grade rate limiting, add [Upstash Redis](https://upstash.com) (free tier) and update `src/lib/rate-limit.ts`

---

## Troubleshooting

### Build fails with "Prisma Client not generated"

The `vercel.json` buildCommand runs `prisma generate` before `next build`. If it fails:
1. Check that `DATABASE_URL` is set correctly in Vercel env vars
2. Check Vercel build logs for the exact error

### Database connection errors

1. Verify your Supabase project is active (not paused)
2. Check the connection string format: `postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres`
3. Make sure there are no special characters in the password that need URL encoding

### "Authentication required" on all API calls

This means the session cookie isn't being set. Check:
1. `SESSION_SECRET` is set in Vercel env vars
2. The deployed URL matches what you're accessing

### Documents don't upload

On Vercel, file size is limited to 5MB (stored as base64 in the database). For larger files:
1. Set up [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
2. Add `BLOB_READ_WRITE_TOKEN` to env vars
3. Update `src/app/api/documents/route.ts` to use `@vercel/blob`

---

## Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Random 32-byte hex string for cookie signing |
| `NODE_ENV` | Yes | Set to `production` |
| `VERCEL` | Auto | Automatically set by Vercel |
| `VERCEL_URL` | Auto | Automatically set by Vercel |

---

## Local Development with Supabase (optional)

If you want to use Supabase for local dev too (instead of SQLite):

1. Create a `.env` file with your Supabase `DATABASE_URL`
2. Change `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  // was: sqlite
     url      = env("DATABASE_URL")
   }
   ```
3. Run `bun run db:push`
4. Run `bun run db:seed`

This gives you the same database in dev and prod.
