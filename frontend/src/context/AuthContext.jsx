import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const TOKEN_KEY = 'learndifferent.auth.token'

async function api(path, options = {}, token) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'Request failed')
  return data
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [error, setError] = useState('')

  const persistSession = useCallback((nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem(TOKEN_KEY, nextToken)
  }, [])

  const clearSession = useCallback(() => {
    setToken('')
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function restore() {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const data = await api('/api/auth/me', {}, token)
        if (!cancelled) setUser(data.user)
      } catch {
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [token, clearSession])

  const login = useCallback(
    async (email, password) => {
      setError('')
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      persistSession(data.token, data.user)
      return data.user
    },
    [persistSession],
  )

  const register = useCallback(
    async (email, password, displayName) => {
      setError('')
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, display_name: displayName }),
      })
      persistSession(data.token, data.user)
      return data.user
    },
    [persistSession],
  )

  const saveRemote = useCallback(
    async (key, value) => {
      if (!token) return null
      return api(
        '/api/local/save',
        {
          method: 'POST',
          body: JSON.stringify({ key, value }),
        },
        token,
      )
    },
    [token],
  )

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      error,
      setError,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout: clearSession,
      saveRemote,
    }),
    [token, user, loading, error, login, register, clearSession, saveRemote],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
