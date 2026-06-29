import { useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function AuthScreen() {
  const { authMode, setAuthMode, signIn, signUp } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (authMode === 'sign-in') {
        await signIn(email.trim(), password)
      } else {
        await signUp(email.trim(), password)
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
          Sign in to sync your wardrobe across devices.
        </p>
      </div>

      <div className="flex gap-1 mb-6">
        {(
          [
            ['sign-in', 'Sign in'],
            ['sign-up', 'Sign up'],
          ] as const
        ).map(([tabMode, label]) => (
          <button
            key={tabMode}
            type="button"
            onClick={() => {
              setAuthMode(tabMode)
              setError('')
            }}
            className={`neo-btn flex-1 py-2 text-xs ${authMode === tabMode ? 'bg-yellow' : 'bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 neo-border bg-white p-4">
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
          autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Please wait…' : authMode === 'sign-in' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <p className="text-xs opacity-60 mt-6 leading-relaxed">
        {authMode === 'sign-up'
          ? 'Your closet is saved to your account and available on any device you sign in on.'
          : 'Each account has its own private closet.'}
      </p>
    </div>
  )
}
