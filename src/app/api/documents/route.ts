// Documents API — list / upload (spec #33)
// Works on both local dev (filesystem) and Vercel (database storage).

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
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB (reduced for DB storage compatibility)
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

// On Vercel, the filesystem is read-only, so we store files in the database.
const IS_VERCEL = !!process.env.VERCEL

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

    if (!file || !patientId) {
      return apiError('VALIDATION_ERROR', 'File and patientId are required.', 400)
    }
    if (file.size > MAX_FILE_SIZE) {
      return apiError('FILE_TOO_LARGE', 'File exceeds 5MB limit.', 413)
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError('UNSUPPORTED_TYPE', 'File type not allowed.', 415)
    }

    // Tenant check
    const patient = await db.patient.findUnique({ where: { id: patientId } })
    if (!patient || patient.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Patient not found.', 404)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() || ''
    const storageKey = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`

    let fileData: string | null = null

    if (IS_VERCEL) {
      // On Vercel: store as base64 in database (serverless-friendly)
      fileData = buffer.toString('base64')
    } else {
      // Local dev: store on filesystem
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true })
      }
      await writeFile(path.join(UPLOAD_DIR, storageKey), buffer)
    }

    const document = await db.document.create({
      data: {
        clinicId: user.clinicId!,
        patientId,
        visitId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storageKey,
        fileData,
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
