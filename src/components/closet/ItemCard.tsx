import { usePhotoUrl } from '../../hooks/usePhotoUrl'
import type { ClothingItem } from '../../types'

interface ItemCardProps {
  item: ClothingItem
  onClick?: () => void
  selected?: boolean
  compact?: boolean
  isDragging?: boolean
}

export function ItemCard({ item, onClick, selected, compact, isDragging }: ItemCardProps) {
  const photoUrl = usePhotoUrl(item.photoId)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left w-full bg-transparent transition-transform ${
        isDragging ? 'shadow-lg' : 'active:scale-[0.98]'
      } ${selected ? 'ring-4 ring-yellow ring-offset-2 ring-offset-beige' : ''} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div
        className={`${compact ? 'aspect-[10/7]' : 'aspect-[3/2.8]'} overflow-hidden flex items-center justify-center`}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={item.name || 'Clothing item'}
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        ) : (
          <span className="text-xs text-black/40">Loading…</span>
        )}
      </div>
    </button>
  )
}
