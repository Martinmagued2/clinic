# Clinic Command Center

## Complete Software Requirements & Build Specification

**Project Type:** Multi-tenant Clinic Management SaaS
**Primary Goal:** Build a production-ready clinic management platform that acts as the central operating system for clinics, managing patients, doctors, appointments, queues, medical visits, prescriptions, billing, staff, reports, notifications, and eventually patient-facing services and AI automation.

---

# 1. PRODUCT VISION

Build a modern, fast, secure, scalable clinic management platform.

The system should replace fragmented workflows such as:

* Paper patient records
* Excel spreadsheets
* WhatsApp appointment management
* Manual appointment books
* Separate billing records
* Manual queue management
* Paper prescriptions
* Unstructured medical notes

The platform should centralize everything.

The main concept is:

> **Clinic Command Center**

The clinic should always be able to answer:

* Who is coming today?
* Who is waiting?
* Which doctor is available?
* Which patients are currently being seen?
* What happened during the patient's previous visits?
* What prescriptions were issued?
* Who has paid?
* How much revenue was generated?
* Which appointments were cancelled or missed?
* How are doctors and services performing?

---

# 2. IMPORTANT DEVELOPMENT PRINCIPLES

The application must be designed as a **real SaaS product**, not a university CRUD project.

Prioritize:

1. Reliability
2. Security
3. Data integrity
4. Fast workflows
5. Good UX
6. Maintainability
7. Scalability
8. Clean architecture

Do not create unnecessary complexity where it doesn't provide value.

Do not hard-code clinic-specific information.

Do not hard-code currency, language, working hours, appointment duration, or services.

The architecture must support multiple clinics from the beginning.

---

# 3. MULTI-TENANCY

The platform must support multiple independent clinics.

Conceptually:

Platform
→ Clinic A
→ Clinic B
→ Clinic C

Each clinic has its own:

* Users
* Doctors
* Staff
* Patients
* Appointments
* Services
* Branches
* Rooms
* Medical records
* Prescriptions
* Invoices
* Payments
* Settings

Data from one clinic must NEVER be accessible by another clinic.

Every tenant-owned entity must be associated with a `clinic_id`.

Where appropriate, entities should also support `branch_id`.

The backend must enforce tenant isolation at the authorization/data-access layer rather than relying only on frontend filtering.

---

# 4. USER ROLES

Initial roles:

## 4.1 Super Admin

Platform-level user.

Can:

* Manage clinics
* Manage subscriptions
* Manage platform settings
* View platform-level analytics
* Suspend/activate clinics
* Manage platform users

Super Admin should not automatically be exposed to clinical information unless explicitly required by the platform architecture.

---

## 4.2 Clinic Owner / Clinic Admin

Can:

* Manage clinic
* Manage branches
* Manage doctors
* Manage staff
* Manage patients
* Manage appointments
* Manage services
* Manage billing
* View reports
* Configure settings
* Manage permissions
* View audit logs

---

## 4.3 Doctor

Can:

* View assigned appointments
* View patients they are authorized to access
* View medical history
* Create visits
* Update visit notes
* Record diagnosis
* Record treatment
* Create prescriptions
* Schedule follow-ups
* View relevant patient documents
* Manage their schedule

Doctors should NOT automatically have access to administrative financial information unless explicitly permitted.

---

## 4.4 Receptionist

Can:

* Create patients
* Edit patient basic information
* Search patients
* Create appointments
* Reschedule appointments
* Cancel appointments
* Check patients in
* Manage queue
* Collect payments
* Create invoices
* View basic appointment information

Receptionists should not have unrestricted access to sensitive medical records.

---

## 4.5 Nurse

Can:

* View appointments
* View relevant patient information
* Check patients in
* Manage queue
* Record vital signs
* Prepare patients for consultation

---

## 4.6 Patient

Patient portal should be implemented later.

Patients can eventually:

* Create/login to account
* View appointments
* Book appointments
* Cancel/reschedule according to clinic rules
* View prescriptions
* View documents
* View lab results
* View invoices/payment history
* Receive notifications

---

# 5. PERMISSION SYSTEM

Do not rely solely on roles.

Implement granular permissions.

Examples:

```text
patients.view
patients.create
patients.update
patients.delete

appointments.view
appointments.create
appointments.update
appointments.cancel

queue.view
queue.manage

medical_records.view
medical_records.create
medical_records.update

prescriptions.view
prescriptions.create

billing.view
billing.create
billing.update
payments.create

reports.view

staff.view
staff.manage

settings.view
settings.manage
```

Roles should be collections of permissions.

Clinic admins should eventually be able to customize permissions.

---

# 6. AUTHENTICATION

Implement:

* Login
* Logout
* Password hashing
* Password reset
* Session/token management
* Authentication middleware
* Authorization middleware
* Account activation/deactivation

Never store passwords in plaintext.

Use secure password hashing.

Protect authentication endpoints against brute-force attacks.

Implement rate limiting.

---

# 7. DASHBOARD

The dashboard must be role-aware.

---

## 7.1 Admin Dashboard

Display:

### Today's statistics

* Total appointments
* Completed appointments
* Waiting patients
* Cancelled appointments
* No-shows
* New patients
* Revenue

Example:

```text
Today's Patients: 42
Appointments: 35
Waiting: 7
Revenue: EGP 18,500
```

---

### Today's schedule

Show:

* Time
* Patient
* Doctor
* Service
* Status
* Room

---

### Revenue

Show:

* Today's revenue
* This week's revenue
* This month's revenue

---

### Patient statistics

Show:

* New patients
* Returning patients
* Patient growth

---

## 7.2 Doctor Dashboard

Display:

* Today's appointments
* Current patient
* Waiting queue
* Completed visits
* Upcoming appointments
* Follow-ups

Primary action:

> Start consultation

---

## 7.3 Reception Dashboard

