// =====================================================================
// Thin fetch wrapper for the SPA. All routes are relative per gateway
// rules. Throws on non-OK with the structured error from the API.
// =====================================================================

export type ApiError = {
  success: false
  error: { code: string; message: string }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'same-origin',
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : {}
  if (!res.ok || json.success === false) {
    const err = json.error || { code: 'ERROR', message: 'Request failed.' }
    throw new ApiErrorImpl(err.code, err.message, res.status)
  }
  return json.data as T
}

class ApiErrorImpl extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export { ApiErrorImpl as ApiError }
