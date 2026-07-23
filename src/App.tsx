import { useState } from 'react'
import { ClosetView } from './components/closet/ClosetView'
import { OutfitPlannerView } from './components/outfits/OutfitPlannerView'
import { BackupMenu } from './components/BackupMenu'
import { AppProvider, useApp } from './context/AppContext'

type Tab = 'closet' | 'outfits'

function AppContent() {
  const { loading, reloadAll } = useApp()
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

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-beige border-b-2 border-black px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Digital Closet</h1>
            <p className="text-xs opacity-60">Saved on this device</p>
          </div>
          <BackupMenu onImported={reloadAll} />
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

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
