// AI medical documentation assistant (spec #78)
// Takes free-text notes from the doctor and structures them into
// chief complaint, symptoms, examination, assessment, diagnosis, treatment plan.
// Uses the z-ai-web-dev-sdk LLM.

import { NextRequest } from 'next/server'
import { requirePermission, apiSuccess, apiError, handleApiError } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  rawNotes: z.string().min(10),
  patientContext: z.object({
    age: z.number().nullable().optional(),
    gender: z.string().nullable().optional(),
    chiefComplaint: z.string().nullable().optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission('medical_records.create')
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('VALIDATION_ERROR', 'Invalid input.', 400)

    const { rawNotes, patientContext } = parsed.data

    // Build the AI prompt
    const systemPrompt = `You are a medical documentation assistant. Your job is to structure a doctor's free-text notes into the standard SOAP format. Return ONLY valid JSON with these exact keys:
- chiefComplaint: string (the main reason for the visit)
- symptoms: string (patient-reported symptoms)
- examination: string (physical examination findings)
- assessment: string (clinical assessment)
- diagnosis: string (working diagnosis)
- treatmentPlan: string (treatment recommendations)

If a section is not mentioned in the notes, use an empty string. Be concise and medical in tone. Do NOT add any information that wasn't in the original notes.`

    const userPrompt = `Patient context: ${patientContext?.age ? `Age: ${patientContext.age}` : 'Age unknown'}, ${patientContext?.gender || 'Gender unknown'}.
${patientContext?.chiefComplaint ? `Chief complaint: ${patientContext.chiefComplaint}` : ''}

Doctor's raw notes:
"""
${rawNotes}
"""

Please structure these notes into SOAP format as JSON.`

    try {
      // Dynamically import the SDK
      const { ZAI } = await import('z-ai-web-dev-sdk')
      const zai = await ZAI.create()

      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
      })

      const content = completion.choices[0]?.message?.content || '{}'

      // Try to parse the JSON from the response
      let structured
      try {
        // Extract JSON from the response (it might be wrapped in ```json blocks)
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        structured = JSON.parse(jsonMatch ? jsonMatch[0] : content)
      } catch {
        structured = {
          chiefComplaint: '',
          symptoms: '',
          examination: '',
          assessment: '',
          diagnosis: content.slice(0, 200),
          treatmentPlan: '',
        }
      }

      return apiSuccess({ structured, raw: content })
    } catch (aiErr) {
      console.error('AI SDK error:', aiErr)
      // Fallback: return a simple structure based on the raw notes
      return apiSuccess({
        structured: {
          chiefComplaint: rawNotes.slice(0, 100),
          symptoms: '',
          examination: '',
          assessment: '',
          diagnosis: '',
          treatmentPlan: '',
        },
        raw: 'AI service unavailable — please fill in manually.',
        fallback: true,
      })
    }
  } catch (err) { return handleApiError(err) }
}
