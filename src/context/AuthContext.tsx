import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clearCloudStorage, configureCloudStorage } from '../lib/storage'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type AuthMode = 'sign-in' | 'sign-up'

interface AuthContextValue {
  loading: boolean
  session: Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']
  authMode: AuthMode
  setAuthMode: (mode: AuthMode) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [session, setSession] = useState<AuthContextValue['session']>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      clearCloudStorage()
      return
    }
    configureCloudStorage(session.user.id)
  }, [session])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured')
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    if (!data.session) {
      throw new Error('Check your email to confirm your account, then sign in.')
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    clearCloudStorage()
  }, [])

  const value = useMemo(
    () => ({
      loading,
      session,
      authMode,
      setAuthMode,
      signIn,
      signUp,
      signOut,
    }),
    [loading, session, authMode, signIn, signUp, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useRequiresAuth() {
  return isSupabaseConfigured
}
