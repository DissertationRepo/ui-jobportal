import { useState } from 'react'
import './App.css'
import { AuthPage } from './pages/AuthPage'
import { CandidatePage } from './pages/CandidatePage'

type AppPage = 'auth' | 'candidate'

function App() {
  const [accessToken, setAccessToken] = useState(
    () => localStorage.getItem('accessToken') ?? ''
  )
  const [activePage, setActivePage] = useState<AppPage>(() =>
    localStorage.getItem('accessToken') ? 'candidate' : 'auth'
  )

  const handleLoginSuccess = (nextAccessToken: string) => {
    localStorage.setItem('accessToken', nextAccessToken)
    setAccessToken(nextAccessToken)
    setActivePage('candidate')
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userId')
    setAccessToken('')
    setActivePage('auth')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <p className="eyebrow">Job portal workspace</p>
        <h1>{activePage === 'auth' ? 'Simple account access' : 'Candidate profile lookup'}</h1>
      </header>

      <main>
        {activePage === 'auth' ? (
          <AuthPage onLoginSuccess={handleLoginSuccess} />
        ) : (
          <CandidatePage accessToken={accessToken} onLogout={handleLogout} />
        )}
      </main>
    </div>
  )
}

export default App
