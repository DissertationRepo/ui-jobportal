import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })

  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'Candidate',
  })

  const [session, setSession] = useState(() => ({
    accessToken: localStorage.getItem('accessToken') ?? '',
    refreshToken: localStorage.getItem('refreshToken') ?? '',
    userId: localStorage.getItem('userId') ?? '',
  }))

  const apiBase = 'http://localhost:5287'

  const hasSession = useMemo(
    () => Boolean(session.accessToken || session.refreshToken),
    [session.accessToken, session.refreshToken]
  )

  const setAuthSession = (next: Partial<typeof session>) => {
    const updated = { ...session, ...next }
    setSession(updated)
    localStorage.setItem('accessToken', updated.accessToken)
    localStorage.setItem('refreshToken', updated.refreshToken)
    localStorage.setItem('userId', updated.userId)
  }

  const clearFeedback = () => {
    setMessage('')
    setError('')
  }

  const postJson = async <T,>(path: string, body: Record<string, string>) => {
    const response = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      return (await response.json()) as T
    }
    return null as T
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFeedback()
    setIsLoading(true)

    try {
      const payload: Record<string, string> = {
        email: loginForm.email,
        password: loginForm.password,
      }

      if (session.refreshToken) {
        payload.refreshToken = session.refreshToken
      }

      const data = await postJson<{ accessToken: string; refreshToken: string }>(
        '/Auth/login',
        payload
      )

      setAuthSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      setMessage('Welcome back! Access token refreshed.')
    } catch (err) {
      setError('Error messages will appear here.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFeedback()
    setIsLoading(true)

    try {
      await postJson<null>('/Auth/Register', registerForm)
      setMessage('Registration successful. You can now sign in.')
      setActiveTab('login')
    } catch (err) {
      setError('Error messages will appear here.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    clearFeedback()
    setIsLoading(true)

    try {
      await postJson<null>('/Auth/Logout', {
        refreshToken: session.refreshToken,
      })
      setAuthSession({
        accessToken: '',
        refreshToken: '',
      })
      setMessage('Logout was successful.')
    } catch (err) {
      setError('Error messages will appear here.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    clearFeedback()
    setIsLoading(true)

    try {
      const data = await postJson<{ accessToken: string }>('/Auth/Refresh', {
        refreshToken: session.refreshToken,
        userId: session.userId,
      })
      setAuthSession({ accessToken: data.accessToken })
      setMessage('Access token refreshed.')
    } catch (err) {
      setError('Error messages will appear here.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-app">
      <div className="auth-surface">
        <aside className="brand-panel">
          <div className="brand-header">
            <span className="brand-chip">Identity Hub</span>
            <h1>Secure access for job-ready talent</h1>
            <p>
              Candidate and employer onboarding, powered by token-first identity.
              Keep sessions synced across devices with refresh tokens and scoped
              access.
            </p>
          </div>
          <div className="brand-metrics">
            <div>
              <span className="metric-label">Auth API</span>
              <span className="metric-value">localhost:5287</span>
            </div>
            <div>
              <span className="metric-label">Password policy</span>
              <span className="metric-value">Min 6 chars</span>
            </div>
            <div>
              <span className="metric-label">Roles</span>
              <span className="metric-value">Candidate, Employer</span>
            </div>
          </div>
          <div className="status-card">
            <div className="status-title">Session status</div>
            <div className="status-row">
              <span>Access token</span>
              <span className={session.accessToken ? 'pill ok' : 'pill'}>
                {session.accessToken ? 'Active' : 'Empty'}
              </span>
            </div>
            <div className="status-row">
              <span>Refresh token</span>
              <span className={session.refreshToken ? 'pill ok' : 'pill'}>
                {session.refreshToken ? 'Stored' : 'Missing'}
              </span>
            </div>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-header">
            <div>
              <p className="eyebrow">Identity service</p>
              <h2>Welcome back to the portal</h2>
            </div>
            <div className="tab-group">
              <button
                className={activeTab === 'login' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('login')}
                type="button"
              >
                Sign in
              </button>
              <button
                className={activeTab === 'register' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('register')}
                type="button"
              >
                Register
              </button>
            </div>
          </div>

          <div className="feedback">
            {message ? <div className="alert success">{message}</div> : null}
            {error ? (
              <div className="alert error">{error}</div>
            ) : (
              <div className="alert placeholder">Error messages will appear here.</div>
            )}
          </div>

          {activeTab === 'login' ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <label>
                Email address
                <input
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
              </label>
              <button className="primary" type="submit" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="grid">
                <label>
                  First name
                  <input
                    type="text"
                    required
                    value={registerForm.firstName}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        firstName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  Last name
                  <input
                    type="text"
                    required
                    value={registerForm.lastName}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        lastName: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <label>
                Email address
                <input
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Role
                <select
                  required
                  value={registerForm.role}
                  onChange={(event) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      role: event.target.value,
                    }))
                  }
                >
                  <option value="Candidate">Candidate</option>
                  <option value="Employer">Employer</option>
                </select>
              </label>
              <button className="primary" type="submit" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}

          <div className="session-tools">
            <div className="session-header">
              <h3>Session controls</h3>
              <p>Keep refresh tokens and user ids aligned with the identity API.</p>
            </div>
            <label>
              User ID
              <input
                type="text"
                placeholder="User id for refresh calls"
                value={session.userId}
                onChange={(event) => setAuthSession({ userId: event.target.value })}
              />
            </label>
            <label>
              Refresh token
              <input
                type="text"
                placeholder="Stored refresh token"
                value={session.refreshToken}
                onChange={(event) =>
                  setAuthSession({ refreshToken: event.target.value })
                }
              />
            </label>
            <div className="session-actions">
              <button
                className="ghost"
                type="button"
                onClick={handleRefresh}
                disabled={isLoading || !session.refreshToken || !session.userId}
              >
                Refresh access token
              </button>
              <button
                className="ghost danger"
                type="button"
                onClick={handleLogout}
                disabled={isLoading || !hasSession}
              >
                Logout
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
