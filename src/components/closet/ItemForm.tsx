import { useEffect, useRef, useState, type FormEvent } from 'react'
import { preparePhotoForUpload } from '../../lib/backgroundRemoval'
import { formatUploadError } from '../../lib/imageUtils'
import { categoryUsesSilhouetteAlign } from '../../lib/silhouettes'
import { getPhoto } from '../../lib/storage'
import type { Category, ClothingItem } from '../../types'
import { CATEGORIES } from '../../types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { PhotoAlignEditor } from './PhotoAlignEditor'

interface ItemFormProps {
  initial?: ClothingItem
  wardrobeId: string
  defaultCategory?: Category
  onSubmit: (
    data: Omit<ClothingItem, 'id' | 'createdAt' | 'photoId' | 'wardrobeId' | 'sortOrder'>,
    photoBlob?: Blob
  ) => Promise<void>
  onCancel: () => void
}

const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'

export function ItemForm({ initial, wardrobeId, defaultCategory, onSubmit, onCancel }: ItemFormProps) {
  const isEditing = !!initial
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<Category>(
    initial?.category ?? defaultCategory ?? 'top'
  )
  const [preview, setPreview] = useState<string | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [alignSource, setAlignSource] = useState<Blob | null>(null)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!defaultCategory || isEditing) return
    setCategory(defaultCategory)
  }, [defaultCategory, isEditing])

  useEffect(() => {
    if (!initial) return
    let objectUrl: string | null = null
    getPhoto(initial.photoId).then((blob) => {
      if (!blob) return
      objectUrl = URL.createObjectURL(blob)
      setPreview(objectUrl)
    })
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [initial])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function openPhotoPicker() {
    fileInputRef.current?.click()
  }

  function setPhotoPreview(blob: Blob) {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(blob))
    setPhotoBlob(blob)
    setAlignSource(null)
  }

  function startAlignStep(blob: Blob) {
    setAlignSource(blob)
    setPhotoBlob(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setNotice('Drag and resize to fit the outline.')
  }

  function finishProcessedPhoto(blob: Blob) {
    if (categoryUsesSilhouetteAlign(category)) {
      startAlignStep(blob)
      return
    }
    setPhotoPreview(blob)
    setNotice('Photo ready to save.')
  }

  async function handleFile(file: File) {
    setError('')
    setNotice('Preparing photo…')
    setProcessing(true)
    try {
      const { blob, skippedBackground } = await preparePhotoForUpload(file, setNotice)
      finishProcessedPhoto(blob)
      if (!skippedBackground && !categoryUsesSilhouetteAlign(category)) {
        setNotice('Background removed — ready to save.')
      }
    } catch {
      finishProcessedPhoto(file)
      setNotice('Using original photo.')
    } finally {
      setProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function buildPayload() {
    return {
      name: name.trim(),
      brand: initial?.brand ?? '',
      category,
      tags: initial?.tags ?? [],
      color: initial?.color ?? null,
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (alignSource) {
      setError('Finish aligning your photo first.')
      return
    }
    if (!initial && !photoBlob) {
      setError('Please add a photo first.')
      return
    }
    if (!wardrobeId) {
      setError('Wardrobe not loaded. Refresh the page and try again.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (initial && !photoBlob) {
        await onSubmit(buildPayload())
      } else {
        await onSubmit(buildPayload(), photoBlob!)
      }
    } catch (err) {
      setError(formatUploadError(err))
    } finally {
      setSaving(false)
    }
  }

  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label ?? category
  const needsAlign = Boolean(alignSource)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />

      {needsAlign && alignSource ? (
        <PhotoAlignEditor
          imageBlob={alignSource}
          category={category}
          onConfirm={(blob) => {
            setPhotoPreview(blob)
            setNotice('Photo aligned — ready to save.')
          }}
          onRetake={() => {
            setAlignSource(null)
            setNotice('')
            openPhotoPicker()
          }}
        />
      ) : (
        <div className="neo-border bg-white p-3">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full max-h-48 object-contain mx-auto" />
          ) : (
            <button
              type="button"
              onClick={openPhotoPicker}
              className="flex flex-col items-center justify-center gap-2 py-8 w-full cursor-pointer"
            >
              <span className="text-4xl">📷</span>
              <span className="font-semibold text-sm">Tap to add photo</span>
              <span className="text-xs opacity-60">Camera or photo library</span>
            </button>
          )}
          {processing && (
            <p className="text-center text-sm font-medium mt-2 animate-pulse">
              {notice || 'Removing background…'}
            </p>
          )}
          {preview && !processing && (
            <button
              type="button"
              onClick={openPhotoPicker}
              className="block w-full text-center mt-2 text-sm font-medium underline"
            >
              Change photo
            </button>
          )}
        </div>
      )}

      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Blue linen shirt" />

      {!isEditing && defaultCategory ? (
        <p className="text-sm">
          <span className="font-medium">Category:</span>{' '}
          <span className="bg-yellow neo-border px-2 py-0.5 text-xs font-semibold inline-block">
            {categoryLabel}
          </span>
          <span className="block text-xs opacity-60 mt-1">
            Switch the category tab above before adding if you want a different one.
          </span>
        </p>
      ) : (
        <fieldset>
          <legend className="text-sm font-medium mb-2">Category</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`neo-btn px-3 py-1.5 text-sm ${
                  category === c.value ? 'bg-yellow' : 'bg-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {notice && !processing && !needsAlign && <p className="text-sm text-black/70 font-medium">{notice}</p>}
      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving || processing || needsAlign || (!initial && !photoBlob)}
          className="flex-1"
        >
          {saving ? 'Saving…' : processing ? 'Processing…' : initial ? 'Update' : 'Add item'}
        </Button>
      </div>
      <input type="hidden" value={wardrobeId} readOnly />
    </form>
  )
}
