import { request } from './http'

export type ApplicationResponse = {
  id: string
  candidateId: string
  jobId: string
  status: string
  coverLetter?: string
  appliedAt?: string
}

export type StatusHistoryResponse = {
  id: string
  applicationId: string
  status: string
  note?: string
  changedAt?: string
}

export const applicationApi = {
  getByCandidate: (candidateId: string, token: string) =>
    request<ApplicationResponse[]>(`/Application/candidate/${candidateId}`, {
      token,
    }),
  getByJob: (jobId: string, token: string) =>
    request<ApplicationResponse[]>(`/flow/applications/job/${jobId}`, { token }),
  getById: (id: string, token: string) =>
    request<ApplicationResponse>(`/Application/application/${id}`, { token }),
  getHistory: (applicationId: string, token: string) =>
    request<StatusHistoryResponse[]>(`/Application/history/${applicationId}`, {
      token,
    }),
}
