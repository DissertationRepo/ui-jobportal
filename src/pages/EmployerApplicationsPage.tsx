import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { applicationApi } from '../api/applicationApi'
import type { ApplicationResponse } from '../api/applicationApi'
import { flowApi } from '../api/flowApi'
import { jobApi } from '../api/jobApi'
import type { JobResponse } from '../api/jobApi'
import { candidateApi } from '../api/candidateApi'
import type { CandidateProfile } from '../api/candidateApi'
import { ApiError } from '../api/http'

const STATUSES = ['Submitted', 'UnderReview', 'Interview', 'Offer', 'Accepted', 'Rejected', 'Withdrawn']

type JobApplicationsGroup = {
  job: JobResponse
  jobId: string
  applications: ApplicationResponse[]
  error?: string
}

function getJobId(job: JobResponse) {
  return job.id?.trim() ?? ''
}

function getCandidateName(candidate?: CandidateProfile | null) {
  if (!candidate) return 'Candidate'
  const fullName = [candidate.firstName, candidate.lastName].filter(Boolean).join(' ').trim()
  return fullName || candidate.email || 'Candidate'
}

function toRequestStatus(status: string) {
  const normalized = status.replace(/\s+/g, '').toLowerCase()
  const statusMap: Record<string, string> = {
    submitted: 'Submitted',
    reviewed: 'UnderReview',
    underreview: 'UnderReview',
    pending: 'UnderReview',
    interviewing: 'Interview',
    interview: 'Interview',
    offered: 'Offer',
    offer: 'Offer',
    accepted: 'Accepted',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  }

  return statusMap[normalized] ?? status
}

