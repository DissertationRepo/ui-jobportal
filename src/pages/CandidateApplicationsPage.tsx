import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { applicationApi } from '../api/applicationApi'
import type { ApplicationResponse, StatusHistoryResponse } from '../api/applicationApi'
import { jobApi } from '../api/jobApi'
import type { JobResponse } from '../api/jobApi'
import { ApiError } from '../api/http'

function statusBadge(status: string) {
  const s = status.toLowerCase()
  if (s.includes('accept') || s.includes('hire') || s.includes('offer')) return 'success'
  if (s.includes('reject') || s.includes('decline')) return 'danger'
  if (s.includes('review') || s.includes('pending') || s.includes('submit')) return 'warn'
  return 'muted'
}

function getJobTitle(job?: JobResponse | null) {
  return job?.jobTitle?.trim() || 'Job application'
}

export function CandidateApplicationsPage() {
  const { session } = useAuth()
  const token = session?.accessToken ?? ''
  const candidateId = session?.userId ?? ''

  const [items, setItems] = useState<ApplicationResponse[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<Record<string, StatusHistoryResponse[]>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [jobTitles, setJobTitles] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const data = await applicationApi.getByCandidate(candidateId, token)
      const applications = Array.isArray(data) ? data : []
      setItems(applications)

      const jobIds = Array.from(
        new Set(applications.map((application) => application.jobId).filter(Boolean))
      )
      const titleEntries = await Promise.all(
        jobIds.map(async (jobId) => {
          try {
            const job = await jobApi.getById(jobId, token)
            return [jobId, getJobTitle(job)] as const
          } catch {
            return [jobId, 'Job application'] as const
          }
        })
      )
      setJobTitles(Object.fromEntries(titleEntries))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load applications.')
      setJobTitles({})
    } finally {
      setBusy(false)
    }
  }, [candidateId, token])

  useEffect(() => {
    if (candidateId) load()
  }, [candidateId, load])

  const toggleHistory = async (id: string) => {
    if (openId === id) {
      setOpenId(null)
      return
    }
    setOpenId(id)
    if (!history[id]) {
      try {
        const h = await applicationApi.getHistory(id, token)
        setHistory((prev) => ({ ...prev, [id]: h }))
      } catch {
        setHistory((prev) => ({ ...prev, [id]: [] }))
      }
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My applications</h1>
          <p className="subtitle">Track every status change for the jobs you applied to.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => load()} disabled={busy}>
          {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="alert error" style={{ marginBottom: 14 }}>{error}</div> : null}

      {items.length === 0 && !busy ? (
        <div className="empty">No applications yet. Apply to a job to see it here.</div>
      ) : (
        <div className="list">
          {items.map((a) => (
            <div key={a.id} className="card" style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{jobTitles[a.jobId] ?? 'Job application'}</div>
                  {a.appliedAt ? (
                    <div className="meta">Applied: {new Date(a.appliedAt).toLocaleString()}</div>
                  ) : null}
                </div>
                <div className="row">
                  <span className={`badge ${statusBadge(a.status)}`}>{a.status}</span>
                  <button className="btn btn-soft btn-sm" onClick={() => toggleHistory(a.id)}>
                    {openId === a.id ? 'Hide history' : 'View history'}
                  </button>
                </div>
              </div>
              {openId === a.id ? (
                <div style={{ marginTop: 12 }}>
                  {history[a.id]?.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-muted)' }}>
                      {history[a.id].map((h) => (
                        <li key={h.id} style={{ marginBottom: 4 }}>
                          <strong>{h.status}</strong>
                          {h.changedAt ? ` — ${new Date(h.changedAt).toLocaleString()}` : ''}
                          {h.note ? ` · ${h.note}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="muted">No history available.</div>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
