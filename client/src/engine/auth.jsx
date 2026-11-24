// Account state: JWT auth against our backend, with progress sync.
// Guest play works fully offline; signing in makes the account the source of truth.
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, getToken, setToken } from '../api'
import { exportProgress, replaceProgress } from './progress'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))

  const syncFromServer = useCallback(async () => {
    const { progress } = await api('/progress')
    replaceProgress(progress)
  }, [])

  // Restore session on load.
  useEffect(() => {
    if (!getToken()) return
    let alive = true
    ;(async () => {
      try {
        const { user: u } = await api('/auth/me')
        if (!alive) return
        setUser(u)
        await syncFromServer()
      } catch {
        setToken(null) // expired/invalid token
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [syncFromServer])

  const adoptAccount = useCallback(async (data) => {
    setToken(data.token)
    setUser(data.user)
    // First sign-in with an empty account: import guest progress once.
    try {
      const local = exportProgress()
      if (data.user.xp === 0 && data.user.history.length === 0 && (local.xp > 0 || local.history.length > 0)) {
        const { progress } = await api('/progress/import', local)
        replaceProgress(progress)
      } else {
        await syncFromServer()
      }
    } catch { await syncFromServer().catch(() => {}) }
  }, [syncFromServer])

  const signup = useCallback(async (name, email, password) => {
    const data = await api('/auth/signup', { name, email, password })
    await adoptAccount(data)
    return data.user
  }, [adoptAccount])

  const login = useCallback(async (email, password) => {
    const data = await api('/auth/login', { email, password })
    await adoptAccount(data)
    return data.user
  }, [adoptAccount])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const updateMe = useCallback(async (patch) => {
    const { user: u } = await api('/auth/me', patch, { method: 'PATCH' })
    setUser(u)
    replaceProgress({ name: u.name })
    return u
  }, [])

  return (
    <AuthCtx.Provider value={{ user, loading, signup, login, logout, updateMe, syncFromServer }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)