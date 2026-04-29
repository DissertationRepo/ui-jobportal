import { getJson } from './http'

export const CANDIDATE_API_BASE = 'http://localhost:5051'

export type CandidateProfile = {
  userId: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  summary: string
  location: string
}

export const candidateApi = {
  getCandidateById: (id: string, accessToken: string) =>
    getJson<CandidateProfile>(
      CANDIDATE_API_BASE,
      `/Candidate/${id}`,
      {
        Authorization: `Bearer ${accessToken}`,
      }
    ),
}
