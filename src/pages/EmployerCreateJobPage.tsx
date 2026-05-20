import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../state/AuthContext'
import { flowApi } from '../api/flowApi'
import { jobApi } from '../api/jobApi'
import type { JobResponse } from '../api/jobApi'
import { ApiError } from '../api/http'

function formatSalary(job: JobResponse) {
  const hasMin = typeof job.salaryMin === 'number'
  const hasMax = typeof job.salaryMax === 'number'
  if (!hasMin && !hasMax) return 'Salary not set'

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)
  const range =
    hasMin && hasMax
      ? `${formatNumber(job.salaryMin ?? 0)}-${formatNumber(job.salaryMax ?? 0)}`
      : hasMin
        ? `From ${formatNumber(job.salaryMin ?? 0)}`
        : `Up to ${formatNumber(job.salaryMax ?? 0)}`

  return `${range} ${job.currency ?? ''}`.trim()
}

function formatDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function EmployerCreateJobPage() {
  const { session } = useAuth()
  const token = session?.accessToken ?? ''

  const [form, setForm] = useState({
    jobTitle: '',
    jobDescription: '',
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    location: '',
    employmentType: 'Full-time',
    requiredSkillName: '',
    requiredSkillLevel: '',
    seniorityLevel: '',
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const [myJobs, setMyJobs] = useState<JobResponse[]>([])
  const [myJobsBusy, setMyJobsBusy] = useState(false)
  const [myJobsErr, setMyJobsErr] = useState('')
  const [myJobsMsg, setMyJobsMsg] = useState('')
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null)

  const loadMyJobs = useCallback(async () => {
    if (!token) {
      setMyJobs([])
      return
    }

    setMyJobsBusy(true)
    setMyJobsErr('')
    setMyJobsMsg('')
    try {
      const jobs = await jobApi.getMine(token)
      setMyJobs(jobs)
    } catch (err) {
      setMyJobsErr(err instanceof ApiError ? err.message : 'Failed to load your jobs.')
    } finally {
      setMyJobsBusy(false)
    }
  }, [token])

  useEffect(() => {
    void loadMyJobs()
  }, [loadMyJobs])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setError(''); setMsg('')
    try {
      await flowApi.createJob(
        {
          jobTitle: form.jobTitle,
          jobDescription: form.jobDescription || undefined,
          salaryMin: Number(form.salaryMin) || 0,
          salaryMax: Number(form.salaryMax) || 0,
          currency: form.currency || undefined,
          location: form.location || undefined,
          employmentType: form.employmentType || undefined,
          requiredSkillName: form.requiredSkillName || undefined,
          requiredSkillLevel: form.requiredSkillLevel || undefined,
          seniorityLevel: form.seniorityLevel || undefined,
          employerId: session?.userId,
          employerEmail: session?.email,
        },
        token
      )
      setMsg(`Job "${form.jobTitle}" published. A confirmation notification was sent.`)
      await loadMyJobs()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create job.')
    } finally { setBusy(false) }
  }

  const deleteJob = async (jobToDelete: JobResponse) => {
    const jobId = jobToDelete.id?.trim()
    if (!jobId) {
      setMyJobsErr('This job cannot be deleted because the job record is incomplete.')
      return
    }

    const title = jobToDelete.jobTitle ?? 'this job'
    if (!window.confirm(`Delete "${title}"?`)) return

    setDeleteBusyId(jobId)
    setMyJobsErr('')
    setMyJobsMsg('')
    try {
      await jobApi.deleteById(jobId, token)
      setMyJobs((jobs) => jobs.filter((item) => item.id !== jobId))
      setMyJobsMsg(`"${title}" deleted.`)
    } catch (err) {
      setMyJobsErr(err instanceof ApiError ? err.message : 'Failed to delete job.')
    } finally {
      setDeleteBusyId(null)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Create &amp; manage jobs</h1>
          <p className="subtitle">Publish a new opening and manage the jobs owned by your employer account.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Post a new job</div>
        <p className="card-sub">A notification will be sent to your account on success.</p>
        <form className="form" onSubmit={submit}>
          <div className="field">
            <label>Job title</label>
            <input className="input" required value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="textarea" value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} />
          </div>
          <div className="grid-3">
            <div className="field">
              <label>Salary min</label>
              <input className="input" type="number" min={0} value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} />
            </div>
            <div className="field">
              <label>Salary max</label>
              <input className="input" type="number" min={0} value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} />
            </div>
            <div className="field">
              <label>Currency</label>
              <input className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
          </div>
          <div className="grid-3">
            <div className="field">
              <label>Location</label>
              <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="field">
              <label>Employment type</label>
              <select className="select" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Internship</option>
              </select>
            </div>
            <div className="field">
              <label>Seniority</label>
              <select className="select" value={form.seniorityLevel} onChange={(e) => setForm({ ...form, seniorityLevel: e.target.value })}>
                <option value="">—</option>
                <option>Junior</option>
                <option>Mid</option>
                <option>Senior</option>
                <option>Lead</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Required skill</label>
              <input className="input" value={form.requiredSkillName} onChange={(e) => setForm({ ...form, requiredSkillName: e.target.value })} placeholder="e.g. React" />
            </div>
            <div className="field">
              <label>Skill level</label>
              <input className="input" value={form.requiredSkillLevel} onChange={(e) => setForm({ ...form, requiredSkillLevel: e.target.value })} placeholder="e.g. Advanced" />
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-primary" disabled={busy} type="submit">
              {busy ? 'Publishing…' : 'Publish job'}
            </button>
          </div>
          {msg ? <div className="alert success">{msg}</div> : null}
          {error ? <div className="alert error">{error}</div> : null}
        </form>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="card-title">My posted jobs</div>
            <p className="card-sub">Openings returned for your employer account.</p>
          </div>
          <button className="btn btn-ghost" disabled={myJobsBusy} type="button" onClick={loadMyJobs}>
            {myJobsBusy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {myJobsErr ? <div className="alert error">{myJobsErr}</div> : null}
        {myJobsMsg ? <div className="alert success">{myJobsMsg}</div> : null}

        {myJobsBusy && myJobs.length === 0 ? (
          <div className="empty">Loading your jobs…</div>
        ) : null}

        {!myJobsBusy && !myJobsErr && myJobs.length === 0 ? (
          <div className="empty">No jobs returned for this account.</div>
        ) : null}

        {myJobs.length > 0 ? (
          <div className="list">
            {myJobs.map((myJob, index) => {
              const jobId = myJob.id?.trim() ?? ''
              const createdAt = formatDate(myJob.createdAt)
              const updatedAt = formatDate(myJob.updatedAt)

              return (
                <div className="list-item" key={myJob.id ?? `${myJob.jobTitle ?? 'job'}-${index}`}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{myJob.jobTitle ?? 'Untitled job'}</div>
                    <div className="meta">
                      {myJob.location ?? 'No location'} · {myJob.employmentType ?? 'Employment type not set'}
                      {myJob.seniorityLevel ? ` · ${myJob.seniorityLevel}` : ''}
                    </div>
                    {myJob.jobDescription ? (
                      <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>{myJob.jobDescription}</p>
                    ) : null}
                    <div className="row" style={{ marginTop: 10 }}>
                      <span className="badge">{formatSalary(myJob)}</span>
                      {myJob.requiredSkillName ? (
                        <span className="badge muted">
                          {myJob.requiredSkillName}
                          {myJob.requiredSkillLevel ? ` · ${myJob.requiredSkillLevel}` : ''}
                        </span>
                      ) : null}
                    </div>
                    {createdAt || updatedAt ? (
                      <div className="meta" style={{ marginTop: 8 }}>
                        {createdAt ? `Created ${createdAt}` : ''}
                        {createdAt && updatedAt ? ' · ' : ''}
                        {updatedAt ? `Updated ${updatedAt}` : ''}
                      </div>
                    ) : null}
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={!jobId || deleteBusyId !== null}
                    type="button"
                    onClick={() => deleteJob(myJob)}
                  >
                    {deleteBusyId === jobId ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </>
  )
}
