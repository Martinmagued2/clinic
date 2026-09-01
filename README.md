# Clinic Command Center

A production-grade, **multi-tenant Clinic Management SaaS** that acts as the central operating system for clinics — managing patients, doctors, appointments, queues, medical visits, prescriptions, billing, staff, reports, notifications, and audit logs.

Built to the specification in `SPEC.md` (the original requirements doc, kept in the repo for reference).

---

## ✨ Features

### Foundation
- **Multi-tenant architecture** — every tenant-owned entity is scoped to a `clinicId`; data isolation is enforced at the data-access layer, not just the UI.
- **RBAC with granular permissions** — `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `NURSE` roles, each mapped to a permission set (`patients.view`, `appointments.create`, `billing.update`, etc.).
- **Audit logging** — every sensitive mutation (patient created, appointment cancelled, payment recorded, etc.) is recorded with old/new values.
- **Session-based auth** — HTTP-only signed cookies, scrypt password hashing, brute-force-friendly error messages.
- **Tenant isolation middleware** — `requirePermission()` + `requireTenantScope()` helpers enforce that users can only access entities in their own clinic.

### MVP Modules (all implemented)
- **Dashboard** — role-aware stats (today's appointments, waiting patients, revenue today/week/month, outstanding balance), today's schedule, live queue.
- **Patients** — list with debounced search + pagination, full profile with tabbed sections (Overview, Medical, Appointments, Visits, Prescriptions, Invoices, Timeline), create form with identity/contact/medical sections.
- **Appointments** — list by date, week-view calendar, create flow with double-booking prevention at the database level.
- **Queue** — check-in via appointment → queue entry with auto-generated queue number, call-next workflow, skip/complete actions.
- **Medical Visits** — create form with vitals (BP, HR, temp, weight, height, O2 sat, RR) + clinical notes (chief complaint, symptoms, examination, assessment, diagnosis, treatment plan, follow-up date).
- **Prescriptions** — list with medication items (name, strength, dosage, frequency, duration, route, instructions), auto-generated RX-###### codes.
- **Billing** — services catalog, invoices with line items + discount/tax, payments with transactional consistency, multiple payment methods, automatic status updates (DRAFT → ISSUED → PARTIALLY_PAID → PAID).
- **Reports** — revenue over time, appointment status breakdown, payment methods, new-patient-per-day, with date-range filtering and charts.
- **Staff & Doctors** — full CRUD, doctor schedules, role assignment.
- **Settings** — clinic profile, currency (EGP/USD/EUR/GBP/SAR/AED), locale (en/ar/fr), timezone, branches.

### UX
- Responsive sidebar nav that adapts to user permissions.
- Loading, empty, and error states on every page.
- Toast notifications for all mutations.
- Sticky footer that respects the viewport.
- Mobile-friendly with a collapsible sidebar.

---

## 🏗 Architecture

```
                         USERS
                           │
                           ▼
                    React Web App (Next.js 16, App Router)
                           │
                           ▼
                     REST API (Next.js Route Handlers)
                           │
             ┌─────────────┴─────────────┐
             │                           │
       Auth / RBAC                 Business Logic
       (signed cookies,            (Prisma queries,
        scrypt hashes,              tenant-scoped,
        permission checks)          audit-logged)
             │                           │
             └─────────────┬─────────────┘
                           │
                      Database
                  (SQLite dev / PostgreSQL prod)
                           │
                           ▼
                  Future: Object Storage
                  (patient documents, lab results)
                  Future: Notifications
                  (Email / WhatsApp / SMS)