export function EmployerApplicationsPage() {
  const { session } = useAuth()
  const token = session?.accessToken ?? ''

  const [groups, setGroups] = useState<JobApplicationsGroup[]>([])
  const [loadedJobsCount, setLoadedJobsCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [candidateNames, setCandidateNames] = useState<Record<string, string>>({})

  const [updating, setUpdating] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ status: string; note: string; candidateEmail: string }>({ status: '', note: '', candidateEmail: '' })
  const [updateMsg, setUpdateMsg] = useState('')

  const load = useCallback(async () => {
    if (!token) return

    setBusy(true)
    setError('')
    try {
      const jobs = await jobApi.getMine(token)
      const jobsWithIds = jobs.filter((job) => getJobId(job))
      setLoadedJobsCount(jobsWithIds.length)

      const nextGroups = await Promise.all(
        jobsWithIds.map(async (job) => {
          const resolvedJobId = getJobId(job)

          try {
            const applications = await applicationApi.getByJob(resolvedJobId, token)
            return {
              job,
              jobId: resolvedJobId,
              applications: Array.isArray(applications) ? applications : [],
            }
          } catch (err) {
            return {
              job,
              jobId: resolvedJobId,
              applications: [],
              error: err instanceof ApiError ? err.message : 'Failed to load applications.',
            }
          }
        })
      )

      setGroups(nextGroups)

      const candidateIds = Array.from(
        new Set(
          nextGroups.flatMap((group) =>
            group.applications
              .map((application) => application.candidateId)
              .filter(Boolean)
          )
        )
      )
      const candidateNameEntries = await Promise.all(
        candidateIds.map(async (candidateId) => {
          try {
            const candidate = await candidateApi.getById(candidateId, token)
            return [candidateId, getCandidateName(candidate)] as const
          } catch {
            return [candidateId, 'Candidate'] as const
          }
        })
      )
      setCandidateNames(Object.fromEntries(candidateNameEntries))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load applications.')
      setGroups([])
      setLoadedJobsCount(0)
      setCandidateNames({})
    } finally {
      setBusy(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const submitUpdate = async (id: string, candidateId: string) => {
    setUpdateMsg('')
    const status = toRequestStatus(draft.status)
    try {
      await flowApi.updateApplicationStatus({
        applicationId: id,
        status,
        note: draft.note || undefined,
        candidateId,
        candidateEmail: draft.candidateEmail || undefined,
      }, token)
      setUpdateMsg(`Status set to "${status}". Candidate has been notified.`)
      setUpdating(null)
      await load()
    } catch (err) {
      setUpdateMsg(err instanceof ApiError ? err.message : 'Failed to update.')
    }
  }

  const totalApplications = groups.reduce(
    (count, group) => count + group.applications.length,
    0
  )

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Applications</h1>
          <p className="subtitle">Review applicants for your posted jobs and update their status.</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={busy || !token} type="button">
          {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="card">
        <div className="card-title">My job applications</div>
        <p className="card-sub">Applications are loaded from each job owned by your employer account.</p>
        <div className="row" style={{ marginTop: 12 }}>
          <span className="badge">{loadedJobsCount} jobs</span>
          <span className="badge muted">{totalApplications} applications</span>
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {updateMsg ? <div className="alert info">{updateMsg}</div> : null}

      {busy && groups.length === 0 ? (
        <div className="empty">Loading applications for your jobs…</div>
      ) : null}

      {!busy && groups.length === 0 && !error ? (
        <div className="empty">No posted jobs were returned for your account.</div>
      ) : null}

      {!busy && groups.length > 0 && totalApplications === 0 ? (
        <div className="empty">No applications were returned for your posted jobs.</div>
      ) : null}

      {groups.length > 0 ? (
        <div className="list">
          {groups.map((group) => (
            <div key={group.jobId} className="card" style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{group.job.jobTitle ?? 'Untitled job'}</div>
                  {group.job.location ? <div className="meta">{group.job.location}</div> : null}
                </div>
                <span className="badge muted">{group.applications.length} applicants</span>
              </div>

              {group.error ? <div className="alert error" style={{ marginTop: 12 }}>{group.error}</div> : null}

              {group.applications.length > 0 ? (
                <div className="list" style={{ marginTop: 12 }}>
                  {group.applications.map((a) => {
                    const candidateName = candidateNames[a.candidateId] ?? 'Candidate'

                    return (
                      <div key={a.id} className="list-item">
                        <div style={{ flex: 1 }}>
                          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{candidateName}</div>
                              {a.appliedAt ? <div className="meta">Applied: {new Date(a.appliedAt).toLocaleString()}</div> : null}
                              {a.coverLetter ? <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>{a.coverLetter}</p> : null}
                            </div>
                            <div className="row" style={{ alignItems: 'center' }}>
                              <span className="badge">{a.status}</span>
                              <button className="btn btn-soft btn-sm" onClick={() => {
                                setUpdating(updating === a.id ? null : a.id)
                                setDraft({ status: toRequestStatus(a.status), note: '', candidateEmail: '' })
                                setUpdateMsg('')
                              }}>
                                {updating === a.id ? 'Cancel' : 'Update status'}
                              </button>
                            </div>
                          </div>

                          {updating === a.id ? (
                            <div className="card" style={{ marginTop: 12, background: 'var(--surface-muted)' }}>
                              <div className="grid-3">
                                <div className="field">
                                  <label>Status</label>
                                  <select className="select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                                  </select>
                                </div>
                                <div className="field">
                                  <label>Candidate email (for notification)</label>
                                  <input className="input" value={draft.candidateEmail} onChange={(e) => setDraft({ ...draft, candidateEmail: e.target.value })} placeholder="optional" />
                                </div>
                                <div className="field">
                                  <label>&nbsp;</label>
                                  <button className="btn btn-primary" onClick={() => submitUpdate(a.id, a.candidateId)} type="button">
                                    Save &amp; notify
                                  </button>
                                </div>
                              </div>
                              <div className="field" style={{ marginTop: 8 }}>
                                <label>Note</label>
                                <textarea className="textarea" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Message to include in the notification" />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        null
      )}
    </>
  )
}
