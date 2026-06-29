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
  if (!existing) {
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
