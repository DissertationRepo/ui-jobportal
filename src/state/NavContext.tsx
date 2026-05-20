import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type CandidateRoute =
  | 'overview'
  | 'jobs'
  | 'applications'
  | 'matching'
  | 'messaging'
  | 'profile'

export type EmployerRoute =
  | 'overview'
  | 'create-job'
  | 'applications'
  | 'matching'
  | 'messaging'
  | 'profile'

export type AppRoute = CandidateRoute | EmployerRoute

type NavContextValue = {
  route: AppRoute
  setRoute: (route: AppRoute) => void
}

const NavContext = createContext<NavContextValue | undefined>(undefined)

export function NavProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<AppRoute>('overview')
  const value = useMemo(() => ({ route, setRoute }), [route])
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used inside NavProvider')
  return ctx
}
