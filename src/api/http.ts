// All requests go through the API gateway.
export const API_BASE = 'http://localhost:5051'
const REFRESH_PATH = '/proxy/refresh'

type AuthSessionSnapshot = {
  accessToken: string
  refreshToken: string
  userId: string
  email: string
  role: string
  firstName?: string
  lastName?: string
}

type AuthSessionAccess = {
  getSession: () => AuthSessionSnapshot | null
  setSession: (session: AuthSessionSnapshot | null) => void
}

let authSessionAccess: AuthSessionAccess | null = null
let refreshPromise: Promise<AuthSessionSnapshot | null> | null = null

export function configureAuthSession(access: AuthSessionAccess | null) {
  authSessionAccess = access
}

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  token?: string | null
  refreshToken?: string | null
  headers?: Record<string, string>
  skipAuthRefresh?: boolean
}

type TokenResponse = {
  accessToken: string
  refreshToken?: string
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function getErrorMessage(parsed: unknown, status: number) {
  return typeof parsed === 'string'
    ? parsed
    : (parsed && typeof parsed === 'object' && 'title' in parsed
        ? String((parsed as Record<string, unknown>).title)
        : `Request failed (${status})`)
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4)
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

function isExpiredOrExpiringSoon(token: string) {
  const claims = decodeJwt(token)
  const exp = claims?.exp
  if (typeof exp !== 'number') return false

  const refreshSkewSeconds = 30
  return exp <= Math.floor(Date.now() / 1000) + refreshSkewSeconds
}

function getSessionToken(fallback?: string | null) {
  return authSessionAccess?.getSession()?.accessToken ?? fallback ?? null
}

function buildRequestInit(
  options: RequestOptions,
  token: string | null
): RequestInit {
  const { method = 'GET', body, headers = {} } = options

  const finalHeaders: Record<string, string> = { ...headers }
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json'
  }
  if (token) {
    finalHeaders['Authorization'] = `Bearer ${token}`
  }

  return {
    method,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  }
}

function asTokenResponse(parsed: unknown): TokenResponse | null {
  if (!parsed || typeof parsed !== 'object') return null
  const data = parsed as Record<string, unknown>
  const accessToken = data.accessToken
  const refreshToken = data.refreshToken

  if (typeof accessToken !== 'string' || !accessToken) return null

  return {
    accessToken,
    refreshToken: typeof refreshToken === 'string' && refreshToken ? refreshToken : undefined,
  }
}

async function refreshSession(
  expiredAccessToken: string,
  fallbackRefreshToken?: string | null
) {
  const currentSession = authSessionAccess?.getSession() ?? null
  if (currentSession?.accessToken && currentSession.accessToken !== expiredAccessToken) {
    return currentSession
  }

  if (!currentSession?.userId) return null

  const refreshToken = currentSession.refreshToken || fallbackRefreshToken
  if (!refreshToken) return null

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_BASE}${REFRESH_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken,
          userId: currentSession.userId,
        }),
      })

      const parsed = await parseResponseBody(response)
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          authSessionAccess?.setSession(null)
        }
        return null
      }

      const tokenResponse = asTokenResponse(parsed)
      if (!tokenResponse) return null

      const nextSession: AuthSessionSnapshot = {
        ...currentSession,
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken ?? currentSession.refreshToken,
      }

      authSessionAccess?.setSession(nextSession)
      return nextSession
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const shouldRefresh = !options.skipAuthRefresh
  let token = getSessionToken(options.token)

  if (token && shouldRefresh && isExpiredOrExpiringSoon(token)) {
    const refreshedSession = await refreshSession(token, options.refreshToken)
    token = refreshedSession?.accessToken ?? token
  }

  let response = await fetch(`${API_BASE}${path}`, buildRequestInit(options, token))

  if (response.status === 401 && token && shouldRefresh) {
    const refreshedSession = await refreshSession(token, options.refreshToken)
    if (refreshedSession?.accessToken && refreshedSession.accessToken !== token) {
      response = await fetch(
        `${API_BASE}${path}`,
        buildRequestInit(options, refreshedSession.accessToken)
      )
    }
  }

  const parsed = await parseResponseBody(response)

  if (!response.ok) {
    const message = getErrorMessage(parsed, response.status)
    throw new ApiError(message, response.status, parsed)
  }

  return parsed as T
}
