import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ClothingItem, Outfit, OutfitFolder, Wardrobe } from '../types'
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
    value: OutfitFolder
  }
  outfits: {
    key: string
    value: Outfit
    indexes: { 'by-folder': string }
  }
  meta: {
    key: string
    value: unknown
  }
}

const DB_NAME = 'digital-closet'
const DB_VERSION = 1

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
    return DEFAULT_WARDROBES
  }
  return (existing as { key: string; value: Wardrobe[] }).value
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

export async function getFolders(): Promise<OutfitFolder[]> {
  const db = await getDb()
  return db.getAll('folders')
}

export async function saveFolder(folder: OutfitFolder): Promise<void> {
  const db = await getDb()
  await db.put('folders', folder)
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDb()
  const outfits = await db.getAllFromIndex('outfits', 'by-folder', id)
  const tx = db.transaction(['folders', 'outfits'], 'readwrite')
  await Promise.all([
    ...outfits.map((o) => tx.objectStore('outfits').delete(o.id)),
    tx.objectStore('folders').delete(id),
    tx.done,
  ])
}

export async function getOutfits(folderId: string): Promise<Outfit[]> {
  const db = await getDb()
  const outfits = await db.getAllFromIndex('outfits', 'by-folder', folderId)
  return outfits.map(normalizeOutfit).sort(compareOutfitOrder)
}

function normalizeOutfit(raw: Outfit & { sortOrder?: number }): Outfit {
  return {
    ...raw,
    sortOrder: raw.sortOrder ?? raw.createdAt,
  }
}

function compareOutfitOrder(a: Outfit, b: Outfit): number {
  return a.sortOrder - b.sortOrder
}

export async function reorderOutfits(folderId: string, orderedIds: string[]): Promise<void> {
  const db = await getDb()
  const outfits = await getOutfits(folderId)
  const byId = new Map(outfits.map((o) => [o.id, o]))
  const tx = db.transaction('outfits', 'readwrite')
  await Promise.all(
    orderedIds.map((id, index) => {
      const outfit = byId.get(id)
      if (!outfit) return Promise.resolve()
      return tx.objectStore('outfits').put({ ...outfit, sortOrder: index })
    })
  )
  await tx.done
}

export async function saveOutfit(outfit: Outfit): Promise<void> {
  const db = await getDb()
  await db.put('outfits', outfit)
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
  folders: OutfitFolder[]
  outfits: Outfit[]
  photos: { id: string; mimeType: string; data: string }[]
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
  const folders = await getFolders()
  const outfits = (await db.getAll('outfits')).map(normalizeOutfit)
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
    folders,
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
  for (const folder of backup.folders) {
    await saveFolder(folder)
  }
  for (const outfit of backup.outfits) {
    await saveOutfit(normalizeOutfit(outfit))
  }
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
