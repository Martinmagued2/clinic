// Document download — uses Supabase Storage signed URLs in production (spec #16)
// Never exposes public URLs for sensitive documents.

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePermission, apiError, handleApiError } from '@/lib/auth'
import { downloadFile, getSignedUrl, BUCKET_PATIENT_DOCS } from '@/lib/storage'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requirePermission('patients.view')
    const { id } = await params

    // Tenant check — verify the user has access to this patient's documents
    const document = await db.document.findUnique({ where: { id } })
    if (!document || document.clinicId !== user.clinicId) {
      return apiError('NOT_FOUND', 'Document not found.', 404)
    }

    // Try Supabase Storage first
    if (process.env.SUPABASE_URL) {
      // Generate a temporary signed URL (spec #16)
      const signedUrl = await getSignedUrl(BUCKET_PATIENT_DOCS, document.storageKey, 300) // 5 min
      if (signedUrl) {
        // Redirect to the signed URL — the file is served directly from Supabase
        return Response.redirect(signedUrl, 302)
      }
    }

    // Fallback: read from filesystem (local dev) or database (legacy)
    const result = await downloadFile(BUCKET_PATIENT_DOCS, document.storageKey)
    if (!result) {
      // Try legacy fileData (base64 in database)
      if (document.fileData) {
        const buffer = Buffer.from(document.fileData, 'base64')
        return new Response(buffer, {
          headers: {
            'Content-Type': document.fileType,
            'Content-Disposition': `inline; filename="${document.fileName}"`,
            'Content-Length': String(document.fileSize),
          },
        })
      }
      return apiError('NOT_FOUND', 'File not found.', 404)
    }

    return new Response(result.buffer, {
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
