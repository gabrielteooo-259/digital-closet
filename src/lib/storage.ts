import type { Category, ClothingItem, Outfit, OutfitFolder, Wardrobe } from '../types'
import * as cloud from './cloudStorage'
import * as local from './localStorage'
import { isSupabaseConfigured } from './supabase'

let userId: string | null = null

export function isCloudMode() {
  return isSupabaseConfigured && userId !== null
}

export function configureCloudStorage(id: string) {
  userId = id
}

export function clearCloudStorage() {
  userId = null
}

function requireUser() {
  if (!userId) throw new Error('Cloud storage not configured')
  return userId
}

export async function initStorage(): Promise<Wardrobe[]> {
  if (isCloudMode()) return cloud.cloudInitStorage(requireUser())
  return local.initStorage()
}

export async function saveWardrobes(wardrobes: Wardrobe[]): Promise<void> {
  if (isCloudMode()) return cloud.cloudSaveWardrobes(requireUser(), wardrobes)
  return local.saveWardrobes(wardrobes)
}

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  if (isCloudMode()) return cloud.cloudSavePhoto(requireUser(), id, blob)
  return local.savePhoto(id, blob)
}

export async function getPhoto(id: string): Promise<Blob | undefined> {
  if (isCloudMode()) return cloud.cloudGetPhoto(requireUser(), id)
  return local.getPhoto(id)
}

export async function deletePhoto(id: string): Promise<void> {
  if (isCloudMode()) return cloud.cloudDeletePhoto(requireUser(), id)
  return local.deletePhoto(id)
}

export async function saveItem(item: ClothingItem): Promise<void> {
  if (isCloudMode()) return cloud.cloudSaveItem(requireUser(), item)
  return local.saveItem(item)
}

export async function getItems(wardrobeId: string): Promise<ClothingItem[]> {
  if (isCloudMode()) return cloud.cloudGetItems(requireUser(), wardrobeId)
  return local.getItems(wardrobeId)
}

export async function getAllItems(): Promise<ClothingItem[]> {
  if (isCloudMode()) return cloud.cloudGetAllItems(requireUser())
  return local.getAllItems()
}

export async function deleteItem(id: string): Promise<void> {
  if (isCloudMode()) return cloud.cloudDeleteItem(requireUser(), id)
  return local.deleteItem(id)
}

export async function reorderItems(
  wardrobeId: string,
  category: Category,
  orderedIds: string[]
): Promise<void> {
  if (isCloudMode()) return cloud.cloudReorderItems(requireUser(), wardrobeId, category, orderedIds)
  return local.reorderItems(wardrobeId, category, orderedIds)
}

export async function getFolders(): Promise<OutfitFolder[]> {
  if (isCloudMode()) return cloud.cloudGetFolders(requireUser())
  return local.getFolders()
}

export async function saveFolder(folder: OutfitFolder): Promise<void> {
  if (isCloudMode()) return cloud.cloudSaveFolder(requireUser(), folder)
  return local.saveFolder(folder)
}

export async function deleteFolder(id: string): Promise<void> {
  if (isCloudMode()) return cloud.cloudDeleteFolder(requireUser(), id)
  return local.deleteFolder(id)
}

export async function getOutfits(folderId: string): Promise<Outfit[]> {
  if (isCloudMode()) return cloud.cloudGetOutfits(requireUser(), folderId)
  return local.getOutfits(folderId)
}

export async function saveOutfit(outfit: Outfit): Promise<void> {
  if (isCloudMode()) return cloud.cloudSaveOutfit(requireUser(), outfit)
  return local.saveOutfit(outfit)
}

export async function deleteOutfit(id: string): Promise<void> {
  if (isCloudMode()) return cloud.cloudDeleteOutfit(id)
  return local.deleteOutfit(id)
}

export async function reorderOutfits(folderId: string, orderedIds: string[]): Promise<void> {
  if (isCloudMode()) return cloud.cloudReorderOutfits(requireUser(), folderId, orderedIds)
  return local.reorderOutfits(folderId, orderedIds)
}
