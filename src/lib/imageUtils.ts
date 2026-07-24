const MAX_DIMENSION = 1200
const WEBP_QUALITY = 0.82
const JPEG_QUALITY = 0.85

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms)
    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        window.clearTimeout(timer)
        reject(err)
      })
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality)
  })
}

/** Resize large photos before AI processing without stripping transparency. */
export async function resizeImageForProcessing(blob: Blob, maxDimension = 1024): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob)
    const longest = Math.max(bitmap.width, bitmap.height)
    if (longest <= maxDimension) {
      bitmap.close()
      return blob
    }

    const scale = maxDimension / longest
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return blob
    }

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const png = await canvasToBlob(canvas, 'image/png')
    return png && png.size > 0 ? png : blob
  } catch {
    return blob
  }
}

/** Resize and compress photos before storage to reduce quota use and mobile memory pressure. */
export async function optimizePhotoForStorage(
  blob: Blob,
  options?: { preserveTransparency?: boolean }
): Promise<Blob> {
  if (
    !options?.preserveTransparency &&
    blob.size < 200_000 &&
    (blob.type === 'image/webp' || blob.type === 'image/jpeg')
  ) {
    return blob
  }

  try {
    const bitmap = await createImageBitmap(blob)
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return blob
    }

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    if (options?.preserveTransparency) {
      const webp = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY)
      if (webp && webp.size > 0) return webp

      const png = await canvasToBlob(canvas, 'image/png')
      if (png && png.size > 0) return png
      return blob
    }

    const webp = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY)
    if (webp && webp.size > 0) return webp

    const jpeg = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)
    if (jpeg && jpeg.size > 0) return jpeg
  } catch {
    // HEIC / unsupported formats — use original file as-is
  }

  return blob
}

export function formatUploadError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()

  if (lower.includes('quota') || lower.includes('quotaexceedederror')) {
    return 'This device is out of storage space. Delete some items or export a backup.'
  }
  if (lower.includes('payload too large') || lower.includes('entity too large')) {
    return 'Photo is too large. Try a smaller image or retake the photo.'
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Save failed — check your connection and try again.'
  }

  return message || 'Could not save item. Please try again.'
}
