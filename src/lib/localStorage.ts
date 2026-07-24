import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ClothingItem, Outfit, Wardrobe } from '../types'
import { DEFAULT_WARDROBES } from '../types'
import { normalizeItemColor } from './colorDetection'
import { sortItemsForDisplay } from './itemOrder'
import type { Category } from '../types'

interface DigitalClosetDB extends DBSchema {
  photos: {
    key: string
    value: { id: string; blob: Blob }
  }
  items: {
    key: string
    value: ClothingItem
    indexes: { 'by-wardrobe': string }
  }
  folders: {
    key: string
    value: { id: string; name: string; createdAt: number }
  }
  outfits: {
    key: string
    value: StoredOutfit
    indexes: { 'by-folder': string }
  }
  meta: {
    key: string
    value: unknown
  }
}

const DB_NAME = 'digital-closet'
const DB_VERSION = 1
const OUTFIT_SCOPE_ID = 'outfits'

type StoredOutfit = Outfit & { folderId: string }

let dbPromise: Promise<IDBPDatabase<DigitalClosetDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<DigitalClosetDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('photos', { keyPath: 'id' })
        const items = db.createObjectStore('items', { keyPath: 'id' })
        items.createIndex('by-wardrobe', 'wardrobeId')
        db.createObjectStore('folders', { keyPath: 'id' })
        const outfits = db.createObjectStore('outfits', { keyPath: 'id' })
        outfits.createIndex('by-folder', 'folderId')
        db.createObjectStore('meta', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

export async function initStorage(): Promise<Wardrobe[]> {
  const db = await getDb()
  const existing = await db.get('meta', 'wardrobes')
  if (!existing || (existing as { value: Wardrobe[] }).value.length !== 1) {
    await db.put('meta', { key: 'wardrobes', value: DEFAULT_WARDROBES })
  }
  await migrateOutfitsToFlatList()
  return existing && (existing as { value: Wardrobe[] }).value.length === 1
    ? (existing as { key: string; value: Wardrobe[] }).value
    : DEFAULT_WARDROBES
}

export async function saveWardrobes(wardrobes: Wardrobe[]): Promise<void> {
  const db = await getDb()
  await db.put('meta', { key: 'wardrobes', value: wardrobes })
}

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  const db = await getDb()
  await db.put('photos', { id, blob })
}

export async function getPhoto(id: string): Promise<Blob | undefined> {
  const db = await getDb()
  const record = await db.get('photos', id)
  return record?.blob
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('photos', id)
}

export async function saveItem(item: ClothingItem): Promise<void> {
  const db = await getDb()
  await db.put('items', item)
}

function normalizeItem(raw: ClothingItem & { colors?: string[]; category?: string }): ClothingItem {
  const { colors: _legacy, ...item } = raw
  const legacyCategory = raw.category as string
  const category: ClothingItem['category'] =
    legacyCategory === 'accessories' ? 'cap' : (item.category as ClothingItem['category'])

  return {
    ...item,
    category,
    color: normalizeItemColor(raw as unknown as Record<string, unknown>),
    sortOrder: raw.sortOrder ?? raw.createdAt,
  }
}

export async function getItems(wardrobeId: string): Promise<ClothingItem[]> {
  const db = await getDb()
  const items = await db.getAllFromIndex('items', 'by-wardrobe', wardrobeId)
  return sortItemsForDisplay(items.map(normalizeItem))
}

export async function reorderItems(
  wardrobeId: string,
  category: Category,
  orderedIds: string[]
): Promise<void> {
  const items = await getItems(wardrobeId)
  const byId = new Map(items.map((item) => [item.id, item]))
  const db = await getDb()
  const tx = db.transaction('items', 'readwrite')
  await Promise.all(
    orderedIds.map((id, index) => {
      const item = byId.get(id)
      if (!item || item.category !== category) return Promise.resolve()
      return tx.objectStore('items').put({ ...item, sortOrder: index })
    })
  )
  await tx.done
}

export async function getAllItems(): Promise<ClothingItem[]> {
  const db = await getDb()
  const items = await db.getAll('items')
  return items.map(normalizeItem)
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('items', id)
}

