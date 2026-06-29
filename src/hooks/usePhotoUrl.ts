import { useEffect, useState } from 'react'
import { getPhoto } from '../lib/storage'

export function usePhotoUrl(photoId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!photoId) {
      setUrl(null)
      return
    }

    let objectUrl: string | null = null
    let cancelled = false

    getPhoto(photoId).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])

  return url
}
