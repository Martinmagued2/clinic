// Document download — serves the file with tenant check (spec #33)
// Works on both local dev (filesystem) and Vercel (database storage).

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, apiError, handleApiError } from '@/lib/auth'
import { readFile } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
const IS_VERCEL = !!process.env.VERCEL

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('patients.view')
    const { id } = await params

    const document = await db.document.findUnique({ where: { id } })
    if (!document || document.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Document not found.', 404)
    }

    let buffer: Buffer

    if (IS_VERCEL || document.fileData) {
      // On Vercel or if fileData exists: decode from database
      if (!document.fileData) {
        return apiError('NOT_FOUND', 'File data not available.', 404)
      }
      buffer = Buffer.from(document.fileData, 'base64')
    } else {
      // Local dev: read from filesystem
      try {
        buffer = await readFile(path.join(UPLOAD_DIR, document.storageKey))
      } catch {
        return apiError('NOT_FOUND', 'File not found on disk.', 404)
      }
    }

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