Display:

* Today's appointments
* Waiting patients
* Quick patient search
* Quick appointment creation
* Check-in
* Queue

Reception workflow must be extremely fast.

---

# 8. PATIENT MANAGEMENT

Create a complete patient management module.

---

## 8.1 Patient List

Columns:

* Patient ID
* Name
* Phone
* Age
* Gender
* Last visit
* Upcoming appointment
* Status

Features:

* Search
* Filtering
* Sorting
* Pagination
* Add patient
* View patient
* Edit patient

Search by:

* Name
* Phone
* Patient ID

---

# 9. PATIENT REGISTRATION

Patient fields:

## Identity

* First name
* Last name
* Date of birth
* Gender
* Patient ID

Patient ID should be automatically generated.

Example:

```text
PT-000001
PT-000002
```

---

## Contact

* Phone
* Secondary phone
* Email
* Address
* Emergency contact

---

## Medical profile

* Blood type
* Allergies
* Chronic conditions
* Current medications
* Previous surgeries
* Relevant medical history
* Family history

Do not make every medical field mandatory.

The system should distinguish between:

* Required administrative fields
* Optional medical information

---

# 10. PATIENT PROFILE

Patient profile should be the central source of patient information.

Sections:

```text
Overview
Medical Information
Appointments
Visits
Prescriptions
Documents
Lab Results
Invoices
Payments
Timeline
```

Header:

```text
Ahmed Mohamed
Patient ID: PT-000124
Age: 32
Phone: XXXXXXXX
```

---

# 11. PATIENT TIMELINE

Create a unified timeline.

Example:

```text
28 Aug 2026
Consultation
Dr. Ahmed

Diagnosis:
...

Prescription:
...

Follow-up:
2 weeks


14 Jul 2026
Follow-up
Dr. Ahmed

Notes:
...
```

Timeline should support different event types:

* Appointment
* Visit
* Prescription
* Lab result
* Uploaded document
* Payment
* Invoice
* Follow-up

---

# 12. APPOINTMENT MANAGEMENT

Appointment fields:

```text
id
clinic_id
branch_id
patient_id
doctor_id
service_id
room_id
date
start_time
end_time
status
notes
created_by
created_at
updated_at
```

---

## Appointment statuses

Use controlled statuses:

```text
SCHEDULED
CONFIRMED
CHECKED_IN
WAITING
IN_CONSULTATION
COMPLETED
CANCELLED
NO_SHOW
RESCHEDULED
```

---

# 13. APPOINTMENT CREATION

Flow:

```text
Select Patient
↓
Select Doctor
↓
Select Service
↓
Select Date
↓
Show available slots
↓
Select Time
↓
Confirm
```

The system must prevent double booking.

Do not allow overlapping appointments for the same doctor unless explicitly supported by clinic configuration.

---

# 14. DOCTOR AVAILABILITY

Doctors have schedules.

Example:

```text
Monday
09:00 - 14:00

Tuesday
16:00 - 21:00

Wednesday
OFF
```

Support:

* Working hours
* Breaks
* Vacation
* Time off
* Holidays
* Blocked periods

Availability calculation must account for existing appointments.

---

# 15. CALENDAR

Implement:

### Day view

Shows one day's appointments.

### Week view

Shows doctor schedules across the week.

### Month view

General overview.

Filters:

* Doctor
* Branch
* Room
* Service
* Appointment status

Clicking an appointment opens appointment details.

---

# 16. CHECK-IN

When patient arrives:

Reception clicks:

> Check In

System should:

1. Change appointment status to `CHECKED_IN`
2. Add patient to queue
3. Generate queue number
4. Record check-in time
5. Notify appropriate staff

---

# 17. QUEUE MANAGEMENT

Queue is a first-class feature.

Example:

```text
#12 Ahmed       WAITING
#13 Mariam      WAITING
#14 Omar        IN CONSULTATION
#15 Sara        WAITING
```

Statuses:

```text
WAITING
CALLED
IN_ROOM
IN_CONSULTATION
COMPLETED
SKIPPED
```

Doctor can:

> Call Next Patient

Reception can:

* Add patient
* Reorder if permitted
* Skip
* Recall
* View estimated waiting time

---

# 18. WAITING ROOM DISPLAY

Future feature.

Create a display mode:

```text
NOW SERVING

A-014

Please proceed to
Room 2
```

The display should not expose sensitive medical information.

---

# 19. MEDICAL VISITS

When doctor starts consultation:

Display:

```text
Patient
Age
Allergies
Relevant medical information
Previous visits
Current medications
```

Then create visit.

---

## Visit fields

```text
id
clinic_id
patient_id
doctor_id
appointment_id

chief_complaint
symptoms
examination
assessment
diagnosis
treatment_plan
follow_up_date

created_at
updated_at
```

---

# 20. VITAL SIGNS

Support:

* Blood pressure
* Heart rate
* Temperature
* Weight
* Height
* Oxygen saturation
* Respiratory rate

Do not force all vitals for every clinic.

The clinic should be able to configure which fields are relevant.

---

# 21. DIAGNOSIS

Initial version can support structured diagnosis entries plus free text.

Future version can integrate standardized diagnosis coding.

Store:

* Diagnosis name
* Code if available
* Notes
* Primary/secondary status

---

# 22. TREATMENT PLAN

Doctor can enter:

* Treatment
* Recommendations
* Instructions
* Follow-up date

---

# 23. PRESCRIPTIONS

Doctor can create prescriptions from the visit.

Prescription:

```text
Prescription ID
Patient
Doctor
Date
```

Prescription item:

```text
Medicine
Strength
Dosage
Frequency
Duration
Route
Instructions
```

Example:

```text
Paracetamol
500 mg
1 tablet
Every 8 hours
5 days
After meals
```

---

# 24. MEDICATION DATABASE

Create a medication catalog.

Fields:

