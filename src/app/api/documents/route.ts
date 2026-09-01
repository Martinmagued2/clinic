// Documents API — list / upload (spec #33)
// Files are stored on the local filesystem under /uploads for dev.
// For production, swap the storage adapter to S3/R2/etc.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  apiSuccess,
  apiError,
  handleApiError,
} from '@/lib/auth'
import { audit } from '@/lib/audit'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
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
      include: { patient: true, uploadedBy: { select: { name: true } } },
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

    if (!file || !patientId) {
      return apiError('VALIDATION_ERROR', 'File and patientId are required.', 400)
    }
    if (file.size > MAX_FILE_SIZE) {
      return apiError('FILE_TOO_LARGE', 'File exceeds 10MB limit.', 413)
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError('UNSUPPORTED_TYPE', 'File type not allowed.', 415)
    }

    // Tenant check
    const patient = await db.patient.findUnique({ where: { id: patientId } })
    if (!patient || patient.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Patient not found.', 404)
    }

    // Ensure upload dir exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Save file with unique name
    const ext = file.name.split('.').pop() || ''
    const storageKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
    const filePath = path.join(UPLOAD_DIR, storageKey)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const document = await db.document.create({
      data: {
        clinicId: user.clinicId!,
        patientId,
        visitId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storageKey,
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
      newValues: { fileName: file.name, patientId },
    })

    return apiSuccess({ document }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
