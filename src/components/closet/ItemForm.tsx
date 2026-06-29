import { useEffect, useState, type FormEvent } from 'react'
import { removeImageBackground } from '../../lib/backgroundRemoval'
import { getPhoto } from '../../lib/storage'
import type { Category, ClothingItem, Season } from '../../types'
import { CATEGORIES, SEASONS } from '../../types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

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

export function ItemForm({ initial, wardrobeId, defaultCategory, onSubmit, onCancel }: ItemFormProps) {
  const isEditing = !!initial
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<Category>(
    initial?.category ?? defaultCategory ?? 'top'
  )
  const [season, setSeason] = useState<Season[]>(initial?.season ?? [])
  const [preview, setPreview] = useState<string | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  async function handleFile(file: File) {
    setError('')
    setProcessing(true)
    try {
      const noBg = await removeImageBackground(file)
      if (preview) URL.revokeObjectURL(preview)
      setPreview(URL.createObjectURL(noBg))
      setPhotoBlob(noBg)
    } catch {
      setError('Could not process image. Using original photo.')
      if (preview) URL.revokeObjectURL(preview)
      setPreview(URL.createObjectURL(file))
      setPhotoBlob(file)
    } finally {
      setProcessing(false)
    }
  }

  function toggleSeason(s: Season) {
    setSeason((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  function buildPayload() {
    return {
      name: name.trim(),
      brand: initial?.brand ?? '',
      category,
      season,
      tags: initial?.tags ?? [],
      color: initial?.color ?? null,
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!initial && !photoBlob) {
      setError('Please upload a photo.')
      return
    }
    setSaving(true)
    try {
      if (initial && !photoBlob) {
        await onSubmit(buildPayload())
      } else {
        await onSubmit(buildPayload(), photoBlob!)
      }
    } finally {
      setSaving(false)
    }
  }

  const categoryLabel = CATEGORIES.find((c) => c.value === category)?.label ?? category

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="neo-border bg-white p-3">
        {preview ? (
          <img src={preview} alt="Preview" className="w-full max-h-48 object-contain mx-auto" />
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 py-8 cursor-pointer">
            <span className="text-4xl">📷</span>
            <span className="font-semibold text-sm">Tap to upload photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </label>
        )}
        {processing && (
          <p className="text-center text-sm font-medium mt-2 animate-pulse">Removing background…</p>
        )}
        {preview && !processing && (
          <label className="block text-center mt-2 text-sm font-medium underline cursor-pointer">
            Change photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </label>
        )}
      </div>

      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Blue linen shirt" />

      {!isEditing && defaultCategory ? (
        <p className="text-sm">
          <span className="font-medium">Category:</span>{' '}
          <span className="bg-yellow neo-border px-2 py-0.5 text-xs font-semibold inline-block">
            {categoryLabel}
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

      <fieldset>
        <legend className="text-sm font-medium mb-2">Season</legend>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleSeason(s.value)}
              className={`neo-btn px-3 py-1.5 text-sm ${
                season.includes(s.value) ? 'bg-yellow' : 'bg-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving || processing || (!initial && !photoBlob)}
          className="flex-1"
        >
          {saving ? 'Saving…' : initial ? 'Update' : 'Add item'}
        </Button>
      </div>
      <input type="hidden" value={wardrobeId} readOnly />
    </form>
  )
}
