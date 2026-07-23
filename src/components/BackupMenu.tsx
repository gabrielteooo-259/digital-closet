import { useRef, useState } from 'react'
import { downloadBackupFile, exportBackup, importBackup, parseBackupFile } from '../lib/storage'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'

interface BackupMenuProps {
  onImported: () => Promise<void>
}

export function BackupMenu({ onImported }: BackupMenuProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmImport, setConfirmImport] = useState<File | null>(null)

  async function handleExport() {
    setError('')
    setBusy(true)
    try {
      const backup = await exportBackup()
      downloadBackupFile(backup)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(file: File) {
    setError('')
    setBusy(true)
    try {
      const backup = await parseBackupFile(file)
      await importBackup(backup)
      await onImported()
      setConfirmImport(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" onClick={handleExport} disabled={busy} className="text-xs px-2 py-1">
          Export
        </Button>
        <Button
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="text-xs px-2 py-1"
        >
          Import
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setConfirmImport(file)
        }}
      />

      <Modal open={!!confirmImport} onClose={() => setConfirmImport(null)} title="Import backup?">
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            This replaces your current closet with the backup file. Export first if you want to keep a copy.
          </p>
          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmImport(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={busy || !confirmImport}
              onClick={() => confirmImport && handleImport(confirmImport)}
            >
              {busy ? 'Importing…' : 'Import'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
