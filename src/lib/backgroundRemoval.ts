import { removeBackground } from '@imgly/background-removal'
import { optimizePhotoForStorage, resizeImageForProcessing, withTimeout } from './imageUtils'

const BACKGROUND_REMOVAL_TIMEOUT_MS = 90_000

export async function removeImageBackground(
  file: Blob,
  onProgress?: (message: string) => void
): Promise<Blob> {
  onProgress?.('Preparing photo…')
  const input = await resizeImageForProcessing(file)

  onProgress?.('Removing background…')
  const result = await withTimeout(
    removeBackground(input, {
      model: 'isnet_quint8',
      output: { format: 'image/png', quality: 0.9 },
      progress: (_key, current, total) => {
        if (total <= 0) return
        const pct = Math.round((current / total) * 100)
        onProgress?.(`Loading AI model… ${pct}%`)
      },
    }),
    BACKGROUND_REMOVAL_TIMEOUT_MS,
    'Background removal timed out'
  )

  onProgress?.('Saving cutout…')
  return optimizePhotoForStorage(result, { preserveTransparency: true })
}

export async function preparePhotoForUpload(
  file: Blob,
  onProgress?: (message: string) => void
): Promise<{ blob: Blob; skippedBackground: boolean }> {
  try {
    const blob = await removeImageBackground(file, onProgress)
    return { blob, skippedBackground: false }
  } catch {
    onProgress?.('Background removal unavailable — using original photo.')
    const blob = await optimizePhotoForStorage(file).catch(() => file)
    return { blob, skippedBackground: true }
  }
}
