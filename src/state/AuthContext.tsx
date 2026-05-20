import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../api/authApi'
import { configureAuthSession } from '../api/http'

export type Role = 'Candidate' | 'Employer'

export type AuthSession = {
  accessToken: string
  refreshToken: string
  userId: string
  email: string
  role: Role
  firstName?: string
  lastName?: string
}

type AuthContextValue = {
  session: AuthSession | null
  isAuthenticated: boolean
  setSession: (session: AuthSession | null) => void
  login: (email: string, password: string) => Promise<AuthSession>
  logout: () => Promise<void>
}

const STORAGE_KEY = 'jobportal.session'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function loadStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    const json = atob(padded)
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return null
  }
}

function readClaim(claims: Record<string, unknown> | null, ...keys: string[]): string | undefined {
  if (!claims) return undefined
  for (const key of keys) {
    const v = claims[key]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return undefined
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(() =>
    loadStoredSession()
  )
  const sessionRef = useRef<AuthSession | null>(session)

  useEffect(() => {
    sessionRef.current = session
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [session])

  const setSession = useCallback((next: AuthSession | null) => {
    sessionRef.current = next
    setSessionState(next)
  }, [])

  useEffect(() => {
    configureAuthSession({
      getSession: () => sessionRef.current,
      setSession: (next) => {
        const authSession = next as AuthSession | null
        sessionRef.current = authSession
        setSessionState(authSession)
      },
    })

    return () => configureAuthSession(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password })
    const claims = decodeJwt(data.accessToken)
    const userId =
      data.userId ||
      readClaim(
        claims,
        'sub',
        'nameid',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
        'userId'
      ) ||
      ''
    const roleRaw =
      data.role ||
      readClaim(
        claims,
        'role',
        'roles',
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
      ) ||
      'Candidate'
    const role: Role = roleRaw === 'Employer' ? 'Employer' : 'Candidate'
    const next: AuthSession = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      userId,
      email,
      role,
    }
    setSession(next)
    return next
  }, [setSession])

  const logout = useCallback(async () => {
    const refresh = session?.refreshToken
    setSession(null)
    if (refresh) {
      try {
        await authApi.logout(refresh)
      } catch {
        // ignore
      }
    }
  }, [session, setSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: !!session?.accessToken,
      setSession,
      login,
      logout,
    }),
    [session, setSession, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
