import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { employerApi } from '../api/employerApi'
import type { EmployerProfile } from '../api/employerApi'
import { ApiError } from '../api/http'

export function EmployerProfilePage() {
  const { session } = useAuth()
  const token = session?.accessToken ?? ''
  const userId = session?.userId ?? ''

  const [profile, setProfile] = useState<EmployerProfile | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!userId) return
    setBusy(true); setError('')
    try {
      const p = await employerApi.getByUserId(userId, token)
      setProfile(p)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Profile not found.')
    } finally { setBusy(false) }
  }, [userId, token])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Company profile</h1>
          <p className="subtitle">Information shown to candidates about your company.</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={busy}>
          {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="alert info">{error}</div> : null}

      {profile ? (
        <div className="card">
          <div className="card-title">{profile.companyName}</div>
          <div className="card-sub">{profile.industry ?? 'Industry not set'}</div>
          <div className="grid-3">
            <div className="kv"><span className="k">Company size</span><span className="v">{profile.companySize ?? '—'}</span></div>
            <div className="kv"><span className="k">Contact email</span><span className="v">{profile.contactEmail ?? '—'}</span></div>
          </div>
          {profile.companyDescription ? (
            <p style={{ marginTop: 14, color: 'var(--text-muted)' }}>{profile.companyDescription}</p>
          ) : null}
        </div>
      ) : !busy ? (
        <div className="empty">No employer profile linked to this account.</div>
      ) : null}
    </>
  )
}
