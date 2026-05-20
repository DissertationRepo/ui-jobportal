import { request } from './http'

export type LoginRequest = { email: string; password: string }
export type LoginResponse = {
  accessToken: string
  refreshToken: string
  userId?: string
  role?: string
}

export type RegisterRequest = {
  firstName: string
  lastName: string
  email: string
  password: string
  role: string
}

export type RegisterResponse = {
  userId: string
  role: string
  email: string
}

export const authApi = {
  login: (body: LoginRequest) =>
    request<LoginResponse>('/Auth/login', { method: 'POST', body }),
  register: (body: RegisterRequest) =>
    request<RegisterResponse>('/Auth/register', { method: 'POST', body }),
  logout: (refreshToken: string) =>
    request<null>('/Auth/logout', { method: 'POST', body: { refreshToken } }),
}