```text
id
name
active_ingredient
strength
form
manufacturer
status
```

Doctors can search medications.

Do not hard-code medication data.

The clinic/admin should be able to maintain its medication list.

---

# 25. PRESCRIPTION OUTPUT

Support:

* View
* Print
* PDF generation

Prescription should include:

* Clinic logo
* Clinic name
* Doctor
* Patient
* Date
* Medications
* Instructions

Digital signing can be considered later.

---

# 26. SERVICES

Clinic admins can create services.

Example:

```text
Consultation
Follow-up
Procedure
Lab Test
Dental Cleaning
```

Fields:

```text
name
description
price
duration
status
```

Potential future configuration:

* Doctor-specific price
* Branch-specific price
* Insurance price

---

# 27. BILLING

Invoices should support:

```text
Invoice
 ├── Invoice items
 ├── Discount
 ├── Tax if applicable
 ├── Total
 ├── Payments
 └── Remaining balance
```

---

# 28. INVOICE

Example:

```text
INVOICE #INV-00124

Consultation          500
Lab Test              300

Subtotal              800
Discount             -100

TOTAL                 700

Paid                  700
Remaining               0
```

Invoice statuses:

```text
DRAFT
ISSUED
PARTIALLY_PAID
PAID
CANCELLED
REFUNDED
```

---

# 29. PAYMENTS

Payment fields:

```text
id
invoice_id
amount
payment_method
payment_date
received_by
reference
notes
```

Payment methods should be configurable.

Initial defaults:

* Cash
* Card
* Bank transfer
* Online

Currency must be configurable.

Default for Egyptian deployment:

```text
EGP
```

But do not hard-code EGP into the architecture.

---

# 30. REFUNDS

Support refunds later.

Track:

* Refund amount
* Reason
* User
* Date
* Original payment

Never delete financial transactions.

Use reversal/refund records.

---

# 31. FINANCIAL DASHBOARD

Admin should see:

```text
Today's Revenue
Weekly Revenue
Monthly Revenue
Outstanding Payments
Refunds
```

Charts:

* Revenue over time
* Revenue by doctor
* Revenue by service
* Revenue by branch
* Payment methods

---

# 32. REPORTS

## Patient reports

* New patients
* Returning patients
* Patients per day/month
* Patient growth

## Appointment reports

* Completed
* Cancelled
* No-show
* Rescheduled
* Cancellation rate

## Doctor reports

* Appointments
* Completed consultations
* Patients
* Revenue
* Utilization

## Financial reports

* Revenue
* Payments
* Outstanding invoices
* Refunds

Allow:

* Date filtering
* Doctor filtering
* Branch filtering
* Service filtering
* Export where appropriate

---

# 33. DOCUMENT MANAGEMENT

Patients can have uploaded documents.

Types:

* PDF
* JPG
* PNG
* Medical reports
* Lab results
* X-rays
* Scans

Store files in object storage.

Do NOT store large binary files directly in PostgreSQL.

Database stores metadata:

```text
id
clinic_id
patient_id
file_name
file_type
storage_key
uploaded_by
created_at
```

Files must be protected by authorization.

Do not expose public storage URLs for sensitive documents.

---

# 34. LAB RESULTS

Initial implementation should allow:

* Upload lab report
* Add lab result record
* Attach result to patient
* Attach result to visit

Future version can support structured lab values.

---

# 35. NOTIFICATIONS

Create an internal notification system.

Notification fields:

```text
id
user_id
type
title
message
read
created_at
```

Examples:

* Appointment reminder
* New appointment
* Appointment cancellation
* Follow-up due
* Payment received
* Low inventory

---

# 36. EXTERNAL NOTIFICATIONS

Future integrations:

* WhatsApp
* SMS
* Email
* Push notifications

Do not tightly couple the core application to one provider.

Use a notification abstraction/service.

---

# 37. WHATSAPP AUTOMATION

High-priority future feature.

Patient can interact with clinic through WhatsApp.

Example:

```text
Patient:
I want to book an appointment

System:
Welcome to XYZ Clinic.

Choose specialty:

[Dermatology]
[Dental]
[Internal Medicine]
```

Then:

```text
Choose doctor
↓
Choose date
↓
Choose available time
↓
Confirm appointment
```

Also support:

* Appointment confirmation
* Reminder
* Cancellation
* Rescheduling
* Follow-up reminders

---

# 38. ONLINE BOOKING

Create a patient-facing booking flow.

```text
Choose Specialty
↓
Choose Doctor
↓
Choose Service
↓
Choose Date
↓
Choose Available Time
↓
Enter Patient Information
↓
Confirm
```

Only genuinely available slots should be shown.

Booking rules should be configurable.

---

# 39. PATIENT PORTAL

Future module.

Patient sees:

```text
Upcoming Appointment

Medical Records

Prescriptions

Lab Results

Documents

Invoices

Payments
```

Patient should only access their own data.

---

# 40. STAFF MANAGEMENT

Admin can:

* Add staff
* Edit staff
* Activate/deactivate staff
* Assign role
* Assign branch
* Assign permissions

Staff profile:

```text
Name
Phone
Email
Role
Branch
Status
```

---

# 41. DOCTOR MANAGEMENT

Doctor profile:

```text
Name
Specialty
Phone
Email
License information if required
Consultation fee
Branches
Rooms
Services
Schedule
```

Doctor should be linked to a system user where login access is required.

---

# 42. BRANCHES

Clinic can have multiple branches.

Branch:

```text
id
clinic_id
name
address
phone
working_hours
status
```

All branch-dependent resources should support `branch_id`.

---

# 43. ROOMS

Room:

```text
id
clinic_id
branch_id
name
type
status
```

Examples:

```text
Room 1
Room 2
Dental Room
Procedure Room
```

Appointments may optionally reference rooms.

---

# 44. CLINIC SETTINGS

