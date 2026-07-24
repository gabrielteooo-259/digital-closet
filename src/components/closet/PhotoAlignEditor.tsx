import { useEffect, useRef, useState } from 'react'
import type { Category } from '../../types'
import { SILHOUETTE_GUIDES } from '../../lib/silhouettes'
import {
  exportAlignedPhoto,
  getDefaultTransform,
  loadImageFromBlob,
  renderAlignedPhoto,
  type PhotoAlignTransform,
} from '../../lib/photoAlign'
import { Button } from '../ui/Button'

interface PhotoAlignEditorProps {
  imageBlob: Blob
  category: Category
  onConfirm: (blob: Blob) => void
  onRetake: () => void
}

export function PhotoAlignEditor({ imageBlob, category, onConfirm, onRetake }: PhotoAlignEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(
    null
  )

  const [transform, setTransform] = useState<PhotoAlignTransform | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    loadImageFromBlob(imageBlob)
      .then((image) => {
        if (cancelled) return
        imageRef.current = image
        const initial = getDefaultTransform(image, category)
        setTransform(initial)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [imageBlob, category])

  useEffect(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || !transform) return
    renderAlignedPhoto(canvas, image, category, transform)
  }, [transform, category])

  function updateScale(nextPercent: number) {
    if (!transform) return
    setTransform({ ...transform, scale: nextPercent / 100 })
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!transform) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.offsetX,
      originY: transform.offsetY,
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const rect = event.currentTarget.getBoundingClientRect()
    const scaleFactor = event.currentTarget.width / rect.width
    const dx = (event.clientX - drag.startX) * scaleFactor
    const dy = (event.clientY - drag.startY) * scaleFactor

    setTransform((prev) =>
      prev
        ? {
            ...prev,
            offsetX: drag.originX + dx,
            offsetY: drag.originY + dy,
          }
        : prev
    )
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  async function handleConfirm() {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || !transform) return

    setBusy(true)
    try {
      const blob = await exportAlignedPhoto(canvas, image, category, transform)
      onConfirm(blob)
    } finally {
      setBusy(false)
    }
  }

  const guide = SILHOUETTE_GUIDES[category]

  return (
    <div className="flex flex-col gap-3">
      <div className="neo-border bg-white p-2">
        <p className="text-xs font-medium mb-2 text-center">
          Fit your {guide.label.toLowerCase()} inside the red square
        </p>
        <div className="relative mx-auto w-full max-w-[320px] aspect-square bg-[#f3f3f3] neo-border">
          <canvas
            ref={canvasRef}
            width={800}
            height={800}
            className={`w-full h-full touch-none ${loading ? 'opacity-30' : 'opacity-100'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
              Loading…
            </div>
          )}
        </div>
      </div>

      <label className="text-sm font-medium">
        Size
        <input
          type="range"
          min={10}
          max={150}
          step={1}
          value={Math.round((transform?.scale ?? 0.5) * 100)}
          onChange={(e) => updateScale(Number(e.target.value))}
          className="w-full mt-1 accent-black"
          disabled={loading || busy}
        />
      </label>

      <p className="text-xs opacity-60">Drag the photo to move it. Use the slider to resize.</p>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onRetake} disabled={busy}>
          Retake
        </Button>
        <Button type="button" className="flex-1" onClick={handleConfirm} disabled={loading || busy || !transform}>
          {busy ? 'Saving…' : 'Done aligning'}
        </Button>
      </div>
    </div>
  )
}