async function migrateOutfitsToFlatList(): Promise<void> {
  const db = await getDb()
  const rawOutfits = await db.getAll('outfits')
  const folders = await db.getAll('folders')
  const needsMigration =
    folders.length > 0 || rawOutfits.some((outfit) => outfit.folderId !== OUTFIT_SCOPE_ID)

  if (!needsMigration) return

  const sorted = rawOutfits
    .map(normalizeOutfit)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt)

  const tx = db.transaction(['folders', 'outfits'], 'readwrite')
  await Promise.all([
    ...folders.map((folder) => tx.objectStore('folders').delete(folder.id)),
    ...sorted.map((outfit, index) =>
      tx.objectStore('outfits').put({
        ...outfit,
        folderId: OUTFIT_SCOPE_ID,
        sortOrder: index,
      })
    ),
    tx.done,
  ])
}

function normalizeOutfit(raw: Outfit & { folderId?: string; sortOrder?: number }): Outfit {
  const { folderId: _folderId, ...outfit } = raw
  return {
    ...outfit,
    sortOrder: raw.sortOrder ?? raw.createdAt,
  }
}

function compareOutfitOrder(a: Outfit, b: Outfit): number {
  return a.sortOrder - b.sortOrder
}

function withOutfitScope(outfit: Outfit): StoredOutfit {
  return { ...outfit, folderId: OUTFIT_SCOPE_ID }
}

export async function getAllOutfits(): Promise<Outfit[]> {
  const db = await getDb()
  const outfits = await db.getAll('outfits')
  return outfits.map(normalizeOutfit).sort(compareOutfitOrder)
}

export async function reorderOutfits(orderedIds: string[]): Promise<void> {
  const outfits = await getAllOutfits()
  const byId = new Map(outfits.map((o) => [o.id, o]))
  const db = await getDb()
  const tx = db.transaction('outfits', 'readwrite')
  await Promise.all(
    orderedIds.map((id, index) => {
      const outfit = byId.get(id)
      if (!outfit) return Promise.resolve()
      return tx.objectStore('outfits').put(withOutfitScope({ ...outfit, sortOrder: index }))
    })
  )
  await tx.done
}

export async function saveOutfit(outfit: Outfit): Promise<void> {
  const db = await getDb()
  await db.put('outfits', withOutfitScope(outfit))
}

export async function deleteOutfit(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('outfits', id)
}

export type ClosetBackup = {
  version: 1
  exportedAt: number
  wardrobes: Wardrobe[]
  items: ClothingItem[]
  outfits: Outfit[]
  photos: { id: string; mimeType: string; data: string }[]
  /** @deprecated Legacy field kept for older backup files. */
  folders?: { id: string; name: string; createdAt: number }[]
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Could not read photo data'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read photo data'))
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

export async function exportBackup(): Promise<ClosetBackup> {
  const db = await getDb()
  const wardrobes = await initStorage()
  const items = await getAllItems()
  const outfits = await getAllOutfits()
  const photoRecords = await db.getAll('photos')
  const photos = await Promise.all(
    photoRecords.map(async (record) => ({
      id: record.id,
      mimeType: record.blob.type || 'image/webp',
      data: await blobToBase64(record.blob),
    }))
  )

  return {
    version: 1,
    exportedAt: Date.now(),
    wardrobes,
    items,
    outfits,
    photos,
  }
}

export async function importBackup(backup: ClosetBackup): Promise<void> {
  if (backup.version !== 1) throw new Error('Unsupported backup file version')

  const db = await getDb()
  const tx = db.transaction(['photos', 'items', 'folders', 'outfits', 'meta'], 'readwrite')
  await Promise.all([
    tx.objectStore('photos').clear(),
    tx.objectStore('items').clear(),
    tx.objectStore('folders').clear(),
    tx.objectStore('outfits').clear(),
    tx.objectStore('meta').clear(),
  ])
  await tx.done

  await saveWardrobes(backup.wardrobes.length > 0 ? backup.wardrobes : DEFAULT_WARDROBES)

  for (const photo of backup.photos) {
    await savePhoto(photo.id, base64ToBlob(photo.data, photo.mimeType))
  }
  for (const item of backup.items) {
    await saveItem(normalizeItem(item))
  }
  const importedOutfits = backup.outfits
    .map(normalizeOutfit)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt)
  for (const [index, outfit] of importedOutfits.entries()) {
    await saveOutfit({ ...outfit, sortOrder: index })
  }
  await migrateOutfitsToFlatList()
}

export function downloadBackupFile(backup: ClosetBackup): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `digital-closet-backup-${new Date(backup.exportedAt).toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function parseBackupFile(file: File): Promise<ClosetBackup> {
  const text = await file.text()
  const parsed = JSON.parse(text) as ClosetBackup
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.items) || !Array.isArray(parsed.photos)) {
    throw new Error('Invalid backup file')
  }
  return parsed
}
