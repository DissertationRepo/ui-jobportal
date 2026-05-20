import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../state/AuthContext'
import { candidateApi } from '../api/candidateApi'
import type {
  CandidateExperience,
  CandidateProfile,
  CandidateSkill,
} from '../api/candidateApi'
import { ApiError } from '../api/http'

export function CandidateProfilePage() {
  const { session } = useAuth()
  const token = session?.accessToken ?? ''
  const userId = session?.userId ?? ''

  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [skills, setSkills] = useState<CandidateSkill[]>([])
  const [experiences, setExperiences] = useState<CandidateExperience[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [skillForm, setSkillForm] = useState({
    name: '',
    skillLevel: '',
    yearsOfExperience: '',
  })
  const [skillBusy, setSkillBusy] = useState(false)
  const [skillMsg, setSkillMsg] = useState('')

  const [expForm, setExpForm] = useState({
    company: '',
    position: '',
    description: '',
    startDate: '',
    endDate: '',
  })
  const [expBusy, setExpBusy] = useState(false)
  const [expMsg, setExpMsg] = useState('')

  const load = useCallback(async () => {
    if (!userId) return
    setBusy(true); setError('')
    try {
      const [p, sk, ex] = await Promise.allSettled([
        candidateApi.getById(userId, token),
        candidateApi.getSkills(userId, token),
        candidateApi.getExperiences(userId, token),
      ])
      setProfile(p.status === 'fulfilled' ? p.value : null)
      setSkills(sk.status === 'fulfilled' ? sk.value : [])
      setExperiences(ex.status === 'fulfilled' ? ex.value : [])
      if (p.status === 'rejected') {
        setError(p.reason instanceof ApiError ? p.reason.message : 'Profile not found.')
      }
    } finally { setBusy(false) }
  }, [userId, token])

  useEffect(() => { load() }, [load])

  const addSkill = async (e: FormEvent) => {
    e.preventDefault()
    setSkillMsg(''); setSkillBusy(true)
    try {
      await candidateApi.addSkill({
        candidateId: userId,
        name: skillForm.name,
        skillLevel: skillForm.skillLevel,
        yearsOfExperience: skillForm.yearsOfExperience,
      }, token)
      setSkillForm({ name: '', skillLevel: '', yearsOfExperience: '' })
      setSkillMsg('Skill added.')
      load()
    } catch (err) {
      setSkillMsg(err instanceof ApiError ? err.message : 'Failed to add skill.')
    } finally { setSkillBusy(false) }
  }

  const addExperience = async (e: FormEvent) => {
    e.preventDefault()
    setExpMsg(''); setExpBusy(true)
    try {
      await candidateApi.addExperience({ candidateId: userId, ...expForm }, token)
      setExpForm({ company: '', position: '', description: '', startDate: '', endDate: '' })
      setExpMsg('Experience added.')
      load()
    } catch (err) {
      setExpMsg(err instanceof ApiError ? err.message : 'Failed to add experience.')
    } finally { setExpBusy(false) }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My profile</h1>
          <p className="subtitle">Update your details, skills, and experience.</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={busy}>
          {busy ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="alert info" style={{ marginBottom: 14 }}>{error}</div> : null}

      {profile ? (
        <div className="card">
          <div className="card-title">{profile.firstName} {profile.lastName}</div>
          <div className="card-sub">{profile.email}</div>
          <div className="grid-3">
            <div className="kv"><span className="k">Phone</span><span className="v">{profile.phoneNumber || '—'}</span></div>
            <div className="kv"><span className="k">Location</span><span className="v">{profile.location || '—'}</span></div>
          </div>
          {profile.summary ? (
            <p style={{ marginTop: 14, color: 'var(--text-muted)' }}>{profile.summary}</p>
          ) : null}
        </div>
      ) : null}

      <div className="card">
        <div className="card-title">Skills</div>
        <form className="form" onSubmit={addSkill}>
          <div className="grid-3">
            <div className="field">
              <label>Skill</label>
              <input className="input" required value={skillForm.name} onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })} placeholder="e.g. React" />
            </div>
            <div className="field">
              <label>Level</label>
              <input className="input" required value={skillForm.skillLevel} onChange={(e) => setSkillForm({ ...skillForm, skillLevel: e.target.value })} placeholder="e.g. Senior" />
            </div>
            <div className="field">
              <label>Years of experience</label>
              <input className="input" required type="number" min="0" value={skillForm.yearsOfExperience} onChange={(e) => setSkillForm({ ...skillForm, yearsOfExperience: e.target.value })} placeholder="e.g. 3" />
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-primary" disabled={skillBusy} type="submit">
              {skillBusy ? 'Adding…' : 'Add skill'}
            </button>
          </div>
          {skillMsg ? <div className="alert info">{skillMsg}</div> : null}
        </form>
        <div className="divider" />
        {skills.length === 0 ? (
          <div className="empty">No skills yet.</div>
        ) : (
          <div className="row">
            {skills.map((s, i) => (
              <span key={s.id ?? i} className="badge">{s.name} · {s.skillLevel} · {s.yearsOfExperience} yrs</span>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Experience</div>
        <form className="form" onSubmit={addExperience}>
          <div className="grid-2">
            <div className="field">
              <label>Company</label>
              <input className="input" required value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} />
            </div>
            <div className="field">
              <label>Job title</label>
              <input className="input" required value={expForm.position} onChange={(e) => setExpForm({ ...expForm, position: e.target.value })} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Start date</label>
              <input className="input" type="date" value={expForm.startDate} onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })} />
            </div>
            <div className="field">
              <label>End date</label>
              <input className="input" type="date" value={expForm.endDate} onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea className="textarea" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} />
          </div>
          <div className="actions">
            <button className="btn btn-primary" disabled={expBusy} type="submit">
              {expBusy ? 'Adding…' : 'Add experience'}
            </button>
          </div>
          {expMsg ? <div className="alert info">{expMsg}</div> : null}
        </form>
        <div className="divider" />
        {experiences.length === 0 ? (
          <div className="empty">No experience entries yet.</div>
        ) : (
          <div className="list">
            {experiences.map((x, i) => (
              <div key={x.id ?? i} className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>{x.position} · {x.company}</div>
                  <div className="meta">
                    {x.startDate ? new Date(x.startDate).toLocaleDateString() : '—'} → {x.endDate ? new Date(x.endDate).toLocaleDateString() : 'Present'}
                  </div>
                  {x.description ? <div className="meta">{x.description}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
