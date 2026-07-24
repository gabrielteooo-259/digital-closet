import type { Category } from '../types'
import {
  ALIGN_CANVAS_SIZE,
  drawSilhouetteGuide,
  getFitRect,
  SILHOUETTE_GUIDES,
} from './silhouettes'

export interface PhotoAlignTransform {
  scale: number
  offsetX: number
  offsetY: number
}

export async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not load image'))
      image.src = url
    })
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function getDefaultTransform(
  image: HTMLImageElement,
  category: Category,
  canvasSize = ALIGN_CANVAS_SIZE
): PhotoAlignTransform {
  const guide = SILHOUETTE_GUIDES[category]
  const fit = getFitRect(canvasSize, guide)
  const scale = Math.min(fit.width / image.width, fit.height / image.height) * 0.92
  return {
    scale,
    offsetX: fit.x + fit.width / 2,
    offsetY: fit.y + fit.height / 2,
  }
}

export function renderAlignedPhoto(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  category: Category,
  transform: PhotoAlignTransform,
  options?: { showGuide?: boolean }
) {
  const size = canvas.width
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, size, size)

  ctx.save()
  ctx.translate(transform.offsetX, transform.offsetY)
  ctx.scale(transform.scale, transform.scale)
  ctx.drawImage(image, -image.width / 2, -image.height / 2)
  ctx.restore()

  if (options?.showGuide !== false) {
    drawSilhouetteGuide(ctx, category, size)
  }
}

export async function exportAlignedPhoto(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  category: Category,
  transform: PhotoAlignTransform
): Promise<Blob> {
  renderAlignedPhoto(canvas, image, category, transform, { showGuide: false })

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })

  if (!blob) throw new Error('Could not export aligned photo')
  return blob
}
