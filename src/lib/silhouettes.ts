import type { Category } from '../types'

export const ALIGN_CANVAS_SIZE = 800

/** Centered square where the garment should sit (normalized 0–1). */
const SQUARE_FIT_BOX = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }

export interface SilhouetteGuide {
  /** Normalized area (0–1) where the garment should sit inside the canvas. */
  fitBox: { x: number; y: number; width: number; height: number }
  label: string
}

export const SILHOUETTE_GUIDES: Record<Category, SilhouetteGuide> = {
  top: { label: 'Top', fitBox: SQUARE_FIT_BOX },
  bottom: { label: 'Bottom', fitBox: SQUARE_FIT_BOX },
  shoes: { label: 'Shoes', fitBox: SQUARE_FIT_BOX },
  cap: { label: 'Cap', fitBox: SQUARE_FIT_BOX },
}

export function categoryUsesSilhouetteAlign(category: Category): boolean {
  return category in SILHOUETTE_GUIDES
}

export function getFitRect(canvasSize: number, guide: SilhouetteGuide) {
  return {
    x: guide.fitBox.x * canvasSize,
    y: guide.fitBox.y * canvasSize,
    width: guide.fitBox.width * canvasSize,
    height: guide.fitBox.height * canvasSize,
  }
}

export function drawSilhouetteGuide(
  ctx: CanvasRenderingContext2D,
  category: Category,
  canvasSize: number
) {
  const guide = SILHOUETTE_GUIDES[category]
  const rect = getFitRect(canvasSize, guide)

  ctx.save()
  ctx.strokeStyle = '#e53935'
  ctx.lineWidth = 3
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.setLineDash([8, 5])
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
  ctx.restore()
}
