import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ClothingItem, Outfit } from '../../types'
import { OutfitCard } from './OutfitCard'

interface SortableOutfitGridProps {
  outfits: Outfit[]
  getItemsForOutfit: (outfit: Outfit) => ClothingItem[]
  onOpenOutfit: (outfit: Outfit) => void
  onReorder: (orderedIds: string[]) => void
}

function SortableOutfitCard({
  outfit,
  items,
  onOpen,
}: {
  outfit: Outfit
  items: ClothingItem[]
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: outfit.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'z-10 opacity-80' : undefined}>
      <OutfitCard
        outfit={outfit}
        items={items}
        onClick={onOpen}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

export function SortableOutfitGrid({
  outfits,
  getItemsForOutfit,
  onOpenOutfit,
  onReorder,
}: SortableOutfitGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = outfits.findIndex((o) => o.id === active.id)
    const newIndex = outfits.findIndex((o) => o.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(outfits, oldIndex, newIndex)
    onReorder(reordered.map((o) => o.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={outfits.map((o) => o.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3">
          {outfits.map((outfit) => (
            <SortableOutfitCard
              key={outfit.id}
              outfit={outfit}
              items={getItemsForOutfit(outfit)}
              onOpen={() => onOpenOutfit(outfit)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
