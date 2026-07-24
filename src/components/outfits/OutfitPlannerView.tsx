import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { ClothingItem, Outfit } from '../../types'
import { OUTFIT_CATEGORY_ORDER } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ItemCard } from '../closet/ItemCard'
import { OutfitItemsStack } from './OutfitCard'
import { SortableOutfitGrid } from './SortableOutfitGrid'

function sortItemsForPicker(items: ClothingItem[]): ClothingItem[] {
  return [...items].sort(
    (a, b) => OUTFIT_CATEGORY_ORDER.indexOf(a.category) - OUTFIT_CATEGORY_ORDER.indexOf(b.category)
  )
}

export function OutfitPlannerView() {
  const { allItems, outfits, addOutfit, updateOutfit, removeOutfit, reorderOutfits } = useApp()

  const [showBuilder, setShowBuilder] = useState(false)
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null)
  const [viewingOutfit, setViewingOutfit] = useState<Outfit | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const pickerItems = useMemo(() => sortItemsForPicker(allItems), [allItems])

  function openBuilder(outfit?: Outfit) {
    if (outfit) {
      setEditingOutfit(outfit)
      setSelectedIds(outfit.itemIds)
    } else {
      setEditingOutfit(null)
      setSelectedIds([])
    }
    setShowBuilder(true)
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function nextOutfitName() {
    return `Outfit ${outfits.length + 1}`
  }

  async function saveOutfit() {
    if (selectedIds.length === 0) return
    if (editingOutfit) {
      await updateOutfit({ ...editingOutfit, itemIds: selectedIds })
    } else {
      await addOutfit(nextOutfitName(), selectedIds)
    }
    setShowBuilder(false)
    setEditingOutfit(null)
  }

  function getItemsForOutfit(outfit: Outfit): ClothingItem[] {
    return outfit.itemIds
      .map((id) => allItems.find((i) => i.id === id))
      .filter((i): i is ClothingItem => !!i)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Outfits</h2>
          <p className="text-sm opacity-70">Build and save looks from your closet</p>
        </div>
        <Button onClick={() => openBuilder()}>+ Outfit</Button>
      </div>

      {outfits.length === 0 ? (
        <div className="neo-border bg-white neo-shadow-sm p-8 text-center">
          <p className="font-semibold">No outfits saved</p>
          <p className="text-sm opacity-70 mt-1">Build an outfit from your closet items.</p>
        </div>
      ) : (
        <>
          <p className="text-xs opacity-60 -mt-2">Drag ⋮⋮ to reorder outfits</p>
          <SortableOutfitGrid
            outfits={outfits}
            getItemsForOutfit={getItemsForOutfit}
            onOpenOutfit={setViewingOutfit}
            onReorder={reorderOutfits}
          />
        </>
      )}

      <Modal
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        title={editingOutfit ? 'Edit outfit' : 'New outfit'}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
            {pickerItems.map((item) => (
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
            <Button className="flex-1" disabled={selectedIds.length === 0} onClick={saveOutfit}>
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
                    await removeOutfit(viewingOutfit.id)
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