```

**Stack:**
- **Framework**: Next.js 16 with App Router, TypeScript 5 strict
- **Styling**: Tailwind CSS 4 with shadcn/ui (New York style)
- **Database**: Prisma ORM (SQLite for dev; switch to PostgreSQL by changing one env var)
- **State**: Zustand for client state (UI state, current view)
- **Forms & validation**: react-hook-form + Zod (server-side validation in every API route)
- **Charts**: Recharts (revenue, appointments, patients)
- **Icons**: Lucide
- **Notifications**: Sonner (toasts)

---

## 📁 Project Structure

```
.
├── prisma/
│   └── schema.prisma              # Multi-tenant data model
├── scripts/
│   └── seed.ts                    # Dev seed data (1 clinic, 2 branches, 3 doctors, 20 patients, ...)
├── src/
│   ├── app/
│   │   ├── api/                   # REST API route handlers
│   │   │   ├── auth/              # login / logout / me
│   │   │   ├── patients/          # CRUD + timeline
│   │   │   ├── appointments/      # CRUD + check-in
│   │   │   ├── queue/             # list + call-next/skip/complete
│   │   │   ├── visits/            # medical visits CRUD
│   │   │   ├── prescriptions/     # list + create
│   │   │   ├── invoices/          # CRUD + payments
│   │   │   ├── payments/          # list
│   │   │   ├── dashboard/         # role-aware stats
│   │   │   ├── reports/           # charts data
│   │   │   ├── audit-logs/        # audit log viewer
│   │   │   ├── staff/             # user management
│   │   │   ├── doctors/           # doctor management
│   │   │   ├── services/          # service catalog
│   │   │   ├── medications/       # medication catalog
│   │   │   ├── clinic/            # clinic info + settings
│   │   │   └── notifications/     # in-app notifications
│   │   ├── layout.tsx             # root layout with Sonner toaster
│   │   └── page.tsx               # SPA entry — switches between login & authenticated app
│   ├── components/
│   │   ├── layout/                # sidebar + topbar
│   │   ├── ui/                    # shadcn/ui primitives
│   │   └── views/                 # one file per app view (dashboard, patients, etc.)
│   └── lib/
│       ├── auth.ts                # session, password hashing, requirePermission/requireTenantScope
│       ├── audit.ts               # audit log writer
│       ├── permissions.ts         # permission catalog + role → permission mapping
│       ├── codes.ts               # patient/invoice/prescription/queue code generators
│       ├── format.ts              # currency / date / age helpers
│       ├── db.ts                  # Prisma client singleton
│       └── api-client.ts          # fetch wrapper for the SPA
├── .github/workflows/ci.yml       # lint + prisma generate on push
├── .env.example                   # documented env vars
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh/) ≥ 1.3 (or Node 20+ with npm/pnpm)
- A terminal

### Install & Run

```bash
# 1. Install dependencies
bun install

# 2. Set up env
cp .env.example .env
# Edit .env — generate SESSION_SECRET: openssl rand -hex 32

# 3. Push database schema
bun run db:push

# 4. Seed development data
bun run db:seed

# 5. Start dev server
bun run dev
```

Open http://localhost:3000 and log in with one of the dev accounts:

| Role          | Email                       | Password        |
| ------------- | --------------------------- | --------------- |
| Clinic Admin  | admin@clinic.test           | admin123        |
| Doctor        | ahmed@clinic.test           | doctor123       |
| Receptionist  | reception1@clinic.test      | reception123    |
| Nurse         | nurse1@clinic.test          | nurse123        |

> ⚠️ **Never use these credentials in production.** They are dev-only.

### Scripts

```bash
bun run dev         # Start dev server on port 3000
bun run lint        # ESLint
bun run db:push     # Push Prisma schema to database
bun run db:generate # Regenerate Prisma Client
bun run db:seed     # Seed dev data
bun run db:migrate  # Create a migration (PostgreSQL only)
bun run db:reset    # Drop & recreate database (DESTRUCTIVE)
```

---

## 🔐 Security Notes

This codebase follows the security requirements in the spec:

- ✅ **Password hashing** — scrypt with random 16-byte salt; constant-time comparison via `timingSafeEqual`.
- ✅ **Session management** — HTTP-only, SameSite=Lax cookies; signed with `SESSION_SECRET`; 7-day expiry.
- ✅ **Tenant isolation** — every API route uses `requirePermission()` and verifies `entity.clinicId === user.clinicId` before returning data. See `src/lib/auth.ts`.
- ✅ **RBAC** — granular permissions per spec #5; UI navigation adapts to role.
- ✅ **Audit logging** — all sensitive mutations are logged with old/new values.
- ✅ **Input validation** — Zod schemas on every POST/PATCH route.
- ✅ **SQL injection protection** — Prisma parameterized queries throughout.
- ✅ **Double-booking prevention** — database-level conflict check before creating appointments.
- ✅ **Transactional payments** — `db.$transaction()` ensures invoice status and payment records stay consistent.
- ✅ **Soft error messages** — auth failures return generic "Invalid email or password." to prevent user enumeration.
- ✅ **No secret leakage** — production errors return "Something went wrong." instead of stack traces.

