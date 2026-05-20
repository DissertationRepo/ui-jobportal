import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../state/AuthContext'
import { flowApi } from '../api/flowApi'
import { ApiError } from '../api/http'

type Tab = 'login' | 'register-candidate' | 'register-employer'

export function AuthPage() {
  const { login, setSession } = useAuth()
  const [tab, setTab] = useState<Tab>('login')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // login
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // candidate register
  const [cand, setCand] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    summary: '',
    location: '',
  })

  // employer register
  const [emp, setEmp] = useState({
    firstName: '',
    lastName: '',
    password: '',
    companyName: '',
    companyDescription: '',
    industry: '',
    companySize: '',
    contactEmail: '',
  })

  const reset = () => {
    setError('')
    setSuccess('')
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    reset()
    setBusy(true)
    try {
      await login(loginEmail, loginPassword)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleRegisterCandidate = async (e: FormEvent) => {
    e.preventDefault()
    reset()
    setBusy(true)
    try {
      const resp = await flowApi.registerCandidate(cand)
      setSession({
        accessToken: resp.accessToken,
        refreshToken: resp.refreshToken,
        userId: resp.userId,
        email: resp.email || cand.email,
        role: 'Candidate',
        firstName: cand.firstName,
        lastName: cand.lastName,
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed.')
    } finally {
      setBusy(false)
    }
  }

  const handleRegisterEmployer = async (e: FormEvent) => {
    e.preventDefault()
    reset()
    setBusy(true)
    try {
      const resp = await flowApi.registerEmployer(emp)
      setSession({
        accessToken: resp.accessToken,
        refreshToken: resp.refreshToken,
        userId: resp.userId,
        email: resp.email || emp.contactEmail,
        role: 'Employer',
        firstName: emp.firstName,
        lastName: emp.lastName,
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div>
          <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            Job Portal
          </span>
          <h1>Hire faster.<br />Get hired smarter.</h1>
          <p>
            Match candidates and employers with a transparent, modern flow:
            register, build your profile, apply or post jobs, get notified at
            every step.
          </p>
        </div>
        <div className="features">
          <div className="feature">
            <strong>For candidates</strong>
            <p style={{ marginTop: 4, fontSize: '0.92rem' }}>
              Build a profile, apply to jobs, track every status update in real time.
            </p>
          </div>
          <div className="feature">
            <strong>For employers</strong>
            <p style={{ marginTop: 4, fontSize: '0.92rem' }}>
              Post jobs, review applicants, and find matched candidates from one workspace.
            </p>
          </div>
          <div className="feature">
            <strong>Direct messaging</strong>
            <p style={{ marginTop: 4, fontSize: '0.92rem' }}>
              Talk to your matches without leaving the portal.
            </p>
          </div>
        </div>
      </section>

      <section className="auth-card">
        <div className="auth-card-inner">
          <div className="auth-tabs">
            <button className={tab === 'login' ? 'active' : ''} onClick={() => { setTab('login'); reset() }}>
              Sign in
            </button>
            <button className={tab === 'register-candidate' ? 'active' : ''} onClick={() => { setTab('register-candidate'); reset() }}>
              Candidate sign up
            </button>
            <button className={tab === 'register-employer' ? 'active' : ''} onClick={() => { setTab('register-employer'); reset() }}>
              Employer sign up
            </button>
          </div>

          {error ? <div className="alert error" style={{ marginBottom: 12 }}>{error}</div> : null}
          {success ? <div className="alert success" style={{ marginBottom: 12 }}>{success}</div> : null}

          {tab === 'login' ? (
            <form className="form" onSubmit={handleLogin}>
              <div className="field">
                <label>Email</label>
                <input className="input" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="field">
                <label>Password</label>
                <input className="input" type="password" required minLength={6} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="At least 6 characters" />
              </div>
              <button className="btn btn-primary" disabled={busy} type="submit">
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : tab === 'register-candidate' ? (
            <form className="form" onSubmit={handleRegisterCandidate}>
              <div className="grid-2">
                <div className="field">
                  <label>First name</label>
                  <input className="input" required value={cand.firstName} onChange={(e) => setCand({ ...cand, firstName: e.target.value })} />
                </div>
                <div className="field">
                  <label>Last name</label>
                  <input className="input" required value={cand.lastName} onChange={(e) => setCand({ ...cand, lastName: e.target.value })} />
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Email</label>
                  <input className="input" type="email" required value={cand.email} onChange={(e) => setCand({ ...cand, email: e.target.value })} />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input className="input" type="password" required minLength={6} value={cand.password} onChange={(e) => setCand({ ...cand, password: e.target.value })} />
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Phone</label>
                  <input className="input" value={cand.phoneNumber} onChange={(e) => setCand({ ...cand, phoneNumber: e.target.value })} />
                </div>
                <div className="field">
                  <label>Location</label>
                  <input className="input" value={cand.location} onChange={(e) => setCand({ ...cand, location: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Summary</label>
                <textarea className="textarea" value={cand.summary} onChange={(e) => setCand({ ...cand, summary: e.target.value })} placeholder="Tell employers a bit about your experience…" />
              </div>
              <button className="btn btn-primary" disabled={busy} type="submit">
                {busy ? 'Creating account…' : 'Create candidate account'}
              </button>
            </form>
          ) : (
            <form className="form" onSubmit={handleRegisterEmployer}>
              <div className="grid-2">
                <div className="field">
                  <label>First name</label>
                  <input className="input" required value={emp.firstName} onChange={(e) => setEmp({ ...emp, firstName: e.target.value })} />
                </div>
                <div className="field">
                  <label>Last name</label>
                  <input className="input" required value={emp.lastName} onChange={(e) => setEmp({ ...emp, lastName: e.target.value })} />
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Password</label>
                  <input className="input" type="password" required minLength={6} value={emp.password} onChange={(e) => setEmp({ ...emp, password: e.target.value })} />
                </div>
                <div className="field">
                  <label>Contact email</label>
                  <input className="input" type="email" required value={emp.contactEmail} onChange={(e) => setEmp({ ...emp, contactEmail: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label>Company name</label>
                <input className="input" required value={emp.companyName} onChange={(e) => setEmp({ ...emp, companyName: e.target.value })} />
              </div>
              <div className="grid-2">
                <div className="field">
                  <label>Industry</label>
                  <input className="input" value={emp.industry} onChange={(e) => setEmp({ ...emp, industry: e.target.value })} />
                </div>
                <div className="field">
                  <label>Company size</label>
                  <select className="input" value={emp.companySize} onChange={(e) => setEmp({ ...emp, companySize: e.target.value })}>
                    <option value="">Select company size</option>
                    <option value="Startup">Startup</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Company description</label>
                <textarea className="textarea" value={emp.companyDescription} onChange={(e) => setEmp({ ...emp, companyDescription: e.target.value })} />
              </div>
              <button className="btn btn-primary" disabled={busy} type="submit">
                {busy ? 'Creating account…' : 'Create employer account'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