Settings should include:

## General

* Clinic name
* Logo
* Phone
* Email
* Address

## Localization

* Language
* Currency
* Timezone
* Date format

## Appointments

* Default duration
* Booking rules
* Cancellation rules
* Buffer time

## Billing

* Tax settings
* Invoice numbering
* Payment methods

## Notifications

* Reminder timing
* Email configuration
* WhatsApp configuration

---

# 45. LOCALIZATION

The UI architecture must support:

* English
* Arabic
* French

Arabic must support full RTL.

Do not hard-code UI strings directly into components.

Use a localization system.

---

# 46. SEARCH

Implement global search.

Search entities:

* Patients
* Appointments
* Doctors
* Invoices
* Prescriptions

Patient search should be extremely fast.

Search by:

* Name
* Phone
* Patient ID

---

# 47. COMMAND PALETTE

Future feature:

`Ctrl + K`

Commands:

```text
Create patient
Create appointment
Find patient
Open today's queue
Create invoice
Open calendar
```

This is optional for MVP but desirable for the final product.

---

# 48. AUDIT LOGGING

Every important sensitive action should be logged.

Examples:

```text
User created patient
User updated patient
Doctor created visit
Doctor modified medical record
Receptionist changed appointment
Admin changed service price
User created invoice
User recorded payment
```

Audit log:

```text
id
clinic_id
user_id
action
entity_type
entity_id
old_values
new_values
ip_address if appropriate
created_at
```

Do not store unnecessary sensitive information in logs.

---

# 49. DATA SECURITY

This is a medical application.

Security must be treated as a core requirement.

Implement:

* HTTPS in production
* Password hashing
* Secure authentication
* RBAC
* Tenant isolation
* API authorization
* Input validation
* SQL injection protection
* XSS protection
* CSRF protection where applicable
* Rate limiting
* Secure headers
* Secure file access
* Audit logging
* Database backups
* Error handling without leaking secrets

Never expose:

* Password hashes
* Secrets
* API keys
* Internal database errors
* Private document URLs

---

# 50. DATA INTEGRITY

Use database constraints where appropriate.

Examples:

* Foreign keys
* Unique constraints
* NOT NULL constraints
* Check constraints
* Transactions

Critical workflows should be transactional.

For example:

Creating an appointment should not partially succeed.

Creating an invoice/payment relationship should maintain financial consistency.

---

# 51. APPOINTMENT CONCURRENCY

Appointment creation must handle concurrent requests.

Example:

Two receptionists attempt to book:

```text
Dr. Ahmed
5:00 PM
```

at the same time.

Only one should succeed.

Use database-level constraints/transactions rather than relying solely on frontend checks.

---

# 52. SOFT DELETE

Do not physically delete important medical/financial records casually.

Prefer:

```text
deleted_at
deleted_by
```

where appropriate.

Some entities should never be deleted, especially:

* Medical records
* Invoices
* Payments
* Audit logs

Instead use status/archiving.

---

# 53. BACKUPS

Production architecture must include:

* Automated database backups
* Backup retention
* Recovery strategy

Document restoration procedure.

---

# 54. ERROR HANDLING

Backend must use consistent errors.

Example:

```json
{
  "success": false,
  "error": {
    "code": "APPOINTMENT_CONFLICT",
    "message": "The selected time is no longer available."
  }
}
```

Frontend should display user-friendly messages.

Never expose raw stack traces to users.

---

# 55. API DESIGN

Use REST initially.

Base:

```text
/api/v1
```

Example:

```text
POST   /api/v1/auth/login

GET    /api/v1/patients
POST   /api/v1/patients
GET    /api/v1/patients/:id
PATCH  /api/v1/patients/:id

GET    /api/v1/appointments
POST   /api/v1/appointments
PATCH  /api/v1/appointments/:id
DELETE /api/v1/appointments/:id

GET    /api/v1/doctors
GET    /api/v1/doctors/:id/schedule

GET    /api/v1/queue
POST   /api/v1/queue/check-in

POST   /api/v1/visits
GET    /api/v1/patients/:id/visits

POST   /api/v1/prescriptions
GET    /api/v1/patients/:id/prescriptions

GET    /api/v1/invoices
POST   /api/v1/invoices

POST   /api/v1/payments
```

Use consistent naming conventions.

---

# 56. FRONTEND TECHNOLOGY

Recommended:

```text
React
Vite
TypeScript
React Router
TanStack Query
React Hook Form
Zod
Tailwind CSS
shadcn/ui
```

Prefer TypeScript throughout the application.

Avoid unnecessary global state.

Use server-state tools such as TanStack Query for API data.

---

# 57. BACKEND TECHNOLOGY

Recommended:

```text
Node.js
Express
TypeScript
PostgreSQL
Prisma
Zod
```

Architecture should be modular.

Example:

```text
backend/
  src/
    modules/
      auth/
      users/
      clinics/
      branches/
      doctors/
      patients/
      appointments/
      queue/
      visits/
      prescriptions/
      billing/
      reports/
      notifications/
    middleware/
    database/
    utils/
    config/
```

---

# 58. DATABASE

Use PostgreSQL.

Core tables:

```text
users
roles
permissions
role_permissions
user_roles

clinics
branches
rooms

doctors
doctor_schedules
doctor_time_off

patients
patient_contacts
patient_allergies
patient_conditions
patient_medications

appointments
appointment_status_history
queues
queue_entries

visits
visit_vitals
diagnoses
treatments

medications
prescriptions
prescription_items

services
doctor_services

invoices
invoice_items
payments
refunds

documents
lab_results

notifications

audit_logs
```

Future:

```text
inventory
products
suppliers
purchase_orders
insurance
claims
subscriptions
```

---

# 59. DATABASE RELATIONSHIP MODEL

Core relationship:

