// All server calls go through our own backend. No API keys exist in the browser.
const BASE = import.meta.env.VITE_API_URL || ''
const TOKEN_KEY = 'neuroplay:token'

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* private mode */ } }

export async function api(path, body, { timeoutMs = 20000, method } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  const token = getToken()
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method: method || (body ? 'POST' : 'GET'), signal: ctrl.signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data.error || `Server error (${res.status})`)
      err.status = res.status
      throw err
    }
    return data
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('The server took too long to respond.')
    if (e instanceof TypeError) throw new Error('Cannot reach the NeuroPlay server. Is it running (npm run dev in /server)?')
    throw e
  } finally { clearTimeout(t) }
}

export const SOCKET_URL = BASE || undefined // same origin in dev (Vite proxy), VITE_API_URL in prod