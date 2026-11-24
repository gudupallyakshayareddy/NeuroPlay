// Thin Gemini client. The API key only ever lives here, on the server.
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export const geminiEnabled = () => Boolean(process.env.GEMINI_API_KEY)

/**
 * Calls Gemini and returns text. Throws on timeout, quota errors, or bad responses
 * so callers can use fallback content.
 */
export async function callGemini({ system, prompt, json = false, timeoutMs = 12000, temperature = 0.8 }) {
  if (!geminiEnabled()) throw new Error('GEMINI_API_KEY not set')
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        ...(system && { systemInstruction: { parts: [{ text: system }] } }),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature, ...(json && { responseMimeType: 'application/json' }) },
      }),
    })
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`) // 429 = quota
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('')
    if (!text) throw new Error('Empty Gemini response')
    return text
  } finally {
    clearTimeout(timer)
  }
}

/** Gemini sometimes wraps JSON in ```fences```; strip them before parsing. */
export function parseJson(text) {
  return JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim())
}
