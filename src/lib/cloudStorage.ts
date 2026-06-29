import type { Category, ClothingItem, Outfit, OutfitFolder, Wardrobe } from '../types'
import { sortItemsForDisplay } from './itemOrder'
import { supabase } from './supabase'

const PHOTOS_BUCKET = 'photos'

function photoPath(householdId: string, photoId: string) {
  return `${householdId}/${photoId}.png`
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

export async function cloudInitStorage(householdId: string): Promise<Wardrobe[]> {
  const { data, error } = await supabase!
    .from('wardrobes')
    .select('id, name')
    .eq('household_id', householdId)
    .order('sort_order')

  if (error) throw error
  return (data ?? []).map((w) => ({ id: w.id, name: w.name }))
}

export async function cloudSaveWardrobes(householdId: string, wardrobes: Wardrobe[]): Promise<void> {
  const rows = wardrobes.map((w, index) => ({
    id: w.id,
    household_id: householdId,
    name: w.name,
    sort_order: index,
  }))
  const { error } = await supabase!.from('wardrobes').upsert(rows)
  if (error) throw error
}

export async function cloudSavePhoto(
  householdId: string,
  id: string,
  blob: Blob
): Promise<void> {
  const { error } = await supabase!.storage
    .from(PHOTOS_BUCKET)
    .upload(photoPath(householdId, id), blob, { upsert: true, contentType: 'image/png' })
  if (error) throw error
}

export async function cloudGetPhoto(householdId: string, id: string): Promise<Blob | undefined> {
  const { data, error } = await supabase!.storage
    .from(PHOTOS_BUCKET)
    .download(photoPath(householdId, id))
  if (error || !data) return undefined
  return data
}

export async function cloudDeletePhoto(householdId: string, id: string): Promise<void> {
  await supabase!.storage.from(PHOTOS_BUCKET).remove([photoPath(householdId, id)])
}

export async function cloudSaveItem(householdId: string, item: ClothingItem): Promise<void> {
  const { error } = await supabase!.from('clothing_items').upsert({
    id: item.id,
    household_id: householdId,
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

export async function cloudGetItems(
  householdId: string,
  wardrobeId: string
): Promise<ClothingItem[]> {
  const { data, error } = await supabase!
    .from('clothing_items')
    .select('*')
    .eq('household_id', householdId)
    .eq('wardrobe_id', wardrobeId)

  if (error) throw error
  return sortItemsForDisplay((data ?? []).map(mapItem))
}

export async function cloudGetAllItems(householdId: string): Promise<ClothingItem[]> {
  const { data, error } = await supabase!
    .from('clothing_items')
    .select('*')
    .eq('household_id', householdId)

  if (error) throw error
  return sortItemsForDisplay((data ?? []).map(mapItem))
}

export async function cloudDeleteItem(_householdId: string, id: string): Promise<void> {
  const { error } = await supabase!.from('clothing_items').delete().eq('id', id)
  if (error) throw error
}

export async function cloudReorderItems(
  householdId: string,
  wardrobeId: string,
  category: Category,
  orderedIds: string[]
): Promise<void> {
  const items = await cloudGetItems(householdId, wardrobeId)
  const byId = new Map(items.map((item) => [item.id, item]))
  await Promise.all(
    orderedIds.map((id, index) => {
      const item = byId.get(id)
      if (!item || item.category !== category) return Promise.resolve()
      return cloudSaveItem(householdId, { ...item, sortOrder: index })
    })
  )
}

export async function cloudGetFolders(householdId: string): Promise<OutfitFolder[]> {
  const { data, error } = await supabase!
    .from('outfit_folders')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((f) => ({
    id: f.id as string,
    name: f.name as string,
    createdAt: f.created_at as number,
  }))
}

export async function cloudSaveFolder(householdId: string, folder: OutfitFolder): Promise<void> {
  const { error } = await supabase!.from('outfit_folders').upsert({
    id: folder.id,
    household_id: householdId,
    name: folder.name,
    created_at: folder.createdAt,
  })
  if (error) throw error
}

export async function cloudDeleteFolder(_householdId: string, id: string): Promise<void> {
  const { error } = await supabase!.from('outfit_folders').delete().eq('id', id)
  if (error) throw error
}

export async function cloudGetOutfits(householdId: string, folderId: string): Promise<Outfit[]> {
  const { data, error } = await supabase!
    .from('outfits')
    .select('*')
    .eq('household_id', householdId)
    .eq('folder_id', folderId)
    .order('sort_order')

  if (error) throw error
  return (data ?? []).map(mapOutfit)
}

export async function cloudSaveOutfit(householdId: string, outfit: Outfit): Promise<void> {
  const { error } = await supabase!.from('outfits').upsert({
    id: outfit.id,
    household_id: householdId,
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
  householdId: string,
  folderId: string,
  orderedIds: string[]
): Promise<void> {
  const outfits = await cloudGetOutfits(householdId, folderId)
  const byId = new Map(outfits.map((o) => [o.id, o]))
  await Promise.all(
    orderedIds.map((id, index) => {
      const outfit = byId.get(id)
      if (!outfit) return Promise.resolve()
      return cloudSaveOutfit(householdId, { ...outfit, sortOrder: index })
    })
  )
}
