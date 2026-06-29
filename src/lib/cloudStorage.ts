import type { Category, ClothingItem, Outfit, OutfitFolder, Wardrobe } from '../types'
import { DEFAULT_WARDROBES, DEFAULT_WARDROBE_ID } from '../types'
import { sortItemsForDisplay } from './itemOrder'
import { supabase } from './supabase'

const PHOTOS_BUCKET = 'photos'

function photoPath(userId: string, photoId: string) {
  return `${userId}/${photoId}.webp`
}

function legacyPhotoPath(userId: string, photoId: string) {
  return `${userId}/${photoId}.png`
}

function mapItem(row: Record<string, unknown>): ClothingItem {
  return {
    id: row.id as string,
    wardrobeId: row.wardrobe_id as string,
    photoId: row.photo_id as string,
    name: row.name as string,
    brand: row.brand as string,
    category: row.category as ClothingItem['category'],
    season: row.season as ClothingItem['season'],
    tags: row.tags as string[],
    color: row.color as string | null,
    sortOrder: Number(row.sort_order),
    createdAt: Number(row.created_at),
  }
}

function mapOutfit(row: Record<string, unknown>): Outfit {
  return {
    id: row.id as string,
    folderId: row.folder_id as string,
    name: row.name as string,
    itemIds: row.item_ids as string[],
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as number,
  }
}

export async function cloudInitStorage(userId: string): Promise<Wardrobe[]> {
  const { data, error } = await supabase!
    .from('wardrobes')
    .select('id, name')
    .eq('user_id', userId)
    .order('sort_order')

  if (error) throw error

  const wardrobes = (data ?? []).map((w) => ({ id: w.id, name: w.name }))
  const primary = wardrobes.find((w) => w.id === DEFAULT_WARDROBE_ID)
  if (!primary) {
    await cloudSaveWardrobes(userId, DEFAULT_WARDROBES)
    return DEFAULT_WARDROBES
  }
  return [primary]
}

export async function cloudSaveWardrobes(userId: string, wardrobes: Wardrobe[]): Promise<void> {
  const rows = wardrobes.map((w, index) => ({
    id: w.id,
    user_id: userId,
    name: w.name,
    sort_order: index,
  }))
  const { error } = await supabase!.from('wardrobes').upsert(rows)
  if (error) throw error
}

export async function cloudSavePhoto(userId: string, id: string, blob: Blob): Promise<void> {
  const { error } = await supabase!.storage
    .from(PHOTOS_BUCKET)
    .upload(photoPath(userId, id), blob, { upsert: true, contentType: blob.type || 'image/webp' })
  if (error) throw error
}

export async function cloudGetPhoto(userId: string, id: string): Promise<Blob | undefined> {
  const { data, error } = await supabase!.storage
    .from(PHOTOS_BUCKET)
    .download(photoPath(userId, id))
  if (!error && data) return data

  const legacy = await supabase!.storage.from(PHOTOS_BUCKET).download(legacyPhotoPath(userId, id))
  if (legacy.error || !legacy.data) return undefined
  return legacy.data
}

export async function cloudDeletePhoto(userId: string, id: string): Promise<void> {
  await supabase!.storage
    .from(PHOTOS_BUCKET)
    .remove([photoPath(userId, id), legacyPhotoPath(userId, id)])
}

export async function cloudSaveItem(userId: string, item: ClothingItem): Promise<void> {
  const { error } = await supabase!.from('clothing_items').upsert({
    id: item.id,
    user_id: userId,
    wardrobe_id: item.wardrobeId,
    photo_id: item.photoId,
    name: item.name,
    brand: item.brand,
    category: item.category,
    season: item.season,
    tags: item.tags,
    color: item.color,
    sort_order: item.sortOrder,
    created_at: item.createdAt,
  })
  if (error) throw error
}

export async function cloudGetItems(userId: string, wardrobeId: string): Promise<ClothingItem[]> {
  const { data, error } = await supabase!
    .from('clothing_items')
    .select('*')
    .eq('user_id', userId)
    .eq('wardrobe_id', wardrobeId)
    .range(0, 9999)

  if (error) throw error
  return sortItemsForDisplay((data ?? []).map(mapItem))
}

export async function cloudGetAllItems(userId: string): Promise<ClothingItem[]> {
  const { data, error } = await supabase!
    .from('clothing_items')
    .select('*')
    .eq('user_id', userId)
    .range(0, 9999)

  if (error) throw error
  return sortItemsForDisplay((data ?? []).map(mapItem))
}

export async function cloudDeleteItem(_userId: string, id: string): Promise<void> {
  const { error } = await supabase!.from('clothing_items').delete().eq('id', id)
  if (error) throw error
}

export async function cloudReorderItems(
  userId: string,
  wardrobeId: string,
  category: Category,
  orderedIds: string[]
): Promise<void> {
  const items = await cloudGetItems(userId, wardrobeId)
  const byId = new Map(items.map((item) => [item.id, item]))
  await Promise.all(
    orderedIds.map((id, index) => {
      const item = byId.get(id)
      if (!item || item.category !== category) return Promise.resolve()
      return cloudSaveItem(userId, { ...item, sortOrder: index })
    })
  )
}

export async function cloudGetFolders(userId: string): Promise<OutfitFolder[]> {
  const { data, error } = await supabase!
    .from('outfit_folders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((f) => ({
    id: f.id as string,
    name: f.name as string,
    createdAt: f.created_at as number,
  }))
}

export async function cloudSaveFolder(userId: string, folder: OutfitFolder): Promise<void> {
  const { error } = await supabase!.from('outfit_folders').upsert({
    id: folder.id,
    user_id: userId,
    name: folder.name,
    created_at: folder.createdAt,
  })
  if (error) throw error
}

export async function cloudDeleteFolder(_userId: string, id: string): Promise<void> {
  const { error } = await supabase!.from('outfit_folders').delete().eq('id', id)
  if (error) throw error
}

export async function cloudGetOutfits(userId: string, folderId: string): Promise<Outfit[]> {
  const { data, error } = await supabase!
    .from('outfits')
    .select('*')
    .eq('user_id', userId)
    .eq('folder_id', folderId)
    .order('sort_order')

  if (error) throw error
  return (data ?? []).map(mapOutfit)
}

export async function cloudSaveOutfit(userId: string, outfit: Outfit): Promise<void> {
  const { error } = await supabase!.from('outfits').upsert({
    id: outfit.id,
    user_id: userId,
    folder_id: outfit.folderId,
    name: outfit.name,
    item_ids: outfit.itemIds,
    sort_order: outfit.sortOrder,
    created_at: outfit.createdAt,
  })
  if (error) throw error
}

export async function cloudDeleteOutfit(id: string): Promise<void> {
  const { error } = await supabase!.from('outfits').delete().eq('id', id)
  if (error) throw error
}

export async function cloudReorderOutfits(
  userId: string,
  folderId: string,
  orderedIds: string[]
): Promise<void> {
  const outfits = await cloudGetOutfits(userId, folderId)
  const byId = new Map(outfits.map((o) => [o.id, o]))
  await Promise.all(
    orderedIds.map((id, index) => {
      const outfit = byId.get(id)
      if (!outfit) return Promise.resolve()
      return cloudSaveOutfit(userId, { ...outfit, sortOrder: index })
    })
  )
}
