import { request } from './http'

export type EmployerProfile = {
  id: string
  userId: string
  companyName: string
  companyDescription?: string
  industry?: string
  companySize?: string
  contactEmail?: string
}

export const employerApi = {
  getByUserId: (userId: string, token: string) =>
    request<EmployerProfile>(`/Employer/by-user/${userId}`, { token }),
  getById: (id: string, token: string) =>
    request<EmployerProfile>(`/Employer/employer/${id}`, { token }),
  searchByCompanyName: async (companyName: string, token: string) => {
    const params = new URLSearchParams({ companyName })
    const response = await request<
      | EmployerProfile
      | EmployerProfile[]
      | {
          employers?: EmployerProfile[]
          results?: EmployerProfile[]
          items?: EmployerProfile[]
        }
    >(`/flow/employers/search?${params.toString()}`, { token })

    if (Array.isArray(response)) return response
    if (!response || typeof response !== 'object') return []

    const collections = response as {
      employers?: EmployerProfile[]
      results?: EmployerProfile[]
      items?: EmployerProfile[]
    }
    if (Array.isArray(collections.employers)) return collections.employers
    if (Array.isArray(collections.results)) return collections.results
    if (Array.isArray(collections.items)) return collections.items

    return [response as EmployerProfile]
  },
}