```text
Clinic
 ├── Branches
 │    ├── Rooms
 │    └── Staff
 │
 ├── Doctors
 │    └── Schedules
 │
 ├── Patients
 │
 ├── Services
 │
 ├── Appointments
 │    ├── Patient
 │    ├── Doctor
 │    ├── Service
 │    ├── Room
 │    └── Visit
 │
 └── Invoices
      ├── Invoice Items
      └── Payments
```

Patient:

```text
Patient
 ├── Appointments
 ├── Visits
 │    ├── Vitals
 │    ├── Diagnoses
 │    └── Treatment
 ├── Prescriptions
 ├── Documents
 ├── Lab Results
 └── Invoices
```

---

# 60. FRONTEND ROUTES

Suggested routes:

```text
/login

/dashboard

/patients
/patients/new
/patients/:id
/patients/:id/edit

/appointments
/appointments/new
/appointments/:id

/calendar

/queue

/doctors
/doctors/:id

/visits
/visits/:id

/prescriptions
/prescriptions/:id

/services

/invoices
/invoices/:id

/payments

/reports

/documents

/staff

/settings
```

Patient portal should eventually have its own route structure.

---

# 61. CORE UI SCREENS

MVP screens:

## Authentication

1. Login
2. Forgot password
3. Reset password

## Dashboard

4. Admin dashboard
5. Doctor dashboard
6. Reception dashboard

## Patients

7. Patient list
8. Add patient
9. Patient profile
10. Edit patient

## Appointments

11. Appointment list
12. Calendar
13. Create appointment
14. Appointment details

## Queue

15. Queue dashboard
16. Doctor queue

## Medical

17. Medical record
18. Create visit
19. Visit details
20. Create prescription
21. Prescription preview

## Finance

22. Services
23. Invoices
24. Invoice details
25. Payments

## Administration

26. Doctors
27. Staff
28. Reports
29. Clinic settings

---

# 62. USER EXPERIENCE

The application should be:

* Clean
* Modern
* Professional
* Fast
* Responsive
* Accessible

Avoid excessive animations.

This is a productivity application.

The main objective is to allow receptionists and doctors to complete tasks with minimal clicks.

---

# 63. RECEPTION UX PRIORITY

Receptionist should be able to:

```text
Find patient
→
Book appointment
→
Check in
→
Add to queue
→
Collect payment
```

with minimal navigation.

Provide quick actions.

Example:

```text
+ New Patient
+ New Appointment
Check In
Search Patient
```

---

# 64. DOCTOR UX PRIORITY

Doctor should be able to:

```text
Open today's appointments
→
Select patient
→
Quickly review history
→
Start visit
→
Record notes
→
Add diagnosis
→
Create prescription
→
Set follow-up
→
Complete
```

The medical workflow should be optimized for speed.

---

# 65. ADMIN UX PRIORITY

Admin should be able to quickly understand:

```text
Patients
Appointments
Doctors
Revenue
Performance
```

without opening multiple pages.

---

# 66. RESPONSIVENESS

Desktop is the primary environment for clinic staff.

But the system should also work on:

* Tablets
* Mobile browsers

Do not sacrifice desktop usability to make everything mobile-first.

---

# 67. ACCESSIBILITY

Implement:

* Keyboard navigation
* Proper labels
* Accessible forms
* Focus states
* Sufficient contrast
* Screen-reader-friendly semantics where practical

---

# 68. PERFORMANCE

Target:

* Fast initial load
* Paginated tables
* Lazy-loaded modules where useful
* Optimized queries
* Proper database indexes
* Debounced search
* Efficient API requests

Patient search must feel instant for normal clinic datasets.

---

# 69. DATABASE INDEXING

Add indexes for common queries.

Examples:

```text
patients.clinic_id
patients.phone
patients.name

appointments.clinic_id
appointments.doctor_id
appointments.patient_id
appointments.date
appointments.status

visits.patient_id
visits.doctor_id

invoices.clinic_id
invoices.patient_id
invoices.status
```

Tune based on actual query patterns.

---

# 70. LOGGING & MONITORING

Production backend should have structured logging.

Track:

* Errors
* API failures
* Authentication failures
* Important business events

Do not log passwords, tokens, or unnecessary medical information.

---

# 71. TESTING

Testing is required.

## Unit tests

Test:

* Appointment availability
* Billing calculations
* Permission checks
* Queue logic
* Prescription calculations if any
* Validation

## Integration tests

Test:

* Authentication
* Patient creation
* Appointment creation
* Appointment conflict
* Visit creation
* Invoice/payment workflow

## End-to-end tests

Critical flow:

```text
Login
→
Create patient
→
Create appointment
→
Check in
→
Queue
→
Doctor consultation
→
Create prescription
→
Create invoice
→
Payment
→
Complete
```

---

# 72. SEED DATA

Create development seed data.

Example:

```text
1 Clinic
2 Branches
3 Doctors
3 Receptionists
2 Nurses
20 Patients
Services
Appointments
Visits
Prescriptions
Invoices
Payments
```

Seed users should use clearly documented development-only credentials.

Never use default credentials in production.

---

# 73. ENVIRONMENT CONFIGURATION

Use environment variables.

Examples:

```text
DATABASE_URL
JWT_SECRET
SESSION_SECRET
STORAGE_ENDPOINT
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_BUCKET
EMAIL_PROVIDER_KEY
WHATSAPP_API_KEY
```

Never commit secrets.

Provide:

```text
.env.example
```

---

# 74. DEPLOYMENT

Recommended architecture:

```text
Frontend
   ↓
Vercel

Backend
   ↓
Node.js / Express
   ↓
Managed PostgreSQL

Files
   ↓
Object Storage
```

Use separate:

```text
development
staging
production
```

environments where practical.

---

# 75. MVP SCOPE

Do NOT attempt to build everything simultaneously.

MVP must include:

### Authentication

* Login
* Roles
* Permissions

