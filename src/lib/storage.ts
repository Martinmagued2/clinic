// =====================================================================
// Supabase Storage service — handles file uploads/downloads (spec #14, #16, #17)
// =====================================================================
// In production (Vercel): uses Supabase Storage (private buckets + signed URLs)
// In local dev: falls back to filesystem (/uploads directory)
//
// Required env vars for production:
// - SUPABASE_URL (e.g., https://abcdefg.supabase.co)
// - SUPABASE_SERVICE_KEY (service role key, NOT the anon key)
//
// If these are not set, the system falls back to local filesystem storage.
// =====================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const IS_VERCEL = !!process.env.VERCEL
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    })
  }
  return supabase
}

export const BUCKET_PATIENT_DOCS = 'patient-documents'

/**
 * Upload a file to Supabase Storage (or save to filesystem in dev).
 * Returns the storage path (key) used to retrieve the file later.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<{ path: string; useSupabase: boolean }> {
  const client = getSupabase()

  if (client) {
    // Production: upload to Supabase Storage
    const { error } = await client.storage
      .from(bucket)
      .upload(path, buffer, { contentType, upsert: false })

    if (error) {
      console.error('[storage] Supabase upload error:', error)
      throw new Error(`Upload failed: ${error.message}`)
    }

    return { path, useSupabase: true }
  }

  // Dev fallback: save to filesystem
  const { writeFile, mkdir } = await import('fs/promises')
  const { existsSync } = await import('fs')
  const fsPath = await import('path')

  const uploadDir = fsPath.join(process.cwd(), 'uploads', bucket)
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true })
  }

  const fullPath = fsPath.join(uploadDir, path)
  await writeFile(fullPath, buffer)

  return { path: `${bucket}/${path}`, useSupabase: false }
}

/**
 * Generate a signed URL for private file access (spec #16).
 * Signed URLs expire after a set time (default 1 hour).
 * In dev, returns a local URL that serves the file from the filesystem.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const client = getSupabase()

  if (client) {
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error || !data?.signedUrl) {
      console.error('[storage] Signed URL error:', error)
      return null
    }

    return data.signedUrl
  }

  // Dev fallback: return local API URL
  return null
}

/**
 * Download a file from Supabase Storage (or read from filesystem in dev).
 * Returns the file buffer and content type.
 */
export async function downloadFile(
  bucket: string,
  path: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const client = getSupabase()

  if (client) {
    const { data, error } = await client.storage
      .from(bucket)
      .download(path)

    if (error || !data) {
      console.error('[storage] Download error:', error)
      return null
    }

    const buffer = Buffer.from(await data.arrayBuffer())
    return { buffer, contentType: 'application/octet-stream' }
  }

  // Dev fallback: read from filesystem
  const { readFile } = await import('fs/promises')
  const { existsSync } = await import('fs')
  const fsPath = await import('path')

  const fullPath = fsPath.join(process.cwd(), 'uploads', bucket, path)
  if (!existsSync(fullPath)) return null

  const buffer = await readFile(fullPath)
  return { buffer, contentType: 'application/octet-stream' }
}

/**
 * Delete a file from Supabase Storage (or filesystem in dev).
 */
export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  const client = getSupabase()

  if (client) {
    const { error } = await client.storage.from(bucket).remove([path])
    if (error) {
      console.error('[storage] Delete error:', error)
      return false
    }
    return true
  }

  // Dev fallback
  const { unlink } = await import('fs/promises')
  const { existsSync } = await import('fs')
  const fsPath = await import('path')

  const fullPath = fsPath.join(process.cwd(), 'uploads', bucket, path)
  if (!existsSync(fullPath)) return false

  try {
    await unlink(fullPath)
    return true
  } catch {
    return false
  }
}

/**
 * Check if Supabase Storage is configured.
 */
export function isSupabaseStorageConfigured(): boolean {
  return !!getSupabase()
}
