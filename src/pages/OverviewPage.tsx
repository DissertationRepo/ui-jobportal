import { useAuth } from '../state/AuthContext'
import { useNav } from '../state/NavContext'

export function OverviewPage() {
  const { session } = useAuth()
  const { setRoute } = useNav()
  const isEmp = session?.role === 'Employer'

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Welcome back{session?.firstName ? `, ${session.firstName}` : ''}</h1>
          <p className="subtitle">
            {isEmp
              ? 'Post jobs, review applicants, and message your matched candidates.'
              : 'Apply to jobs, track every status update, and chat with employers.'}
          </p>
        </div>
        <div className="row">
          <span className="badge">{session?.role}</span>
        </div>
      </div>

      <div className="grid-3">
        {(isEmp
          ? [
              { route: 'create-job', title: 'Post a job', sub: 'Publish a new opening and notify yourself.' },
              { route: 'applications', title: 'Review applicants', sub: 'Update statuses — candidates are notified.' },
              { route: 'matching', title: 'Find matches', sub: 'See candidates suggested for your jobs.' },
              { route: 'messaging', title: 'Send a message', sub: 'Talk directly with candidates.' },
            ]
          : [
              { route: 'jobs', title: 'Apply to a job', sub: 'Submit an application and get notified.' },
              { route: 'applications', title: 'Track applications', sub: 'See current statuses and history.' },
              { route: 'matching', title: 'Matching jobs', sub: 'Discover jobs that fit your profile.' },
              { route: 'messaging', title: 'Open messages', sub: 'Chat with employers about your application.' },
              { route: 'profile', title: 'Edit profile', sub: 'Add skills and experience to stand out.' },
            ]
        ).map((c) => (
          <button
            key={c.route}
            type="button"
            className="card"
            style={{ textAlign: 'left', cursor: 'pointer' }}
            onClick={() => setRoute(c.route as never)}
          >
            <div className="card-title">{c.title}</div>
            <div className="card-sub" style={{ marginBottom: 0 }}>{c.sub}</div>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-title">User flow</div>
        <p className="card-sub" style={{ marginBottom: 12 }}>
          The portal mirrors the system's use-case diagram.
        </p>
        <ul style={{ paddingLeft: 18, margin: 0, color: 'var(--text-muted)', lineHeight: 1.9 }}>
          {isEmp ? (
            <>
              <li>Login / Registration → Create company profile</li>
              <li>Create job → Compute candidate matches</li>
              <li>Update application status → Candidate notified</li>
              <li>Messaging</li>
            </>
          ) : (
            <>
              <li>Login / Registration → Create candidate profile</li>
              <li>Apply to job → Track application status</li>
              <li>Compute matching service → Get matching jobs</li>
              <li>Get notified about every status update</li>
              <li>Messaging</li>
            </>
          )}
        </ul>
      </div>
    </>
  )
}
