import { postJson } from './http'

export const AUTH_API_BASE = 'http://localhost:5287'

export type LoginRequest = {
  email: string
  password: string
  refreshToken?: string
}

export type LoginResponse = {
  accessToken: string
  refreshToken: string
}

export type RegisterRequest = {
  firstName: string
  lastName: string
  email: string
  password: string
  role: string
}

export type RefreshRequest = {
  refreshToken: string
  userId: string
}

export type RefreshResponse = {
  accessToken: string
}

export const authApi = {
  login: (body: LoginRequest) =>
    postJson<LoginResponse, LoginRequest>(AUTH_API_BASE, '/Auth/login', body),
  register: (body: RegisterRequest) =>
    postJson<null, RegisterRequest>(AUTH_API_BASE, '/Auth/Register', body),
  logout: (refreshToken: string) =>
    postJson<null, { refreshToken: string }>(AUTH_API_BASE, '/Auth/Logout', {
      refreshToken,
    }),
  refresh: (body: RefreshRequest) =>
    postJson<RefreshResponse, RefreshRequest>(AUTH_API_BASE, '/Auth/Refresh', body),
}
