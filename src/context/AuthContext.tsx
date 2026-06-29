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
import { isSupabaseConfigured, supabase, type Household, type Profile } from '../lib/supabase'

type AuthMode = 'sign-in' | 'create' | 'join'

interface AuthContextValue {
  loading: boolean
  session: Awaited<ReturnType<NonNullable<typeof supabase>['auth']['getSession']>>['data']['session']
  profile: Profile | null
  household: Household | null
  authMode: AuthMode
  setAuthMode: (mode: AuthMode) => void
  signIn: (email: string, password: string) => Promise<void>
  signUpCreateHousehold: (
    email: string,
    password: string,
    householdName: string
  ) => Promise<{ inviteCode: string }>
  signUpJoinHousehold: (email: string, password: string, inviteCode: string) => Promise<void>
  createHousehold: (householdName: string) => Promise<{ inviteCode: string }>
  joinHousehold: (inviteCode: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, household_id, display_name')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function fetchHousehold(householdId: string): Promise<Household | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('households')
    .select('id, name, invite_code')
    .eq('id', householdId)
    .maybeSingle()
  if (error) throw error
  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [session, setSession] = useState<AuthContextValue['session']>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [household, setHousehold] = useState<Household | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in')

  const refreshProfile = useCallback(async () => {
    if (!supabase || !session?.user) {
      setProfile(null)
      setHousehold(null)
      clearCloudStorage()
      return
    }

    const p = await fetchProfile(session.user.id)
    setProfile(p)

    if (p?.household_id) {
      configureCloudStorage(p.household_id)
      const h = await fetchHousehold(p.household_id)
      setHousehold(h)
    } else {
      clearCloudStorage()
      setHousehold(null)
    }
  }, [session])

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
    if (!session) {
      setProfile(null)
      setHousehold(null)
      clearCloudStorage()
      return
    }
    refreshProfile().catch(console.error)
  }, [session, refreshProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUpCreateHousehold = useCallback(
    async (email: string, password: string, householdName: string) => {
      if (!supabase) throw new Error('Supabase not configured')

      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (!data.session) {
        throw new Error('Check your email to confirm your account, then sign in.')
      }

      const { data: created, error: rpcError } = await supabase.rpc('create_household', {
        household_name: householdName,
      })
      if (rpcError) throw rpcError

      const row = (created as { invite_code: string }[] | null)?.[0]
      await refreshProfile()
      return { inviteCode: row?.invite_code ?? '' }
    },
    [refreshProfile]
  )

  const createHousehold = useCallback(
    async (householdName: string) => {
      if (!supabase) throw new Error('Supabase not configured')
      const { data: created, error } = await supabase.rpc('create_household', {
        household_name: householdName,
      })
      if (error) throw error
      const row = (created as { invite_code: string }[] | null)?.[0]
      await refreshProfile()
      return { inviteCode: row?.invite_code ?? '' }
    },
    [refreshProfile]
  )

  const joinHousehold = useCallback(
    async (inviteCode: string) => {
      if (!supabase) throw new Error('Supabase not configured')
      const { error } = await supabase.rpc('join_household', { code: inviteCode })
      if (error) throw error
      await refreshProfile()
    },
    [refreshProfile]
  )

  const signUpJoinHousehold = useCallback(
    async (email: string, password: string, inviteCode: string) => {
      if (!supabase) throw new Error('Supabase not configured')

      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      if (!data.session) {
        throw new Error('Check your email to confirm your account, then sign in and join.')
      }

      const { error: joinError } = await supabase.rpc('join_household', { code: inviteCode })
      if (joinError) throw joinError

      await refreshProfile()
    },
    [refreshProfile]
  )

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    clearCloudStorage()
    setProfile(null)
    setHousehold(null)
  }, [])

  const value = useMemo(
    () => ({
      loading,
      session,
      profile,
      household,
      authMode,
      setAuthMode,
      signIn,
      signUpCreateHousehold,
      signUpJoinHousehold,
      createHousehold,
      joinHousehold,
      signOut,
      refreshProfile,
    }),
    [
      loading,
      session,
      profile,
      household,
      authMode,
      signIn,
      signUpCreateHousehold,
      signUpJoinHousehold,
      createHousehold,
      joinHousehold,
      signOut,
      refreshProfile,
    ]
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