### Production hardening (still required before live deployment)

- [ ] Configure HTTPS at the reverse proxy layer (Caddy/Nginx/Cloudflare).
- [ ] Set a strong `SESSION_SECRET` (≥ 32 bytes random).
- [ ] Switch `DATABASE_URL` to managed PostgreSQL.
- [ ] Enable rate limiting on `/api/auth` (e.g. 5 attempts / minute / IP).
- [ ] Set up automated database backups + retention.
- [ ] Configure secure headers (HSTS, CSP, X-Frame-Options).
- [ ] Set up object storage for patient documents (see spec #33).
- [ ] Configure external notifications (email/WhatsApp — see spec #36, #37).

---

## 🗄 Database

The Prisma schema (`prisma/schema.prisma`) defines the full multi-tenant data model:

- **Tenant**: `Clinic`, `Branch`, `Room`
- **Auth**: `User` (with `role`, `clinicId`, `branchId`)
- **Staff**: `Doctor`, `DoctorSchedule`, `DoctorTimeOff`
- **Patients**: `Patient` (with `patientCode` scoped to clinic, medical profile fields)
- **Appointments**: `Appointment`, `AppointmentStatusHistory`, `QueueEntry`
- **Medical**: `Visit`, `VisitVital`, `Medication`, `Prescription`, `PrescriptionItem`
- **Billing**: `Service`, `Invoice`, `InvoiceItem`, `Payment`
- **System**: `Notification`, `AuditLog`

### Switching to PostgreSQL

1. Change `datasource db` in `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Update `DATABASE_URL` in `.env` to your PostgreSQL connection string.
3. Run `bun run db:push` (or `bun run db:migrate dev` for proper migrations).

All enum-like fields use `String` + application-level validation, so no schema changes are needed when switching databases.

---

## 🌐 Localization

The architecture supports English, Arabic (with RTL), and French per spec #45. The `Clinic.locale` field is stored per tenant. UI strings are currently in English; a translation system (e.g. `next-intl`) can be added without restructuring.

Currency formatting uses the clinic's configured currency (default: `EGP`). Example: `EGP 18,500.00`.

---

## 🧪 Testing

The MVP includes the foundation for testing. Recommended additions:

- **Unit tests**: appointment availability, billing calculations, permission checks, queue logic.
- **Integration tests**: authentication, patient creation, appointment conflict, visit creation, invoice/payment workflow.
- **E2E tests**: full receptionist → doctor → billing flow (Playwright/Cypress).

---

## 📦 Deployment

### Frontend + API (Next.js)
Deploy to Vercel, Netlify, or any Node.js host. The app is a single deployable.

### Database
Use a managed PostgreSQL provider (Supabase, Neon, Railway, RDS).

### File Storage (for documents / lab results)
Use S3, Cloudflare R2, or any S3-compatible storage. The `documents` and `lab_results` models (Phase 2) will store metadata in the DB and binary files in object storage.

### Recommended production architecture
```
React Web App (Vercel)
       ↓
REST API (Next.js on Vercel)
       ↓
PostgreSQL (managed)
       ↓
Object Storage (S3/R2) — for patient documents
```

---

## 🗺 Roadmap

The MVP implements spec phases 1–8. Phase 2+ features (planned but not yet built):

- **Phase 2**: documents, lab results, notifications, email/WhatsApp reminders, online booking, patient portal, advanced reports.
- **Phase 3**: multiple branches (foundation already in place), inventory, suppliers, insurance, online payments, mobile app, AI features.

See `SPEC.md` for the full roadmap.

---

## 📜 License

This project is proprietary. All rights reserved.

---

## 🤝 Contributing

Follow the spec's vertical-slice approach: pick a module (e.g. "Patients"), implement backend → API → frontend → validation → tests, then move to the next. See spec #83 (Implementation Rule) and #114 (Build Priority).

Use conventional commits:
```
feat: add patient management
fix: prevent overlapping appointments
refactor: improve authorization middleware
test: add appointment conflict tests
```
