import { useState } from 'react'
import { ClosetView } from './components/closet/ClosetView'
import { OutfitPlannerView } from './components/outfits/OutfitPlannerView'
import { AuthScreen } from './components/auth/AuthScreen'
import { AppProvider, useApp } from './context/AppContext'
import { AuthProvider, useAuth, useRequiresAuth } from './context/AuthContext'
import { Button } from './components/ui/Button'

type Tab = 'closet' | 'outfits'

function AppContent() {
  const { loading } = useApp()
  const { session, signOut } = useAuth()
  const [tab, setTab] = useState<Tab>('closet')

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="neo-border bg-yellow neo-shadow px-6 py-4 font-bold">
          Loading closet…
        </div>
      </div>
    )
  }

  const synced = Boolean(session)

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-beige border-b-2 border-black px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Digital Closet</h1>
            <p className="text-xs opacity-60">
              {synced ? `${session?.user.email} · synced` : 'Your wardrobe planner'}
            </p>
          </div>
          {synced && (
            <Button variant="ghost" onClick={() => signOut()} className="text-xs px-2 py-1 shrink-0">
              Sign out
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        {tab === 'closet' ? <ClosetView /> : <OutfitPlannerView />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t-2 border-black bg-beige">
        <div className="max-w-lg mx-auto grid grid-cols-2">
          <button
            type="button"
            onClick={() => setTab('closet')}
            className={`py-4 font-bold text-sm border-r-2 border-black ${
              tab === 'closet' ? 'bg-yellow' : 'bg-white'
            }`}
          >
            Closet
          </button>
          <button
            type="button"
            onClick={() => setTab('outfits')}
            className={`py-4 font-bold text-sm ${tab === 'outfits' ? 'bg-yellow' : 'bg-white'}`}
          >
            Outfits
          </button>
        </div>
      </nav>
    </div>
  )
}

function AppGate() {
  const requiresAuth = useRequiresAuth()
  const { loading, session } = useAuth()

  if (!requiresAuth) {
    return (
      <AppProvider>
        <AppContent />
      </AppProvider>
    )
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="neo-border bg-yellow neo-shadow px-6 py-4 font-bold">
          Loading…
        </div>
      </div>
    )
  }

  if (!session) {
    return <AuthScreen />
  }

  return (
    <AppProvider key={session.user.id}>
      <AppContent />
    </AppProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  )
}
