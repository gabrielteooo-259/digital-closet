import { removeBackground } from '@imgly/background-removal'

export async function removeImageBackground(file: Blob): Promise<Blob> {
  const result = await removeBackground(file, {
    output: { format: 'image/png', quality: 0.9 },
  })
  return result
}
