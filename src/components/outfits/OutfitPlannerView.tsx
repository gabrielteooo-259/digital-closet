import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { ClothingItem, Outfit } from '../../types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { ItemCard } from '../closet/ItemCard'
import { applyFilters, defaultFilters, ItemFiltersBar } from '../closet/ItemFilters'
import { OutfitItemsStack } from './OutfitCard'
import { SortableOutfitGrid } from './SortableOutfitGrid'

export function OutfitPlannerView() {
  const {
    allItems,
    folders,
    outfitsByFolder,
    addFolder,
    removeFolder,
    addOutfit,
    updateOutfit,
    removeOutfit,
    reorderOutfits,
  } = useApp()

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null)
  const [viewingOutfit, setViewingOutfit] = useState<Outfit | null>(null)
  const [outfitName, setOutfitName] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filters, setFilters] = useState(defaultFilters)

  const activeFolder = folders.find((f) => f.id === activeFolderId)
  const folderOutfits = activeFolderId ? (outfitsByFolder[activeFolderId] ?? []) : []

  const builderItems = useMemo(() => applyFilters(allItems, filters), [allItems, filters])

  function openBuilder(outfit?: Outfit) {
    if (outfit) {
      setEditingOutfit(outfit)
      setOutfitName(outfit.name)
      setSelectedIds(outfit.itemIds)
    } else {
      setEditingOutfit(null)
      setOutfitName('')
      setSelectedIds([])
    }
    setShowBuilder(true)
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function saveOutfit() {
    if (!activeFolderId || !outfitName.trim() || selectedIds.length === 0) return
    if (editingOutfit) {
      await updateOutfit({ ...editingOutfit, name: outfitName.trim(), itemIds: selectedIds })
    } else {
      await addOutfit(activeFolderId, outfitName.trim(), selectedIds)
    }
    setShowBuilder(false)
    setEditingOutfit(null)
  }

  async function handleNewFolder() {
    if (!folderName.trim()) return
    await addFolder(folderName.trim())
    setFolderName('')
    setShowNewFolder(false)
  }

  function getItemsForOutfit(outfit: Outfit): ClothingItem[] {
    return outfit.itemIds
      .map((id) => allItems.find((i) => i.id === id))
      .filter((i): i is ClothingItem => !!i)
  }

  if (!activeFolderId) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Outfit folders</h2>
            <p className="text-sm opacity-70">Organize outfits for trips & events</p>
          </div>
          <Button onClick={() => setShowNewFolder(true)}>+ Folder</Button>
        </div>

        {folders.length === 0 ? (
          <div className="neo-border bg-white neo-shadow-sm p-8 text-center">
            <p className="font-semibold">No folders yet</p>
            <p className="text-sm opacity-70 mt-1">Create a folder for your next trip or event.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {folders.map((folder) => {
              const count = (outfitsByFolder[folder.id] ?? []).length
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setActiveFolderId(folder.id)}
                  className="neo-border bg-white neo-shadow-sm p-4 text-left active:translate-x-0.5 active:translate-y-0.5"
                >
                  <p className="font-bold">{folder.name}</p>
                  <p className="text-sm opacity-70">{count} outfit{count !== 1 ? 's' : ''}</p>
                </button>
              )
            })}
          </div>
        )}

        <Modal open={showNewFolder} onClose={() => setShowNewFolder(false)} title="New folder">
          <div className="flex flex-col gap-4">
            <Input
              label="Folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Japan trip, Wedding"
            />
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setShowNewFolder(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleNewFolder}>
                Create
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setActiveFolderId(null)}
        className="text-sm font-semibold underline text-left"
      >
        ← All folders
      </button>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold truncate">{activeFolder?.name}</h2>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={() => openBuilder()}>
            + Outfit
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (confirm('Delete this folder and all its outfits?')) {
                await removeFolder(activeFolderId)
                setActiveFolderId(null)
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      {folderOutfits.length === 0 ? (
        <div className="neo-border bg-white neo-shadow-sm p-8 text-center">
          <p className="font-semibold">No outfits saved</p>
          <p className="text-sm opacity-70 mt-1">Build an outfit from your closet items.</p>
        </div>
      ) : (
        <>
          <p className="text-xs opacity-60 -mt-2">Drag ⋮⋮ to reorder outfits</p>
          <SortableOutfitGrid
            outfits={folderOutfits}
            getItemsForOutfit={getItemsForOutfit}
            onOpenOutfit={setViewingOutfit}
            onReorder={(orderedIds) => reorderOutfits(activeFolderId, orderedIds)}
          />
        </>
      )}

      <Modal
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        title={editingOutfit ? 'Edit outfit' : 'New outfit'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Outfit name"
            value={outfitName}
            onChange={(e) => setOutfitName(e.target.value)}
            placeholder="e.g. Day 1 sightseeing"
          />

          <ItemFiltersBar items={allItems} filters={filters} onChange={setFilters} />

          <p className="text-sm font-semibold">
            Selected: {selectedIds.length} · Tap items to add/remove
          </p>

          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {builderItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                compact
                selected={selectedIds.includes(item.id)}
                onClick={() => toggleItem(item.id)}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShowBuilder(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!outfitName.trim() || selectedIds.length === 0}
              onClick={saveOutfit}
            >
              Save outfit
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!viewingOutfit}
        onClose={() => setViewingOutfit(null)}
        title={viewingOutfit?.name ?? 'Outfit'}
      >
        {viewingOutfit && (
          <div className="flex flex-col gap-4">
            <OutfitItemsStack items={getItemsForOutfit(viewingOutfit)} />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  openBuilder(viewingOutfit)
                  setViewingOutfit(null)
                }}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={async () => {
                  if (confirm('Delete this outfit?')) {
                    await removeOutfit(viewingOutfit.id, viewingOutfit.folderId)
                    setViewingOutfit(null)
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
