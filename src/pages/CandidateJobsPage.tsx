import { useState } from 'react'
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

export function CandidateJobsPage() {
  const { session } = useAuth()
  const token = session?.accessToken ?? ''
  const candidateId = session?.userId ?? ''

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<JobResponse[]>([])
  const [selectedJob, setSelectedJob] = useState<JobResponse | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [coverLetter, setCoverLetter] = useState('')
  const [applyBusy, setApplyBusy] = useState(false)
  const [applyMsg, setApplyMsg] = useState('')
  const [applyError, setApplyError] = useState('')

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    setSearchError('')
    setApplyError('')
    setApplyMsg('')
    setSelectedJob(null)
    setSearchResults([])
    setHasSearched(true)
    setSearchBusy(true)
    try {
      const jobs = await jobApi.search(query, token)
      setSearchResults(jobs)
    } catch (err) {
      setSearchError(err instanceof ApiError ? err.message : 'Could not search jobs.')
    } finally {
      setSearchBusy(false)
    }
  }

  const handleApply = async (e: FormEvent) => {
    e.preventDefault()
    const jobId = selectedJob?.id?.trim()
    if (!jobId) {
      setApplyError('Choose a job from the search results before applying.')
      return
    }

    setApplyError('')
    setApplyMsg('')
    setApplyBusy(true)
    try {
      await flowApi.submitApplication(
        {
          candidateId,
          jobId,
          coverLetter: coverLetter || undefined,
          candidateEmail: session?.email,
        },
        token
      )
      setApplyMsg('Application submitted. You will receive a notification.')
      setCoverLetter('')
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.message : 'Failed to apply.')
    } finally {
      setApplyBusy(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Apply to a job</h1>
          <p className="subtitle">Search for an opening, choose a result, then submit your application.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-title">1. Search jobs</div>
        <p className="card-sub">Search by title, skill, seniority, or location.</p>
        <form className="form" onSubmit={handleSearch}>
          <div className="row">
            <input
              className="input"
              placeholder="e.g. React, remote, junior"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: 240 }}
              required
            />
            <button className="btn btn-ghost" disabled={searchBusy} type="submit">
              {searchBusy ? 'Searching...' : 'Search'}
            </button>
          </div>
          {searchError ? <div className="alert error">{searchError}</div> : null}
        </form>

        {searchBusy && searchResults.length === 0 ? (
          <div className="empty" style={{ marginTop: 14 }}>Searching jobs...</div>
        ) : null}

        {!searchBusy && hasSearched && !searchError && searchResults.length === 0 ? (
          <div className="empty" style={{ marginTop: 14 }}>No jobs matched your search.</div>
        ) : null}

        {searchResults.length > 0 ? (
          <div className="list" style={{ marginTop: 16 }}>
            {searchResults.map((job, index) => {
              const jobId = job.id?.trim() ?? ''
              const isSelected = selectedJob?.id === job.id

              return (
                <div className="list-item" key={jobId || `${job.jobTitle ?? 'job'}-${index}`}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{job.jobTitle ?? 'Untitled job'}</div>
                    <div className="meta">
                      {job.location ?? 'No location'} - {job.employmentType ?? 'Employment type not set'}
                      {job.seniorityLevel ? ` - ${job.seniorityLevel}` : ''}
                    </div>
                    {job.jobDescription ? (
                      <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>{job.jobDescription}</p>
                    ) : null}
                    <div className="row" style={{ marginTop: 10 }}>
                      <span className="badge">{formatSalary(job)}</span>
                      {job.requiredSkillName ? (
                        <span className="badge muted">
                          {job.requiredSkillName}
                          {job.requiredSkillLevel ? ` - ${job.requiredSkillLevel}` : ''}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    className={`btn ${isSelected ? 'btn-soft' : 'btn-ghost'} btn-sm`}
                    disabled={!jobId}
                    type="button"
                    onClick={() => {
                      setSelectedJob(job)
                      setApplyError('')
                      setApplyMsg('')
                    }}
                  >
                    {isSelected ? 'Selected' : 'Choose'}
                  </button>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className="card">
        <div className="card-title">2. Submit your application</div>
        <p className="card-sub">A notification will be sent confirming your submission.</p>
        <form className="form" onSubmit={handleApply}>
          {selectedJob ? (
            <div className="alert info">
              Applying to {selectedJob.jobTitle ?? 'selected job'}
              {selectedJob.location ? ` in ${selectedJob.location}` : ''}.
            </div>
          ) : (
            <div className="empty">Choose a job from the search results first.</div>
          )}
          <div className="field">
            <label>Cover letter (optional)</label>
            <textarea
              className="textarea"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Why are you a great fit?"
            />
          </div>
          <div className="actions">
            <button className="btn btn-primary" disabled={applyBusy || !selectedJob?.id} type="submit">
              {applyBusy ? 'Submitting…' : 'Submit application'}
            </button>
          </div>
          {applyMsg ? <div className="alert success">{applyMsg}</div> : null}
          {applyError ? <div className="alert error">{applyError}</div> : null}
        </form>
      </div>
    </>
  )
}
