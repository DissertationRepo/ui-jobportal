import { request } from './http'

export type RegisterCandidateRequest = {
  firstName: string
  lastName: string
  email: string
  password: string
  phoneNumber?: string
  summary?: string
  location?: string
}

export type RegisterEmployerRequest = {
  firstName: string
  lastName: string
  password: string
  companyName: string
  companyDescription?: string
  industry?: string
  companySize?: string
  contactEmail: string
}

export type RegisterFlowResponse = {
  userId: string
  role: string
  email: string
  accessToken: string
  refreshToken: string
}

export type SubmitApplicationRequest = {
  candidateId: string
  jobId: string
  coverLetter?: string
  candidateEmail?: string
}

export type UpdateApplicationStatusFlowRequest = {
  applicationId: string
  status: string
  note?: string
  candidateId?: string
  candidateEmail?: string
}

export type CreateJobFlowRequest = {
  jobTitle: string
  jobDescription?: string
  salaryMin: number
  salaryMax: number
  currency?: string
  location?: string
  employmentType?: string
  requiredSkillName?: string
  requiredSkillLevel?: string
  seniorityLevel?: string
  employerId?: string
  employerEmail?: string
}

export const flowApi = {
  registerCandidate: (body: RegisterCandidateRequest) =>
    request<RegisterFlowResponse>('/flow/register/candidate', {
      method: 'POST',
      body,
    }),
  registerEmployer: (body: RegisterEmployerRequest) =>
    request<RegisterFlowResponse>('/flow/register/employer', {
      method: 'POST',
      body,
    }),
  submitApplication: (body: SubmitApplicationRequest, token: string) =>
    request<{ candidateId: string; jobId: string; status: string }>(
      '/flow/applications/submit',
      { method: 'POST', body, token }
    ),
  getCandidateApplications: (candidateId: string, token: string) =>
    request<unknown>(`/flow/applications/candidate/${candidateId}`, {
      token,
    }),
  updateApplicationStatus: (
    body: UpdateApplicationStatusFlowRequest,
    token: string
  ) =>
    request<{ applicationId: string; status: string }>(
      '/flow/applications/status',
      { method: 'PUT', body, token }
    ),
  createJob: (body: CreateJobFlowRequest, token: string) =>
    request<{ status: string; jobTitle: string }>('/flow/jobs/create', {
      method: 'POST',
      body,
      token,
    }),
  matchingJobs: (candidateId: string, token: string) =>
    request<{ candidateId: string; matches: unknown[]; note?: string }>(
      `/flow/matching/jobs/${candidateId}`,
      { token }
    ),
  matchingCandidates: (jobId: string, token: string) =>
    request<{ jobId: string; matches: unknown[]; note?: string }>(
      `/flow/matching/candidates/${jobId}`,
      { token }
    ),
}
