// =====================================================================
// Thin fetch wrapper for the SPA. All routes are relative per gateway
// rules. Throws on non-OK with the structured error from the API.
// =====================================================================

import { useApp } from './app-store'

export type ApiError = {
  success: false
  error: { code: string; message: string }
}

// Tracks whether we've already handled a 401 in the current "session"
// to avoid spamming logout() across multiple concurrent failed calls.
let handlingAuthFailure = false

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
    const status = res.status

    // Global 401 handler: session expired or cookie not sent.
    // Reset the user state so the LoginView renders. This runs once
    // per failure wave (the flag resets when login succeeds again).
    if (status === 401 && !handlingAuthFailure) {
      handlingAuthFailure = true
      // Defer to avoid calling setState during render of the caller
      queueMicrotask(() => {
        useApp.getState().logout()
        handlingAuthFailure = false
      })
    }

    throw new ApiErrorImpl(err.code, err.message, status)
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