### Clinic

* Clinic profile
* Staff
* Doctors

### Patients

* Patient CRUD
* Medical profile
* Patient timeline

### Appointments

* Appointment CRUD
* Calendar
* Doctor schedule
* Availability
* Conflict prevention

### Queue

* Check-in
* Queue
* Call next
* Queue status

### Medical

* Visits
* Vitals
* Diagnosis
* Treatment
* Prescriptions

### Billing

* Services
* Invoices
* Payments

### Dashboard

* Today's appointments
* Patients
* Queue
* Revenue

### Security

* Authentication
* Authorization
* Tenant isolation
* Audit logs
* Validation
* Rate limiting

---

# 76. PHASE 2

Implement:

* Documents
* Lab results
* Notifications
* Email reminders
* WhatsApp integration
* Appointment reminders
* Reports
* Advanced analytics
* Online booking
* Patient portal

---

# 77. PHASE 3

Implement:

* Multiple branches
* Inventory
* Suppliers
* Insurance
* Online payments
* Mobile application
* Advanced reporting
* API integrations
* AI features

---

# 78. AI FEATURES

AI must be introduced carefully.

Potential features:

## AI Medical Documentation

Doctor speaks or types notes.

AI structures:

```text
Chief Complaint
Symptoms
Examination
Assessment
Plan
```

AI must not independently diagnose or prescribe.

The doctor remains responsible for all clinical decisions.

---

## AI Appointment Assistant

Patient:

```text
عايز أحجز مع دكتور جلدية بكرة
```

Assistant:

```text
We have:
Dr. Ahmed — 5:00 PM
Dr. Sara — 7:30 PM

Which would you prefer?
```

Then book after confirmation.

---

## AI Search

Doctor:

```text
Show Ahmed's last three visits.
```

System retrieves authorized records.

---

## AI Analytics

Admin:

```text
Why did revenue decrease this month?
```

AI can analyze operational data and explain:

* Appointment volume
* Cancellations
* No-shows
* Service mix
* Doctor utilization

AI must respect user permissions.

---

# 79. INVENTORY — FUTURE

Optional depending on clinic type.

Track:

```text
Products
Stock
Suppliers
Purchases
Consumption
Expiry
```

Low-stock alerts.

---

# 80. INSURANCE — FUTURE

Potential entities:

```text
insurance_providers
insurance_plans
patient_insurance
claims
claim_items
```

Support insurance workflows later.

Do not complicate MVP.

---

# 81. SUBSCRIPTIONS — FUTURE

If this becomes SaaS:

```text
subscriptions
plans
subscription_events
usage
```

Potential plans:

### Starter

Small clinic.

### Professional

More doctors/staff + reports + integrations.

### Enterprise

Multiple branches + advanced features.

Do not implement billing/subscription logic until the core clinic workflow is stable.

---

# 82. PRODUCT ROADMAP

## Version 0.1

Foundation:

* Project setup
* Database
* Authentication
* Tenant architecture
* Roles
* Permissions

## Version 0.2

Clinic operations:

* Doctors
* Staff
* Patients
* Services

## Version 0.3

Appointments:

* Calendar
* Scheduling
* Availability
* Check-in
* Queue

## Version 0.4

Medical:

* Visits
* Vitals
* Diagnosis
* Prescriptions

## Version 0.5

Finance:

* Invoices
* Payments
* Revenue

## Version 0.6

Dashboard:

* Analytics
* Reports
* Performance

## Version 0.7

Security & quality:

* Audit logs
* Tests
* Backup
* Error handling
* Performance optimization

## Version 1.0

Production-ready MVP.

---

# 83. DEVELOPMENT RULE

Do not jump randomly between modules.

Implement in vertical slices.

For example:

```text
Patients
Backend
↓
Database
↓
API
↓
Frontend
↓
Validation
↓
Tests
↓
Complete
```

Then move to:

```text
Appointments
Backend
↓
Database
↓
API
↓
Frontend
↓
Tests
↓
Complete
```

This makes the project easier to debug and maintain.

---

# 84. ACCEPTANCE CRITERIA

A feature is not considered complete just because the UI exists.

For every feature:

1. Database implemented
2. API implemented
3. Validation implemented
4. Authorization implemented
5. Frontend implemented
6. Error handling implemented
7. Loading states implemented
8. Empty states implemented
9. Tests implemented
10. Audit logging added where necessary

---

# 85. EMPTY / LOADING / ERROR STATES

Every page must handle:

### Loading

Show skeleton/spinner.

### Empty

Example:

```text
No patients found.

[Add Patient]
```

### Error

Example:

```text
Something went wrong.

[Try Again]
```

Do not leave blank screens.

---

# 86. FORM VALIDATION

Use shared validation schemas.

Validate on:

* Frontend
* Backend

Never trust frontend validation alone.

Examples:

* Valid phone
* Valid email
* Valid date
* Appointment availability
* Positive invoice amounts
* Valid payment amount

---

# 87. TIMEZONE

Store timestamps consistently.

The clinic should have a configured timezone.

Default deployment:

```text
Africa/Cairo
```

But the application must support other timezones.

Be careful with:

* Appointment times
* Daylight saving changes
* Reports
* Notifications

---

# 88. CURRENCY

Currency should be configurable.

Default:

```text
EGP
```

But database and UI should support:

```text
USD
EUR
GBP
SAR
AED
```

without architectural changes.

---

# 89. NUMBER FORMATTING

Use locale-aware formatting.

Examples:

```text
EGP 18,500.00
```

Arabic localization should support appropriate formatting.

---

# 90. DATA EXPORT

Future/admin feature.

Allow authorized users to export:

* Patient list
* Appointment reports
* Revenue reports
* Financial reports

Exports should respect permissions and privacy.

---

# 91. PRIVACY

Medical information should only be available to authorized users.

