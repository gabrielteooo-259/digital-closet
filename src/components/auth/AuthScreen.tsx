import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface AuthScreenProps {
  setupOnly?: boolean
}

export function AuthScreen({ setupOnly = false }: AuthScreenProps) {
  const {
    authMode,
    setAuthMode,
    signIn,
    signUpCreateHousehold,
    signUpJoinHousehold,
    createHousehold,
    joinHousehold,
    household,
    session,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [householdName, setHouseholdName] = useState('Our Closet')
  const [inviteCode, setInviteCode] = useState('')
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const mode = setupOnly ? (authMode === 'sign-in' ? 'create' : authMode) : authMode

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (setupOnly && session) {
        if (mode === 'create') {
          const result = await createHousehold(householdName.trim())
          setCreatedInviteCode(result.inviteCode)
        } else {
          await joinHousehold(inviteCode.trim())
        }
        return
      }

      if (mode === 'sign-in') {
        await signIn(email.trim(), password)
      } else if (mode === 'create') {
        const result = await signUpCreateHousehold(email.trim(), password, householdName.trim())
        setCreatedInviteCode(result.inviteCode)
      } else {
        await signUpJoinHousehold(email.trim(), password, inviteCode.trim())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Digital Closet</h1>
        <p className="text-sm opacity-70 mt-1">
          {setupOnly
            ? 'Create or join a household to sync your closet across devices.'
            : 'Sign in to sync your wardrobe across devices with your partner.'}
        </p>
      </div>

      <div className="flex gap-1 mb-6">
        {(setupOnly
          ? ([
              ['create', 'Create'],
              ['join', 'Join'],
            ] as const)
          : ([
              ['sign-in', 'Sign in'],
              ['create', 'Create'],
              ['join', 'Join'],
            ] as const)
        ).map(([tabMode, label]) => (
          <button
            key={tabMode}
            type="button"
            onClick={() => {
              setAuthMode(tabMode)
              setError('')
              setCreatedInviteCode(null)
            }}
            className={`neo-btn flex-1 py-2 text-xs ${mode === tabMode ? 'bg-yellow' : 'bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {createdInviteCode && (
        <div className="neo-border bg-yellow p-4 mb-4 text-sm">
          <p className="font-bold mb-1">Household created!</p>
          <p className="mb-2">Share this invite code with your partner:</p>
          <p className="text-2xl font-bold tracking-widest">{createdInviteCode}</p>
        </div>
      )}

      {household && (
        <div className="neo-border bg-white p-3 mb-4 text-sm">
          <p className="font-semibold">{household.name}</p>
          <p className="opacity-70">
            Invite code: <span className="font-mono font-bold">{household.invite_code}</span>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 neo-border bg-white p-4">
        {!setupOnly && (
          <>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </>
        )}

        {mode === 'create' && (
          <Input
            label="Household name"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="Our Closet"
          />
        )}

        {mode === 'join' && (
          <Input
            label="Invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ABC12345"
            required
          />
        )}

        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? 'Please wait…'
            : setupOnly
              ? mode === 'create'
                ? 'Create household'
                : 'Join household'
              : mode === 'sign-in'
                ? 'Sign in'
                : mode === 'create'
                  ? 'Create account & household'
                  : 'Create account & join'}
        </Button>
      </form>

      <p className="text-xs opacity-60 mt-6 leading-relaxed">
        {mode === 'create'
          ? 'One of you creates a household and shares the invite code. The other joins with that code.'
          : mode === 'join'
            ? 'Enter the invite code from your partner to share the same closet.'
            : 'Sign in on any device to see the same shared closet.'}
      </p>
    </div>
  )
}
