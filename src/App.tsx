import './App.css'
import { AuthProvider, useAuth } from './state/AuthContext'
import { NavProvider, useNav } from './state/NavContext'
import { AuthPage } from './pages/AuthPage'
import { Layout } from './components/Layout'
import { OverviewPage } from './pages/OverviewPage'
import { CandidateJobsPage } from './pages/CandidateJobsPage'
import { CandidateApplicationsPage } from './pages/CandidateApplicationsPage'
import { CandidateProfilePage } from './pages/CandidateProfilePage'
import { MatchingPage } from './pages/MatchingPage'
import { EmployerCreateJobPage } from './pages/EmployerCreateJobPage'
import { EmployerApplicationsPage } from './pages/EmployerApplicationsPage'
import { EmployerProfilePage } from './pages/EmployerProfilePage'
import { MessagingPage } from './pages/MessagingPage'

function AuthenticatedShell() {
  const { session } = useAuth()
  const { route } = useNav()
  const isEmp = session?.role === 'Employer'

  let page: React.ReactNode = <OverviewPage />
  if (route === 'overview') page = <OverviewPage />
  else if (route === 'messaging') page = <MessagingPage />
  else if (route === 'matching') page = <MatchingPage />
  else if (isEmp) {
    if (route === 'create-job') page = <EmployerCreateJobPage />
    else if (route === 'applications') page = <EmployerApplicationsPage />
    else if (route === 'profile') page = <EmployerProfilePage />
  } else {
    if (route === 'jobs') page = <CandidateJobsPage />
    else if (route === 'applications') page = <CandidateApplicationsPage />
    else if (route === 'profile') page = <CandidateProfilePage />
  }

  return <Layout>{page}</Layout>
}

function Root() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <AuthPage />
  return (
    <NavProvider>
      <AuthenticatedShell />
    </NavProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}
