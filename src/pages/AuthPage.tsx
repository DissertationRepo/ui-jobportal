import { useState } from 'react'
import type { FormEvent } from 'react'
import { AUTH_API_BASE, authApi } from '../api/authApi'

type AuthTab = 'login' | 'register'

type AuthPageProps = {
  onLoginSuccess: (accessToken: string) => void
}

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<AuthTab>('login')
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

  const clearFeedback = () => {
    setMessage('')
    setError('')
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFeedback()
    setIsLoading(true)

    try {
      const data = await authApi.login({
        email: loginForm.email,
        password: loginForm.password,
      })

      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      onLoginSuccess(data.accessToken)
    } catch {
      setError('Unable to sign in with those credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFeedback()
    setIsLoading(true)

    try {
      await authApi.register(registerForm)
      setMessage('Registration successful. You can now sign in.')
      setActiveTab('login')
    } catch {
      setError('Unable to create the account right now.')
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
            <h2>Sign in and continue to your candidate area</h2>
            <p>
              This page focuses only on registration and login. Session tokens stay
              hidden from the interface and are only used internally for API calls.
            </p>
          </div>
          <div className="brand-metrics">
            <div>
              <span className="metric-label">Auth API</span>
              <span className="metric-value">{AUTH_API_BASE.replace('http://', '')}</span>
            </div>
            <div>
              <span className="metric-label">Password policy</span>
              <span className="metric-value">Min 6 chars</span>
            </div>
            <div>
              <span className="metric-label">Flow</span>
              <span className="metric-value">Login, then auto-open CandidatePage</span>
            </div>
          </div>
          <div className="status-card">
            <div className="status-title">What happens next</div>
            <p className="status-copy">
              After sign in, the app navigates directly to `CandidatePage` and uses
              the stored access token as a bearer token for candidate requests.
            </p>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-header">
            <div>
              <p className="eyebrow">Identity service</p>
              <h3>{activeTab === 'login' ? 'Sign in to the portal' : 'Create an account'}</h3>
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
              <div className="alert placeholder">
                Sign in to continue, or create an account first.
              </div>
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
        </section>
      </div>
    </div>
  )
}
