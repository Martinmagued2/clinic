// =====================================================================
// Seed script — populates dev database with a realistic clinic
// dataset for local development (spec #72).
//
// Run: `bun run db:seed`
//
// NEVER run in production. All credentials below are dev-only.
// =====================================================================

import { PrismaClient } from '@prisma/client'
import { scryptSync, randomBytes } from 'crypto'

const db = new PrismaClient()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('🌱 Seeding clinic command center...')

  // Clean
  await db.auditLog.deleteMany()
  await db.notification.deleteMany()
  await db.payment.deleteMany()
  await db.invoiceItem.deleteMany()
  await db.invoice.deleteMany()
  await db.prescriptionItem.deleteMany()
  await db.prescription.deleteMany()
  await db.visitVital.deleteMany()
  await db.visit.deleteMany()
  await db.queueEntry.deleteMany()
  await db.appointmentStatusHistory.deleteMany()
  await db.appointment.deleteMany()
  await db.medication.deleteMany()
  await db.service.deleteMany()
  await db.doctorTimeOff.deleteMany()
  await db.doctorSchedule.deleteMany()
  await db.doctor.deleteMany()
  await db.room.deleteMany()
  await db.patient.deleteMany()
  await db.user.deleteMany()
  await db.branch.deleteMany()
  await db.clinic.deleteMany()

  // 1. Clinic
  const clinic = await db.clinic.create({
    data: {
      name: 'Cairo Medical Center',
      legalName: 'Cairo Medical Center LLC',
      code: 'CMC',
      phone: '+20 2 1234 5678',
      email: 'info@cairomedical.example',
      address: '12 Tahrir Square, Cairo, Egypt',
      currency: 'EGP',
      locale: 'en',
      timezone: 'Africa/Cairo',
    },
  })

  // 2. Branches
  const downtown = await db.branch.create({
    data: {
      clinicId: clinic.id,
      name: 'Downtown',
      phone: '+20 2 1234 5678',
      address: '12 Tahrir Square, Cairo',
      workingHours: JSON.stringify({
        mon: { open: '09:00', close: '21:00' },
        tue: { open: '09:00', close: '21:00' },
        wed: { open: '09:00', close: '21:00' },
        thu: { open: '09:00', close: '21:00' },
        sun: { open: '09:00', close: '21:00' },
      }),
    },
  })
  const nasrCity = await db.branch.create({
    data: {
      clinicId: clinic.id,
      name: 'Nasr City',
      phone: '+20 2 8765 4321',
      address: '45 Abbas Aqqad, Nasr City, Cairo',
    },
  })

  // 3. Rooms
  await db.room.createMany({
    data: [
      { clinicId: clinic.id, branchId: downtown.id, name: 'Room 1', type: 'CONSULTATION' },
      { clinicId: clinic.id, branchId: downtown.id, name: 'Room 2', type: 'CONSULTATION' },
      { clinicId: clinic.id, branchId: downtown.id, name: 'Procedure Room', type: 'PROCEDURE' },
      { clinicId: clinic.id, branchId: nasrCity.id, name: 'Room A', type: 'CONSULTATION' },
      { clinicId: clinic.id, branchId: nasrCity.id, name: 'Dental Room', type: 'DENTAL' },
    ],
  })

  // 4. Users (clinic admin, doctors, receptionists, nurses)
  const admin = await db.user.create({
    data: {
      email: 'admin@clinic.test',
      passwordHash: hashPassword('admin123'),
      name: 'Dr. Mohamed Admin',
      role: 'CLINIC_ADMIN',
      clinicId: clinic.id,
      branchId: downtown.id,
      phone: '+20 100 000 0001',
    },
  })

  const drAhmed = await db.doctor.create({
    data: {
      clinicId: clinic.id,
      branchId: downtown.id,
      name: 'Dr. Ahmed Hassan',
      specialty: 'Internal Medicine',
      phone: '+20 100 111 2222',
      email: 'ahmed@clinic.test',
      licenseNumber: 'EG-INT-001',
      consultationFee: 500,
      schedules: {
        create: [
          { dayOfWeek: 0, startTime: '10:00', endTime: '14:00' },
          { dayOfWeek: 1, startTime: '10:00', endTime: '18:00' },
          { dayOfWeek: 2, startTime: '10:00', endTime: '18:00' },
          { dayOfWeek: 3, startTime: '10:00', endTime: '18:00' },
          { dayOfWeek: 4, startTime: '10:00', endTime: '14:00' },
        ],
      },
    },
  })

  const drSara = await db.doctor.create({
    data: {
      clinicId: clinic.id,
      branchId: downtown.id,
      name: 'Dr. Sara Mostafa',
      specialty: 'Dermatology',
      phone: '+20 100 222 3333',
      email: 'sara@clinic.test',
      licenseNumber: 'EG-DER-002',
      consultationFee: 600,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '14:00', endTime: '21:00' },
          { dayOfWeek: 2, startTime: '14:00', endTime: '21:00' },
          { dayOfWeek: 4, startTime: '14:00', endTime: '21:00' },
          { dayOfWeek: 5, startTime: '14:00', endTime: '21:00' },
        ],
      },
    },
  })

  const drOmar = await db.doctor.create({
    data: {
      clinicId: clinic.id,
      branchId: nasrCity.id,
      name: 'Dr. Omar Khaled',
      specialty: 'Dental',
      phone: '+20 100 333 4444',
      email: 'omar@clinic.test',
      licenseNumber: 'EG-DEN-003',
      consultationFee: 800,
      schedules: {
        create: [
          { dayOfWeek: 0, startTime: '12:00', endTime: '20:00' },
          { dayOfWeek: 2, startTime: '12:00', endTime: '20:00' },
          { dayOfWeek: 4, startTime: '12:00', endTime: '20:00' },
        ],
      },
    },
  })

  // Login users for doctors
  await db.user.create({
    data: {
      email: 'ahmed@clinic.test',
      passwordHash: hashPassword('doctor123'),
      name: 'Dr. Ahmed Hassan',
      role: 'DOCTOR',
      clinicId: clinic.id,
      branchId: downtown.id,
      phone: '+20 100 111 2222',
      doctor: { connect: { id: drAhmed.id } },
    },
  })
  await db.user.create({
    data: {
      email: 'sara@clinic.test',
      passwordHash: hashPassword('doctor123'),
      name: 'Dr. Sara Mostafa',
      role: 'DOCTOR',
      clinicId: clinic.id,
      branchId: downtown.id,
      phone: '+20 100 222 3333',
      doctor: { connect: { id: drSara.id } },
    },
  })
  await db.user.create({
    data: {
      email: 'omar@clinic.test',
      passwordHash: hashPassword('doctor123'),
      name: 'Dr. Omar Khaled',
      role: 'DOCTOR',
      clinicId: clinic.id,
      branchId: nasrCity.id,
      phone: '+20 100 333 4444',
      doctor: { connect: { id: drOmar.id } },
    },
  })

  // Receptionists
  for (let i = 1; i <= 3; i++) {
    await db.user.create({
      data: {
        email: `reception${i}@clinic.test`,
        passwordHash: hashPassword('reception123'),
        name: `Receptionist ${i}`,
        role: 'RECEPTIONIST',
        clinicId: clinic.id,
        branchId: i === 3 ? nasrCity.id : downtown.id,
        phone: `+20 100 444 ${i}${i}${i}${i}`,
      },
    })
  }

  // Nurses
  for (let i = 1; i <= 2; i++) {
    await db.user.create({
      data: {
        email: `nurse${i}@clinic.test`,
        passwordHash: hashPassword('nurse123'),
        name: `Nurse ${i}`,
        role: 'NURSE',
        clinicId: clinic.id,
        branchId: downtown.id,
        phone: `+20 100 555 ${i}${i}${i}${i}`,
      },
    })
  }

  // 5. Services
  await db.service.createMany({
    data: [
      { clinicId: clinic.id, name: 'Consultation', price: 500, duration: 30 },
      { clinicId: clinic.id, name: 'Follow-up', price: 250, duration: 20 },
      { clinicId: clinic.id, name: 'Dental Cleaning', price: 800, duration: 45 },
      { clinicId: clinic.id, name: 'Tooth Extraction', price: 1200, duration: 60 },
      { clinicId: clinic.id, name: 'Skin Biopsy', price: 1500, duration: 45 },
      { clinicId: clinic.id, name: 'ECG', price: 350, duration: 20 },
      { clinicId: clinic.id, name: 'Complete Blood Count', price: 200, duration: 15 },
      { clinicId: clinic.id, name: 'X-Ray', price: 400, duration: 15 },
    ],
  })

  const allServices = await db.service.findMany({ where: { clinicId: clinic.id } })
  const consultation = allServices.find((s) => s.name === 'Consultation')!

  // 6. Medications
  await db.medication.createMany({
    data: [
      { clinicId: clinic.id, name: 'Paracetamol', activeIngredient: 'Acetaminophen', strength: '500mg', form: 'TABLET', manufacturer: 'GSK' },
      { clinicId: clinic.id, name: 'Amoxicillin', activeIngredient: 'Amoxicillin', strength: '500mg', form: 'CAPSULE', manufacturer: 'Pfizer' },
      { clinicId: clinic.id, name: 'Ibuprofen', activeIngredient: 'Ibuprofen', strength: '400mg', form: 'TABLET', manufacturer: 'Bayer' },
      { clinicId: clinic.id, name: 'Omeprazole', activeIngredient: 'Omeprazole', strength: '20mg', form: 'CAPSULE', manufacturer: 'AstraZeneca' },
      { clinicId: clinic.id, name: 'Cetirizine', activeIngredient: 'Cetirizine', strength: '10mg', form: 'TABLET', manufacturer: 'Novartis' },
      { clinicId: clinic.id, name: 'Metformin', activeIngredient: 'Metformin HCl', strength: '850mg', form: 'TABLET', manufacturer: 'Merck' },
    ],
  })
  const allMeds = await db.medication.findMany({ where: { clinicId: clinic.id } })

  // 7. Patients (20)
  const firstNames = ['Ahmed', 'Mohamed', 'Mariam', 'Sara', 'Omar', 'Fatma', 'Youssef', 'Nour', 'Khaled', 'Laila', 'Hassan', 'Salma', 'Tarek', 'Hana', 'Mostafa', 'Yara', 'Amr', 'Dina', 'Karim', 'Reem']
  const lastNames = ['Ali', 'Hassan', 'Ibrahim', 'Said', 'Mahmoud', 'Fouad', 'Adel', 'Sami', 'Nabil', 'Rashed']
  const patients = []
  for (let i = 0; i < 20; i++) {
    const fname = firstNames[i]
    const lname = lastNames[i % lastNames.length]
    const dob = new Date(1950 + Math.floor(Math.random() * 60), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    const p = await db.patient.create({
      data: {
        clinicId: clinic.id,
        patientCode: `PT-${String(i + 1).padStart(6, '0')}`,
        firstName: fname,
        lastName: lname,
        dateOfBirth: dob,
        gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
        phone: `+20 100 ${String(1000000 + i * 137).slice(0, 7)}`,
        email: `${fname.toLowerCase()}.${lname.toLowerCase()}@example.com`,
        address: `${i + 1} Example St, Cairo`,
        emergencyContact: `+20 122 ${String(1000000 + i * 89).slice(0, 7)}`,
        bloodType: ['A+', 'B+', 'O+', 'AB+', 'A-', 'O-'][i % 6],
        allergies: i % 5 === 0 ? 'Penicillin' : null,
        chronicConditions: i % 7 === 0 ? 'Hypertension, Diabetes' : null,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      },
    })
    patients.push(p)
  }

  // 8. Appointments — today + recent past
  const doctors = [drAhmed, drSara, drOmar]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let dayOffset = -5; dayOffset <= 1; dayOffset++) {
    const date = new Date(today)
    date.setDate(date.getDate() + dayOffset)
    const apptsPerDay = 5 + Math.floor(Math.random() * 5)
    for (let i = 0; i < apptsPerDay; i++) {
      const patient = patients[Math.floor(Math.random() * patients.length)]
      const doctor = doctors[i % doctors.length]
      const hour = 9 + Math.floor(i * 1.5)
      const minute = (i % 2) * 30
      const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const endHour = hour + Math.floor((minute + 30) / 60)
      const endMinute = (minute + 30) % 60
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`

      let status = 'COMPLETED'
      if (dayOffset === 0) {
        status = ['SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED'][i % 5]
      } else if (dayOffset === 1) {
        status = 'SCHEDULED'
      } else if (Math.random() < 0.1) {
        status = 'NO_SHOW'
      }

      await db.appointment.create({
        data: {
          clinicId: clinic.id,
          branchId: doctor.branchId,
          patientId: patient.id,
          doctorId: doctor.id,
          serviceId: consultation.id,
          date,
          startTime,
          endTime,
          status,
          notes: '',
          createdById: admin.id,
        },
      })
    }
  }

  // 9. A few sample visits + prescriptions + invoices (last 3 days)
  const recentPatients = patients.slice(0, 8)
  for (let i = 0; i < recentPatients.length; i++) {
    const p = recentPatients[i]
    const d = doctors[i % doctors.length]
    const date = new Date(today)
    date.setDate(date.getDate() - (i % 4) - 1)
    const visit = await db.visit.create({
      data: {
        clinicId: clinic.id,
        patientId: p.id,
        doctorId: d.id,
        chiefComplaint: 'Routine checkup',
        symptoms: 'Mild headache, fatigue',
        examination: 'Vitals normal, no acute distress',
        assessment: 'Stable, likely viral',
        diagnosis: 'Common cold',
        treatmentPlan: 'Rest, fluids, paracetamol as needed',
        followUpDate: i % 3 === 0 ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
        status: 'COMPLETED',
        createdById: admin.id,
        createdAt: date,
        vitals: {
          create: {
            bloodPressure: '120/80',
            heartRate: 72,
            temperature: 37.1,
            weight: 75,
            height: 175,
            oxygenSaturation: 98,
            respiratoryRate: 16,
          },
        },
      },
    })
    await db.prescription.create({
      data: {
        clinicId: clinic.id,
        patientId: p.id,
        doctorId: d.id,
        visitId: visit.id,
        prescriptionCode: `RX-${String(i + 1).padStart(6, '0')}`,
        createdById: admin.id,
        createdAt: date,
        items: {
          create: [
            {
              medicationId: allMeds[0].id,
              medicationName: allMeds[0].name,
              strength: '500mg',
              dosage: '1 tablet',
              frequency: 'Every 8 hours',
              duration: '5 days',
              route: 'Oral',
              instructions: 'After meals',
            },
          ],
        },
      },
    })
    const invoice = await db.invoice.create({
      data: {
        clinicId: clinic.id,
        patientId: p.id,
        visitId: visit.id,
        invoiceCode: `INV-${String(i + 1).padStart(6, '0')}`,
        createdById: admin.id,
        createdAt: date,
        status: i % 4 === 0 ? 'ISSUED' : 'PAID',
        subtotal: 500,
        discount: 0,
        tax: 0,
        total: 500,
        items: {
          create: [
            {
              description: 'Consultation',
              serviceId: consultation.id,
              quantity: 1,
              unitPrice: 500,
              total: 500,
            },
          ],
        },
      },
    })
    if (invoice.status === 'PAID') {
      await db.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: 500,
          paymentMethod: ['CASH', 'CARD', 'BANK_TRANSFER'][i % 3],
          paymentDate: date,
          receivedById: admin.id,
        },
      })
    }
  }

  // 10. Notifications
  await db.notification.createMany({
    data: [
      { clinicId: clinic.id, userId: admin.id, type: 'APPOINTMENT_REMINDER', title: 'Upcoming appointment', message: 'You have 5 appointments today.' },
      { clinicId: clinic.id, userId: admin.id, type: 'PAYMENT_RECEIVED', title: 'Payment received', message: 'EGP 500.00 received from Ahmed Ali.' },
    ],
  })

  // 11. Patient portal account (for the first patient — Ahmed Ali)
  const firstPatient = patients[0]
  await db.patientAccount.create({
    data: {
      clinicId: clinic.id,
      patientId: firstPatient.id,
      email: 'ahmed.ali@patient.portal',
      passwordHash: hashPassword('patient123'),
      status: 'ACTIVE',
    },
  })

  console.log('✅ Seed complete.')
  console.log('')
  console.log('Login credentials (dev only):')
  console.log('  Admin:         admin@clinic.test / admin123')
  console.log('  Doctor:        ahmed@clinic.test / doctor123')
  console.log('  Receptionist:  reception1@clinic.test / reception123')
  console.log('  Nurse:         nurse1@clinic.test / nurse123')
  console.log('  Patient Portal: ahmed.ali@patient.portal / patient123')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