Frontend route protection is NOT sufficient.

Every sensitive backend request must verify:

```text
Authenticated?
↓
Correct clinic?
↓
Correct role?
↓
Correct permission?
↓
Authorized resource?
```

---

# 92. CRITICAL SECURITY RULE

Never do:

```text
GET /patients/:id
```

and simply return the patient because the user is logged in.

The backend must verify:

```text
patient.clinic_id === currentUser.clinic_id
```

and then check the user's permission.

This is mandatory.

---

# 93. UI NAVIGATION

Main sidebar:

```text
Dashboard

Patients

Appointments
Calendar
Queue

Doctors
Staff
Services

Medical Records
Prescriptions

Billing
Payments

Reports

Notifications

Settings
```

Sidebar should adapt based on permissions.

---

# 94. QUICK ACTIONS

Dashboard should have:

```text
+ Add Patient
+ New Appointment
Check In Patient
Open Queue
Create Invoice
```

---

# 95. PATIENT QUICK VIEW

When hovering/clicking a patient:

Show:

```text
Name
Age
Phone
Allergies
Last Visit
Next Appointment
```

Then:

```text
View Full Profile
```

Do not expose sensitive medical information to unauthorized roles.

---

# 96. APPOINTMENT QUICK VIEW

Show:

```text
Patient
Doctor
Service
Time
Room
Status
Notes
Payment Status
```

Actions based on permissions:

```text
Check In
Reschedule
Cancel
Start Consultation
Mark Complete
```

---

# 97. NOTIFICATION RULES

Examples:

Appointment created:

```text
Appointment created successfully.
```

Appointment conflict:

```text
This time is no longer available.
```

Payment:

```text
Payment recorded successfully.
```

Prescription:

```text
Prescription created successfully.
```

---

# 98. DESIGN SYSTEM

Create reusable components:

```text
Button
Input
Select
DatePicker
Modal
Drawer
Table
Badge
Card
Tabs
Dropdown
Toast
Tooltip
Pagination
Search
EmptyState
LoadingState
ConfirmDialog
```

Do not create five different button implementations.

Build a consistent design system.

---

# 99. TABLES

Tables should support:

* Search
* Sort
* Pagination
* Filters
* Column visibility where useful
* Row actions

Mobile should provide a sensible alternative rather than forcing a huge desktop table onto a phone.

---

# 100. FORMS

Forms should:

* Show validation immediately where useful
* Preserve entered data on errors
* Disable submit during requests
* Prevent double submission
* Show success/error feedback

---

# 101. MODALS

Use modals for short actions:

* Confirm cancellation
* Confirm deletion/archive
* Quick payment
* Quick check-in

Use full pages/drawers for complex workflows such as creating a medical visit.

---

# 102. MEDICAL RECORD UX

Doctor should see:

```text
PATIENT HEADER

Ahmed Mohamed
32 years
Allergies: Penicillin

────────────────────

Previous Visits

────────────────────

CURRENT VISIT

Chief Complaint
[                    ]

Symptoms
[                    ]

Vitals

BP     HR     Temp
...

Diagnosis
[                    ]

Treatment
[                    ]

Prescription
[ + Add Medication ]

Follow-up
[ Date ]

[Save & Complete]
```

Make this screen extremely efficient.

---

# 103. BILLING UX

After consultation:

```text
Visit Completed
↓
Invoice Generated
↓
Payment
↓
Receipt
```

The system should optionally automate invoice creation after a completed appointment based on clinic settings.

---

# 104. AUTOMATION ENGINE — FUTURE

Eventually create rules such as:

```text
When appointment is created
→ send confirmation

24 hours before appointment
→ send reminder

When appointment is completed
→ create follow-up reminder if configured

When invoice is unpaid
→ notify reception
```

Keep this logic modular.

---

# 105. WEBHOOK ARCHITECTURE — FUTURE

External integrations should use:

```text
/api/v1/webhooks/...
```

Validate webhook signatures.

Implement replay protection where appropriate.

Log webhook events safely.

---

# 106. API DOCUMENTATION

Provide API documentation.

Use OpenAPI/Swagger or an equivalent system.

Document:

* Endpoint
* Method
* Authentication
* Permissions
* Request body
* Response
* Errors

---

# 107. README

The project README must contain:

* Project overview
* Architecture
* Tech stack
* Installation
* Environment variables
* Database setup
* Migration instructions
* Seed instructions
* Development commands
* Testing
* Deployment
* Security notes

---

# 108. GIT WORKFLOW

Use clear commits.

Examples:

```text
feat: add patient management
feat: implement appointment scheduling
feat: add queue management
fix: prevent overlapping appointments
refactor: improve authorization middleware
test: add appointment conflict tests
```

Do not commit secrets.

---

# 109. CODE QUALITY

Requirements:

* TypeScript
* Strict typing where practical
* Reusable services
* Reusable components
* No duplicated business logic
* Clear naming
* Modular architecture
* No giant files
* No hard-coded secrets
* No unnecessary dependencies

---

# 110. DO NOT OVERENGINEER

Do not implement:

* Microservices
* Kubernetes
* Event-driven architecture
* Complex AI infrastructure

unless the actual scale requires it.

Start with a modular monolith.

Recommended:

```text
React frontend
        ↓
Express API
        ↓
PostgreSQL
        ↓
Object storage
```

This is enough for the initial product.

---

# 111. FINAL ARCHITECTURE

Target architecture:

```text
                         USERS
                           │
                           ▼
                    React Web App
                           │
                           ▼
                     REST API
                           │
             ┌─────────────┴─────────────┐
             │                           │
       Auth / RBAC                 Business Logic
             │                           │
             └─────────────┬─────────────┘
                           │
                      PostgreSQL
                           │
             ┌─────────────┴─────────────┐
             │                           │
        Object Storage              Notifications
                                         │
                                  Email / WhatsApp
```

