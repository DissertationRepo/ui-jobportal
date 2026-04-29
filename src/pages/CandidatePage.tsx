import { useState } from 'react'
import type { FormEvent } from 'react'
import { candidateApi } from '../api/candidateApi'

type CandidatePageProps = {
  accessToken: string
  onLogout: () => void
}

type CandidateProfile = Awaited<
  ReturnType<typeof candidateApi.getCandidateById>
>

export function CandidatePage({ accessToken, onLogout }: CandidatePageProps) {
  const [candidateId, setCandidateId] = useState('')
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const data = await candidateApi.getCandidateById(candidateId, accessToken)
      setCandidate(data)
    } catch {
      setCandidate(null)
      setError('Unable to load candidate details for that id.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="candidate-page">
      <div className="candidate-surface">
        <div className="candidate-header">
          <div>
            <span className="brand-chip">Candidate API</span>
            <h2>Find candidate details</h2>
            <p>
              Enter a candidate id and the request will be sent with the access token
              in the `Authorization: Bearer ...` header.
            </p>
          </div>
          <button className="ghost" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>

        <form className="candidate-form" onSubmit={handleSubmit}>
          <label>
            Candidate ID
            <input
              type="text"
              required
              placeholder="b48a032e-80f3-4554-9afe-1af73ac720f1"
              value={candidateId}
              onChange={(event) => setCandidateId(event.target.value)}
            />
          </label>
          <button className="primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Loading candidate...' : 'Load candidate'}
          </button>
        </form>

        {error ? <div className="alert error">{error}</div> : null}

        {candidate ? (
          <div className="candidate-card">
            <div className="candidate-card-header">
              <p className="eyebrow">Candidate profile</p>
              <h3>
                {candidate.firstName} {candidate.lastName}
              </h3>
            </div>

            <div className="candidate-grid">
              <div>
                <span className="metric-label">User ID</span>
                <span className="metric-value">{candidate.userId}</span>
              </div>
              <div>
                <span className="metric-label">Email</span>
                <span className="metric-value">{candidate.email}</span>
              </div>
              <div>
                <span className="metric-label">Phone number</span>
                <span className="metric-value">{candidate.phoneNumber}</span>
              </div>
              <div>
                <span className="metric-label">Location</span>
                <span className="metric-value">{candidate.location}</span>
              </div>
            </div>

            <div className="candidate-summary">
              <span className="metric-label">Summary</span>
              <p>{candidate.summary}</p>
            </div>
          </div>
        ) : (
          <div className="alert placeholder">
            Candidate details will appear here after a successful lookup.
          </div>
        )}
      </div>
    </section>
  )
}
