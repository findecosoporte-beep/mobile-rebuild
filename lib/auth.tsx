import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  api,
  apiErrorMessage,
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
} from '@/lib/api'
import type { MeProfile } from '@/lib/types'

interface AuthContextValue {
  profile: MeProfile | null
  loading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    const { data } = await api.get<MeProfile>('/me/')
    setProfile(data)
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { access } = await getStoredTokens()
        if (access) await refreshProfile()
      } catch {
        await clearStoredTokens()
        if (active) setProfile(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [refreshProfile])

  const login = useCallback(
    async (username: string, password: string) => {
      await clearStoredTokens()
      const { data } = await api.post<{ access: string; refresh: string }>('/token/', {
        username: username.trim(),
        password,
      })
      await setStoredTokens(data.access, data.refresh)
      await refreshProfile()
    },
    [refreshProfile],
  )

  const logout = useCallback(async () => {
    await clearStoredTokens()
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      profile,
      loading,
      isAuthenticated: !!profile,
      login,
      logout,
      refreshProfile,
    }),
    [profile, loading, login, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

export { apiErrorMessage }
