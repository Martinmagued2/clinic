# Clinic Command Center — Production Deployment Guide

## Vercel + Supabase Only

This guide describes how to deploy the Clinic Command Center using only:

- **GitHub** — source code
- **Vercel** — Next.js application hosting and deployment
- **Supabase** — PostgreSQL database and file storage

No AWS, Railway, Render, Upstash, Redis, or other external infrastructure is required.

---

# 1. Production Architecture

```
                    USER
                     │
                     ▼
              ┌──────────────┐
              │    Vercel    │
              │              │
              │   Next.js    │
              │              │
              │ Frontend     │
              │ API Routes   │
              └──────┬───────┘
                     │
              Prisma / PostgreSQL
                     │
                     ▼
              ┌──────────────┐
              │   Supabase   │
              │              │
              │ PostgreSQL   │
              │              │
              │ Storage      │
              │              │
              │ Backups      │
              └──────────────┘
```

---

# 2. Prerequisites

- GitHub repository containing the project
- Vercel account (free tier works)
- Supabase account (free tier works)
- Node.js/Bun installed locally
- Prisma configured in the project

---

# 3. Create the Supabase Production Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it: `clinic-command-center-production`
3. **Do NOT use the development database as the production database**
4. Choose a region geographically close to your users
5. Set a strong database password — **save this securely**
6. **Do not commit the password to GitHub**

---

# 4. Get the Database Connection String

In Supabase:

```
Project → Connect → Connection String
```

**For Vercel/serverless:** use the **connection pooler** URL (port 6543):

```
postgresql://postgres.[YOUR-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

Copy the exact value from the Supabase dashboard. **Do not manually construct the hostname.**

The production environment variable will be:

```
DATABASE_URL
```

---

# 5. Create Supabase Storage Buckets

In Supabase:

```
Storage → New Bucket
```

Create a **private** bucket:

```
patient-documents
```

**Keep patient documents private.** Do not create public URLs for sensitive documents.

The application uses signed URLs for secure, temporary access (5-minute expiry).

---

# 6. Get Supabase Storage Credentials

In Supabase:

```
Settings → API
```

Copy:
- **Project URL** (e.g., `https://abcdefg.supabase.co`)
- **service_role secret key** (NOT the anon key — the service role key bypasses RLS)

These go into Vercel as:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

---

# 7. Prisma Migrations (Not db push)

This project uses **Prisma migrations** for production database management.

### How it works:

**During development:**
```bash
bunx prisma migrate dev  # creates migration files
```

**During production deployment (Vercel):**
```bash
bunx prisma migrate deploy  # applies existing migrations
```

The `vercel.json` build command automatically:
1. Switches Prisma provider from `sqlite` to `postgresql`
2. Runs `prisma generate`
3. Runs `prisma migrate deploy`
4. Runs `next build`

**Never run `prisma db push` in production.**

---

# 8. Do NOT Auto-Seed in Production

The build command does **NOT** run database seeds automatically.

**Production should never have demo accounts like `admin@clinic.test`.**

To seed the database (for initial setup only, run manually once):

```bash
# From Vercel terminal or locally with production DATABASE_URL
bun run db:seed
```

**Warning:** Only run this once during initial setup. Running it again will reset all data.

---

# 9. Create the Vercel Project

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. **Import Git Repository** → select `Martinmagued2/clinic`
3. Vercel auto-detects Next.js — **keep the framework as Next.js**

---

# 10. Configure Environment Variables

In Vercel:

```
Project → Settings → Environment Variables
```

### Required:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase connection pooler URL (port 6543) |
| `SESSION_SECRET` | Run `openssl rand -hex 32` locally, paste result |
| `NODE_ENV` | `production` |

### For file storage (required for document uploads):

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://[YOUR-PROJECT-REF].supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key from Supabase (NOT anon) |

### Security:

- **NEVER** use `NEXT_PUBLIC_` prefix for secrets
- `NEXT_PUBLIC_DATABASE_URL`, `NEXT_PUBLIC_SESSION_SECRET` are FORBIDDEN
- Database credentials and session secrets must remain server-side

---

# 11. Deploy

Click **Deploy**. Vercel will:

1. Clone the GitHub repository
2. Install dependencies (`bun install`)
3. Switch Prisma to PostgreSQL
4. Generate Prisma Client
5. Apply Prisma migrations (`migrate deploy`)
6. Build Next.js
7. Deploy to global CDN

Wait for deployment to finish (~3-5 minutes).

---

# 12. Initial Database Setup

After the first deployment, create your first admin user.

### Option A: Use Vercel Terminal

1. Vercel dashboard → your project → **Developer Tools** → **Terminal**
2. Run the seed script (for demo data only — **not for real production**):
   ```bash
   bun run db:seed
   ```

### Option B: Create admin user via Supabase SQL

Run this in Supabase SQL Editor (replace email/password):

```sql
-- Insert clinic
INSERT INTO "Clinic" (id, name, "currencyCode", "localeCode", timezone, status, "createdAt", "updatedAt")
VALUES ('clinic-1', 'Your Clinic Name', 'EGP', 'en', 'Africa/Cairo', 'ACTIVE', NOW(), NOW());

-- Insert admin user (password: change this!)
INSERT INTO "User" (id, "clinicId", email, "passwordHash", name, role, status, "createdAt", "updatedAt")
VALUES ('user-1', 'clinic-1', 'admin@yourclinic.com', '<HASHED_PASSWORD>', 'Admin', 'CLINIC_ADMIN', 'ACTIVE', NOW(), NOW());
```

