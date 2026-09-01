// Document download — serves the file with tenant check (spec #33)
// Never exposes public URLs for sensitive documents.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, apiError, handleApiError } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('patients.view')
    const { id } = await params

    const document = await db.document.findUnique({ where: { id } })
    if (!document || document.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Document not found.', 404)
    }

    const filePath = path.join(UPLOAD_DIR, document.storageKey)
    const buffer = await readFile(filePath)
    return new Response(buffer, {
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `inline; filename="${document.fileName}"`,
        'Content-Length': String(document.fileSize),
      },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
