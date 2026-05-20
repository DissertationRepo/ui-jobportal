import type { ReactNode } from 'react'
import { useAuth } from '../state/AuthContext'
import { useNav } from '../state/NavContext'
import type { AppRoute } from '../state/NavContext'

type NavItem = { route: AppRoute; label: string; icon: string }

const candidateNav: NavItem[] = [
  { route: 'overview', label: 'Overview', icon: '◎' },
  { route: 'jobs', label: 'Apply to Jobs', icon: '✦' },
  { route: 'applications', label: 'My Applications', icon: '☰' },
  { route: 'matching', label: 'Matching Jobs', icon: '✺' },
  { route: 'messaging', label: 'Messages', icon: '✉' },
  { route: 'profile', label: 'My Profile', icon: '◐' },
]

const employerNav: NavItem[] = [
  { route: 'overview', label: 'Overview', icon: '◎' },
  { route: 'create-job', label: 'Create / Manage Jobs', icon: '✦' },
  { route: 'applications', label: 'Applications', icon: '☰' },
  { route: 'matching', label: 'Candidate Matches', icon: '✺' },
  { route: 'messaging', label: 'Messages', icon: '✉' },
  { route: 'profile', label: 'Company Profile', icon: '◐' },
]

export function Layout({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth()
  const { route, setRoute } = useNav()

  const navItems = session?.role === 'Employer' ? employerNav : candidateNav

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">JP</div>
          <div>
            <div className="brand-name">JobPortal</div>
            <div className="brand-sub">{session?.role ?? 'Guest'}</div>
          </div>
        </div>

        <div className="nav-group-label">Workspace</div>
        <nav style={{ display: 'grid', gap: 4 }}>
          {navItems.map((item) => (
            <button
              key={item.route}
              type="button"
              className={`nav-item ${route === item.route ? 'active' : ''}`}
              onClick={() => setRoute(item.route)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="role">Signed in as</span>
          <span className="who">{session?.email}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => logout()}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
