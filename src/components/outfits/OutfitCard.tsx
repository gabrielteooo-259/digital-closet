import type { HTMLAttributes } from 'react'
import type { ClothingItem, Outfit } from '../../types'
import { OUTFIT_CATEGORY_ORDER } from '../../types'
import { ItemCard } from '../closet/ItemCard'

export function sortOutfitItems(items: ClothingItem[]): ClothingItem[] {
  return [...items].sort(
    (a, b) => OUTFIT_CATEGORY_ORDER.indexOf(a.category) - OUTFIT_CATEGORY_ORDER.indexOf(b.category)
  )
}

function isCompactOutfitCategory(category: ClothingItem['category']) {
  return category === 'cap' || category === 'shoes'
}

function OutfitItemSlot({ item, compact }: { item: ClothingItem; compact?: boolean }) {
  const small = isCompactOutfitCategory(item.category)

  return (
    <div className="w-full flex justify-center">
      <div className={small ? 'w-1/2' : 'w-full'}>
        <ItemCard item={item} compact={compact} />
      </div>
    </div>
  )
}

interface OutfitCardProps {
  outfit: Outfit
  items: ClothingItem[]
  onClick?: () => void
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>
  isDragging?: boolean
}

export function OutfitCard({
  outfit,
  items,
  onClick,
  dragHandleProps,
  isDragging,
}: OutfitCardProps) {
  const sortedItems = sortOutfitItems(items)

  return (
    <div className={`w-full text-left bg-transparent min-w-0 ${isDragging ? 'scale-[1.02]' : ''}`}>
      <div className="border border-black/20 p-2">
        <div className="flex items-center gap-1 mb-2 min-w-0">
          <button
            type="button"
            onClick={onClick}
            className="font-bold text-sm truncate flex-1 text-left min-w-0"
          >
            {outfit.name}
          </button>
          {dragHandleProps && (
            <button
              type="button"
              {...dragHandleProps}
              className="shrink-0 p-1 cursor-grab active:cursor-grabbing touch-none text-black/50"
              aria-label="Drag to reorder outfit"
              onClick={(e) => e.stopPropagation()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <circle cx="9" cy="6" r="1.5" />
                <circle cx="15" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" />
                <circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" />
                <circle cx="15" cy="18" r="1.5" />
              </svg>
            </button>
          )}
        </div>
        <button type="button" onClick={onClick} className="w-full text-left">
          <div className="flex flex-col gap-1">
            {sortedItems.map((item) => (
              <OutfitItemSlot key={item.id} item={item} compact />
            ))}
          </div>
        </button>
      </div>
    </div>
  )
}

interface OutfitItemsStackProps {
  items: ClothingItem[]
}

export function OutfitItemsStack({ items }: OutfitItemsStackProps) {
  const sortedItems = sortOutfitItems(items)

  return (
    <div className="border border-black/20 p-3 flex flex-col gap-2 items-center max-w-[220px] mx-auto">
      {sortedItems.map((item) => (
        <OutfitItemSlot key={item.id} item={item} />
      ))}
    </div>
  )
}
