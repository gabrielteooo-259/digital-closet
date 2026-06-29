import { removeBackground } from '@imgly/background-removal'
import { optimizePhotoForStorage, withTimeout } from './imageUtils'

const BACKGROUND_REMOVAL_TIMEOUT_MS = 20_000

export async function removeImageBackground(file: Blob): Promise<Blob> {
  const input = await optimizePhotoForStorage(file)
  const result = await withTimeout(
    removeBackground(input, {
      output: { format: 'image/png', quality: 0.85 },
    }),
    BACKGROUND_REMOVAL_TIMEOUT_MS,
    'Background removal timed out'
  )
  return optimizePhotoForStorage(result)
}

export async function preparePhotoForUpload(file: Blob): Promise<{ blob: Blob; skippedBackground: boolean }> {
  try {
    const blob = await removeImageBackground(file)
    return { blob, skippedBackground: false }
  } catch {
    const blob = await optimizePhotoForStorage(file).catch(() => file)
    return { blob, skippedBackground: true }
  }
}