---

# 112. SUCCESSFUL MVP DEFINITION

The MVP is successful when a real receptionist and doctor can operate a clinic entirely through the system.

A complete real-world scenario must work:

```text
Receptionist logs in
        ↓
Creates patient
        ↓
Books appointment
        ↓
Patient arrives
        ↓
Reception checks patient in
        ↓
Patient enters queue
        ↓
Doctor calls patient
        ↓
Doctor opens patient history
        ↓
Doctor starts consultation
        ↓
Doctor records vitals
        ↓
Doctor records diagnosis
        ↓
Doctor records treatment
        ↓
Doctor creates prescription
        ↓
Doctor schedules follow-up
        ↓
Visit completed
        ↓
Invoice generated
        ↓
Reception records payment
        ↓
Patient receives/prints prescription
        ↓
Dashboard updates
        ↓
Audit log records important actions
```

This complete flow must be tested end-to-end.

---

# 113. IMPLEMENTATION INSTRUCTION TO THE DEVELOPMENT AGENT

You are responsible for building this application according to this specification.

Before implementing a feature:

1. Understand its dependencies.
2. Check the existing architecture.
3. Do not duplicate existing functionality.
4. Follow existing coding conventions.
5. Implement backend/database first where appropriate.
6. Implement authorization before exposing sensitive data.
7. Implement frontend.
8. Add validation.
9. Add loading/error/empty states.
10. Add tests.
11. Verify the complete workflow.
12. Update documentation.

Do not silently change major architectural decisions.

If a requirement is ambiguous, choose the simplest production-safe implementation that preserves future scalability.

Do not remove security controls to make development easier.

Do not use mock data in production functionality.

Use seed data only for development/testing.

---

# 114. BUILD PRIORITY

Build in this exact priority:

### PHASE 1 — FOUNDATION

* Repository structure
* TypeScript
* PostgreSQL
* Prisma
* Environment configuration
* Authentication
* Users
* Roles
* Permissions
* Clinics
* Tenant isolation
* Audit logs

### PHASE 2 — CLINIC

* Doctors
* Staff
* Branches
* Rooms
* Services
* Schedules

### PHASE 3 — PATIENTS

* Patient registration
* Patient list
* Patient profile
* Medical profile
* Timeline

### PHASE 4 — APPOINTMENTS

* Appointment creation
* Availability
* Calendar
* Rescheduling
* Cancellation
* Conflict prevention

### PHASE 5 — QUEUE

* Check-in
* Queue
* Call next
* Queue statuses
* Doctor queue

### PHASE 6 — MEDICAL

* Visits
* Vitals
* Diagnosis
* Treatment
* Prescriptions
* Medication catalog

### PHASE 7 — BILLING

* Services
* Invoices
* Payments
* Revenue

### PHASE 8 — DASHBOARD

* Statistics
* Today's operations
* Revenue
* Appointment analytics

### PHASE 9 — QUALITY

* Tests
* Security review
* Performance
* Error handling
* Backup strategy
* Documentation

### PHASE 10 — VERSION 2

* Documents
* Lab results
* Notifications
* WhatsApp
* Online booking
* Patient portal
* Reports

---

# 115. IMPORTANT: BUILD THE FOUNDATION CORRECTLY

Do not start by building random UI screens.

First establish:

```text
Database
↓
Authentication
↓
Tenant isolation
↓
Authorization
↓
Core domain models
↓
API architecture
↓
Frontend architecture
```

Then build features on top.

The final application should feel like one coherent product, not a collection of unrelated CRUD pages.

---

# 116. PRODUCT NAME / BRANDING

Working product name:

**Clinic Command Center**

This can be changed later.

The UI should initially use a neutral, professional medical identity.

Do not make it look like an old hospital ERP.

The visual language should feel:

* Modern
* Clean
* Trustworthy
* Professional
* Calm
* Efficient

---

# 117. FINAL PRODUCT STRUCTURE

At completion, the platform should conceptually be:

```text
                    CLINIC COMMAND CENTER
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
    PATIENTS             OPERATIONS             FINANCE
       │                     │                     │
       │                Appointments           Invoices
       │                Calendar               Payments
       │                Queue                  Revenue
       │                Doctors
       │
       ├── Medical Records
       ├── Visits
       ├── Prescriptions
       ├── Documents
       └── Lab Results

                             │
                       ADMINISTRATION
                             │
                  Staff / Roles / Settings
                             │
                          REPORTS
                             │
                      NOTIFICATIONS
                             │
                     FUTURE AUTOMATION
                             │
                  WhatsApp / AI / Portal
```

---

# 118. DEFINITION OF DONE

The project should not be considered complete until:

* All MVP modules work together.
* Users cannot access unauthorized data.
* Clinics are isolated from each other.
* Appointment conflicts are prevented.
* Medical records are protected.
* Financial records are consistent.
* Important actions are audited.
* Forms have validation.
* APIs have proper authorization.
* Loading/error/empty states exist.
* Critical workflows have automated tests.
* Production environment variables are documented.
* Database migrations work.
* Seed data works.
* Deployment works.
* README is complete.
* No secrets are committed.
* No critical console errors remain.
* No placeholder/mock functionality remains in production flows.

---

# FINAL OBJECTIVE

Build a **production-quality, multi-tenant Clinic Management SaaS** that can realistically be deployed to a clinic.

The MVP must make the clinic operationally independent from paper records, spreadsheets, and manual appointment/queue management.

The core experience should be:

> **Patient → Appointment → Check-in → Queue → Consultation → Medical Record → Prescription → Invoice → Payment → Follow-up → Analytics**

Everything else should build around this workflow.

The system should be designed so that future capabilities — WhatsApp automation, online booking, patient portal, multiple branches, inventory, insurance, AI assistance, mobile apps, and SaaS subscriptions — can be added without rebuilding the core architecture.
