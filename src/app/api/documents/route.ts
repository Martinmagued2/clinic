// Documents API — list / upload (spec #33)
// Uses Supabase Storage in production, filesystem in dev.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { audit } from '@/lib/audit'
import { uploadFile, BUCKET_PATIENT_DOCS } from '@/lib/storage'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

// Validate file extension (don't trust MIME type alone — spec #18)
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx']

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission('patients.view')
    const url = new URL(req.url)
    const patientId = url.searchParams.get('patientId')

    const where: Record<string, unknown> = { clinicId: user.clinicId! }
    if (patientId) where.patientId = patientId

    const documents = await db.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        clinicId: true,
        patientId: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        storageKey: true,
        category: true,
        description: true,
        uploadedById: true,
        createdAt: true,
        patient: true,
        uploadedBy: { select: { name: true } },
      },
    })
    return apiSuccess({ documents })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('patients.create')
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const patientId = formData.get('patientId') as string
    const visitId = (formData.get('visitId') as string) || null
    const category = (formData.get('category') as string) || 'OTHER'
    const description = (formData.get('description') as string) || null

    // Validation (spec #18)
    if (!file || !patientId) {
      return apiError('VALIDATION_ERROR', 'File and patientId are required.', 400)
    }
    if (file.size > MAX_FILE_SIZE) {
      return apiError('FILE_TOO_LARGE', 'File exceeds 10MB limit.', 413)
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError('UNSUPPORTED_TYPE', 'File type not allowed.', 415)
    }

    // Validate extension (don't trust MIME alone)
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return apiError('UNSUPPORTED_TYPE', 'File extension not allowed.', 415)
    }

    // Tenant check (spec #16)
    const patient = await db.patient.findUnique({ where: { id: patientId } })
    if (!patient || patient.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Patient not found.', 404)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storagePath = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`

    // Upload to Supabase Storage (or filesystem in dev)
    await uploadFile(BUCKET_PATIENT_DOCS, storagePath, buffer, file.type)

    // Store metadata in database (spec #17 — database has metadata, storage has file)
    const document = await db.document.create({
      data: {
        clinicId: user.clinicId!,
        patientId,
        visitId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storageKey: storagePath,
        category,
        description,
        uploadedById: user.id,
      },
    })

    await audit({
      clinicId: user.clinicId,
      userId: user.id,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'Document',
      entityId: document.id,
      newValues: { fileName: file.name, patientId, size: file.size },
      ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: req.headers.get('user-agent'),
    })

    return apiSuccess({ document }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
