import { request } from './http'

export type CandidateProfile = {
  userId: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  summary: string
  location: string
}

export type CandidateSkill = {
  id?: string
  candidateId: string
  name: string
  skillLevel: string
  yearsOfExperience: string
}

export type CandidateExperience = {
  id?: string
  candidateId: string
  company: string
  position: string
  description?: string
  startDate?: string
  endDate?: string
}

function normalizeCandidates(
  response:
    | CandidateProfile
    | CandidateProfile[]
    | {
        candidates?: CandidateProfile[]
        results?: CandidateProfile[]
        items?: CandidateProfile[]
      }
    | null
) {
  if (Array.isArray(response)) return response
  if (!response || typeof response !== 'object') return []

  const collections = response as {
    candidates?: CandidateProfile[]
    results?: CandidateProfile[]
    items?: CandidateProfile[]
  }
  if (Array.isArray(collections.candidates)) return collections.candidates
  if (Array.isArray(collections.results)) return collections.results
  if (Array.isArray(collections.items)) return collections.items

  return [response as CandidateProfile]
}

export const candidateApi = {
  getById: (id: string, token: string) =>
    request<CandidateProfile>(`/Candidate/candidate/${id}`, { token }),
  searchByName: async (name: string, token: string) => {
    const params = new URLSearchParams({ name })
    const response = await request<
      | CandidateProfile
      | CandidateProfile[]
      | {
          candidates?: CandidateProfile[]
          results?: CandidateProfile[]
          items?: CandidateProfile[]
        }
    >(`/flow/candidates/search?${params.toString()}`, { token })

    return normalizeCandidates(response)
  },
  searchByDescription: async (description: string, token: string) => {
    const params = new URLSearchParams({ description })
    const response = await request<
      | CandidateProfile
      | CandidateProfile[]
      | {
          candidates?: CandidateProfile[]
          results?: CandidateProfile[]
          items?: CandidateProfile[]
        }
    >(`/flow/candidates/search/description?${params.toString()}`, { token })

    return normalizeCandidates(response)
  },
  getSkills: (candidateId: string, token: string) =>
    request<CandidateSkill[]>(`/Candidate/skills/${candidateId}`, { token }),
  addSkill: (body: CandidateSkill, token: string) =>
    request<null>('/Candidate/skill/add', { method: 'POST', body, token }),
  getExperiences: (candidateId: string, token: string) =>
    request<CandidateExperience[]>(`/Candidate/experiences/${candidateId}`, {
      token,
    }),
  addExperience: (body: CandidateExperience, token: string) =>
    request<null>('/Candidate/experience/add', {
      method: 'POST',
      body,
      token,
    }),
}
