import { useRef } from 'react'
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
import type { ClothingItem } from '../../types'
import { ItemCard } from './ItemCard'

const LONG_PRESS = { delay: 450, tolerance: 8 }

interface SortableClosetGridProps {
  items: ClothingItem[]
  onOpenItem: (item: ClothingItem) => void
  onReorder: (orderedIds: string[]) => void
}

function SortableClosetItem({
  item,
  onOpen,
}: {
  item: ClothingItem
  onOpen: () => void
}) {
  const draggedRef = useRef(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  if (isDragging) draggedRef.current = true

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleOpen() {
    if (draggedRef.current) {
      draggedRef.current = false
      return
    }
    onOpen()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`touch-manipulation ${isDragging ? 'z-10 opacity-90 scale-[1.04]' : ''}`}
      {...attributes}
      {...listeners}
    >
      <ItemCard item={item} onClick={handleOpen} isDragging={isDragging} />
    </div>
  )
}

export function SortableClosetGrid({ items, onOpenItem, onReorder }: SortableClosetGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: LONG_PRESS }),
    useSensor(TouchSensor, { activationConstraint: LONG_PRESS })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    onReorder(reordered.map((item) => item.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <SortableClosetItem key={item.id} item={item} onOpen={() => onOpenItem(item)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
