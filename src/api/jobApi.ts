import { request } from './http'

export type JobResponse = {
  id?: string | null
  jobTitle?: string | null
  jobDescription?: string | null
  salaryMin?: number
  salaryMax?: number
  currency?: string | null
  location?: string | null
  employmentType?: string | null
  requiredSkillName?: string | null
  requiredSkillLevel?: string | null
  seniorityLevel?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

function normalizeJobs(
  response:
    | JobResponse
    | JobResponse[]
    | {
        jobs?: JobResponse[]
        results?: JobResponse[]
        items?: JobResponse[]
      }
    | null
) {
  if (Array.isArray(response)) return response
  if (!response || typeof response !== 'object') return []

  const collections = response as {
    jobs?: JobResponse[]
    results?: JobResponse[]
    items?: JobResponse[]
  }
  if (Array.isArray(collections.jobs)) return collections.jobs
  if (Array.isArray(collections.results)) return collections.results
  if (Array.isArray(collections.items)) return collections.items

  return [response as JobResponse]
}

export const jobApi = {
  getById: (id: string, token: string) =>
    request<JobResponse>(`/Job/job/${id}`, { token }),
  search: async (query: string, token: string) => {
    const params = new URLSearchParams({ q: query })
    const response = await request<
      | JobResponse
      | JobResponse[]
      | {
          jobs?: JobResponse[]
          results?: JobResponse[]
          items?: JobResponse[]
        }
    >(`/Job/search?${params.toString()}`, { token })

    return normalizeJobs(response)
  },
  getMine: async (token: string) => {
    const response = await request<JobResponse | JobResponse[]>('/flow/jobs/me', { token })
    return Array.isArray(response) ? response : response ? [response] : []
  },
  deleteById: (jobId: string, token: string) =>
    request<null>(`/flow/jobs/${jobId}`, { method: 'DELETE', token }),
}
