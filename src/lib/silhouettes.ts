import type { Category } from '../types'

export const ALIGN_CANVAS_SIZE = 800

export interface SilhouetteGuide {
  path: string
  viewBox: { width: number; height: number }
  /** Normalized area (0–1) where the garment should sit inside the canvas. */
  fitBox: { x: number; y: number; width: number; height: number }
  label: string
}

export const SILHOUETTE_GUIDES: Record<Category, SilhouetteGuide> = {
  top: {
    label: 'Top',
    viewBox: { width: 100, height: 110 },
    path: [
      'M 50 7',
      'C 44 7 40 10 38 14',
      'L 30 16 L 12 24 L 8 40 L 10 44 L 10 98',
      'L 90 98 L 90 44 L 92 40 L 88 24 L 70 16 L 62 14',
      'C 60 10 56 7 50 7 Z',
    ].join(' '),
    fitBox: { x: 0.12, y: 0.12, width: 0.76, height: 0.84 },
  },
  bottom: {
    label: 'Bottom',
    viewBox: { width: 100, height: 120 },
    path: [
      'M 28 8 L 72 8 L 78 22 L 58 24 L 58 112',
      'L 42 112 L 42 24 L 22 22 Z',
    ].join(' '),
    fitBox: { x: 0.22, y: 0.08, width: 0.56, height: 0.9 },
  },
  shoes: {
    label: 'Shoes',
    viewBox: { width: 120, height: 70 },
    path: [
      'M 12 42 L 24 34 L 48 28 L 88 26 L 104 32 L 108 40',
      'L 104 48 L 88 52 L 48 54 L 24 52 L 12 48 Z',
    ].join(' '),
    fitBox: { x: 0.08, y: 0.32, width: 0.84, height: 0.42 },
  },
  cap: {
    label: 'Cap',
    viewBox: { width: 110, height: 70 },
    path: [
      'M 18 38 L 28 24 L 55 18 L 82 24 L 92 38',
      'L 96 44 L 88 48 L 55 50 L 22 48 L 14 44 Z',
    ].join(' '),
    fitBox: { x: 0.12, y: 0.2, width: 0.76, height: 0.52 },
  },
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
  const padding = canvasSize * 0.08
  const scale = Math.min(
    (canvasSize - padding * 2) / guide.viewBox.width,
    (canvasSize - padding * 2) / guide.viewBox.height
  )
  const offsetX = (canvasSize - guide.viewBox.width * scale) / 2
  const offsetY = (canvasSize - guide.viewBox.height * scale) / 2

  ctx.save()
  ctx.translate(offsetX, offsetY)
  ctx.scale(scale, scale)

  const path = new Path2D(guide.path)
  ctx.strokeStyle = '#e53935'
  ctx.lineWidth = 2.8 / scale
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.setLineDash([6 / scale, 4 / scale])
  ctx.stroke(path)
  ctx.restore()
}