**For the password hash:** run this locally to generate it:
```bash
bun -e "const { scryptSync, randomBytes } = require('crypto'); const salt = randomBytes(16).toString('hex'); const hash = scryptSync('YOUR_PASSWORD', salt, 64).toString('hex'); console.log(salt + ':' + hash);"
```

---

# 13. Custom Domain

After deployment works:

```
Vercel → Project → Settings → Domains → Add Domain
```

1. Add your domain (e.g., `clinic.yourdomain.com`)
2. Configure the DNS records Vercel provides
3. Vercel automatically provisions HTTPS

---

# 14. Verify Production Cookies

After deploying, verify in browser developer tools that the session cookie is:

- ✅ `HttpOnly`
- ✅ `Secure`
- ✅ `SameSite=Lax`

And that it's associated with your production domain.

---

# 15. Rate Limiting

- **Local dev:** in-memory rate limiting (fast, no DB)
- **Vercel (production):** automatically uses database-backed rate limiting
  - Persists across serverless instances
  - Uses the `RateLimitEntry` table in PostgreSQL
  - No Redis/Upstash needed

Rate limits:
- Login: 10 attempts per minute per IP
- Per account: 5 failed attempts per 15 minutes

---

# 16. Audit Logging

All sensitive actions are logged with:
- User ID
- Action (e.g., `PATIENT_CREATED`, `APPOINTMENT_CANCELLED`)
- Entity type and ID
- Old/new values (JSON)
- IP address
- User agent
- Timestamp

View audit logs in the app: **Sidebar → Audit Logs**

---

# 17. Document Storage

- **Local dev:** files stored in `/uploads` directory
- **Production (Vercel):** files stored in Supabase Storage (private bucket)
- Documents are served via **signed URLs** (5-minute expiry)
- **Never publicly accessible** — all access requires authentication

If Supabase Storage is not configured, files fall back to database storage (base64, limited to 5MB).

---

# 18. Health Check

Verify the app is running:

```
GET /api/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-09-02T12:00:00.000Z",
    "services": {
      "database": "ok",
      "storage": "configured"
    }
  }
}
```

---

# 19. Production Testing Checklist

After deployment, test all of the following:

### Application
- [ ] Homepage loads
- [ ] Login works
- [ ] Logout works
- [ ] Dashboard loads
- [ ] Navigation works

### Patients
- [ ] Create patient
- [ ] View patient
- [ ] Edit patient
- [ ] Search patient
- [ ] Patient permissions work

### Appointments
- [ ] Create appointment
- [ ] Edit appointment
- [ ] Cancel appointment
- [ ] Appointment filtering works

### Medical Records
- [ ] Create medical record
- [ ] View medical record
- [ ] Edit medical record
- [ ] Unauthorized users cannot access records

### Documents
- [ ] Upload document
- [ ] View document
- [ ] Download document
- [ ] Unauthorized users cannot access document

### Security
- [ ] HTTPS works
- [ ] Authentication cookies are secure (HttpOnly, Secure, SameSite)
- [ ] API authorization works
- [ ] Invalid requests are rejected
- [ ] Rate limiting works
- [ ] Sensitive data is not exposed in logs

---

# 20. Environment Variables Summary

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection (pooler URL) |
| `SESSION_SECRET` | Yes | Secure session cookies |
| `NODE_ENV` | Yes | `production` |
| `SUPABASE_URL` | For file storage | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | For file storage | Supabase service role key |
| `VERCEL` | Auto | Set by Vercel |
| `VERCEL_URL` | Auto | Set by Vercel |

---

# 21. What NOT to Use

This deployment does **NOT** require:

- ❌ AWS
- ❌ Railway
- ❌ Render
- ❌ Heroku
- ❌ Upstash
- ❌ Redis
- ❌ Cloudinary
- ❌ Firebase
- ❌ MongoDB
- ❌ DigitalOcean

The production infrastructure is only:

```
GitHub + Vercel + Supabase
```

---

# 22. Deployment Workflow (Future Updates)

Once initial deployment is complete:

```
Developer changes code
    ↓
Update Prisma schema if necessary
    ↓
Create migration: bunx prisma migrate dev --name descriptive_name
    ↓
Test locally: bun run dev
    ↓
Commit code + migrations
    ↓
Push to GitHub
    ↓
Vercel automatically builds and deploys
    ↓
prisma generate → prisma migrate deploy → next build
```

**Never manually modify the production database schema.** Use Prisma migrations.

---

# 23. Troubleshooting

### Build fails with "Prisma Client not generated"
- Check `DATABASE_URL` is set correctly in Vercel
- Check Vercel build logs for the exact error

### Database connection errors
- Verify Supabase project is active (not paused)
- Use the **connection pooler** URL (port 6543) for serverless
- Check for special characters in password (URL-encode if needed)

### Documents don't upload
- Set `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in Vercel
- Verify the `patient-documents` bucket exists in Supabase
- Check that the bucket is **private** (not public)

### "Authentication required" on all API calls
- Check `SESSION_SECRET` is set in Vercel
- Verify the deployed URL matches what you're accessing

### Rate limiting not working
- On Vercel, rate limiting uses the database (automatic)
- Check that the `RateLimitEntry` table exists (run `prisma migrate deploy`)
