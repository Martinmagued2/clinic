// =====================================================================
// Tiny API helper: turns a handler that may throw into a JSON response.
// Saves ~5 lines per route file.
// =====================================================================

import { handleApiError, apiSuccess, apiError, type CurrentUser } from './auth'
import { z, type ZodSchema } from 'zod'

export type Ctx<T = unknown> = {
  user: CurrentUser
  body: T
}

export function withBody<T extends ZodSchema>(
  schema: T,
  handler: (ctx: Ctx<z.infer<T>>) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      const json = await req.json().catch(() => ({}))
      const parsed = schema.safeParse(json)
      if (!parsed.success) {
        return apiError(
          'VALIDATION_ERROR',
          parsed.error.issues.map((i) => i.message).join('; '),
          400,
        )
      }
      return await handler({ body: parsed.data, user: {} as CurrentUser })
    } catch (err) {
      return handleApiError(err)
    }
  }
}

export { handleApiError, apiSuccess, apiError }
