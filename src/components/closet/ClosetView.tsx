import { useMemo, useState } from 'react'
import { useApp } from '../../context/AppContext'
import type { Category, ClothingItem } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ItemCard } from './ItemCard'
import { ItemForm } from './ItemForm'
import { ItemFiltersBar, applyFilters, CategoryToggle, defaultFilters, isFiltersActive } from './ItemFilters'
import { SortableClosetGrid } from './SortableClosetGrid'

export function ClosetView() {
  const { wardrobeId, items, addItem, updateItem, removeItem, reorderItems } = useApp()

  const [filters, setFilters] = useState(defaultFilters)
  const [showFilters, setShowFilters] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<ClothingItem | null>(null)
  const [viewing, setViewing] = useState<ClothingItem | null>(null)

  const filtered = useMemo(() => applyFilters(items, filters), [items, filters])
  const canReorder =
    filters.category !== 'all' && !isFiltersActive(filters, { includeCategory: false })
  const activeCategory = filters.category !== 'all' ? (filters.category as Category) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <CategoryToggle filters={filters} onChange={setFilters} />

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold shrink-0">
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-1.5 items-center">
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className={`neo-btn p-2.5 shrink-0 ${isFiltersActive(filters, { includeCategory: false }) ? 'bg-yellow' : 'bg-white'}`}
              aria-label="Filter and search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>
            <Button onClick={() => setShowAdd(true)} className="shrink-0">
              + Add item
            </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="neo-border bg-white neo-shadow-sm p-8 text-center">
          <p className="font-semibold">No items yet</p>
          <p className="text-sm opacity-70 mt-1">Add your first piece to your closet.</p>
        </div>
      ) : canReorder && activeCategory ? (
        <>
          <p className="text-xs opacity-60">Long press an item to reorder</p>
          <SortableClosetGrid
            items={filtered}
            onOpenItem={setViewing}
            onReorder={(orderedIds) => reorderItems(activeCategory, orderedIds)}
          />
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} onClick={() => setViewing(item)} />
          ))}
        </div>
      )}

      <Modal open={showFilters} onClose={() => setShowFilters(false)} title="Filter & search">
        <div className="flex flex-col gap-4">
          <ItemFiltersBar items={items} filters={filters} onChange={setFilters} showCategory={false} />
          {isFiltersActive(filters) && (
            <Button variant="ghost" onClick={() => setFilters(defaultFilters)}>
              Clear filters
            </Button>
          )}
        </div>
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add clothing item">
        <ItemForm
          wardrobeId={wardrobeId}
          defaultCategory={activeCategory ?? 'top'}
          onCancel={() => setShowAdd(false)}
          onSubmit={async (data, blob) => {
            if (!blob) return
            await addItem({ ...data, wardrobeId }, blob)
            setShowAdd(false)
          }}
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit item">
        {editing && (
          <ItemForm
            initial={editing}
            wardrobeId={wardrobeId}
            onCancel={() => setEditing(null)}
            onSubmit={async (data, blob) => {
              await updateItem({ ...editing, ...data }, blob)
              setEditing(null)
            }}
          />
        )}
      </Modal>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.name || 'Item'}>
        {viewing && (
          <div className="flex flex-col gap-4">
            <ItemCard item={viewing} />
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="font-semibold">Category</dt>
              <dd className="capitalize">{viewing.category}</dd>
              <dt className="font-semibold">Season</dt>
              <dd>{viewing.season.join(', ') || '—'}</dd>
            </dl>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => { setEditing(viewing); setViewing(null) }}>
                Edit
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={async () => {
                  if (confirm('Delete this item?')) {
                    await removeItem(viewing.id)
                    setViewing(null)
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
