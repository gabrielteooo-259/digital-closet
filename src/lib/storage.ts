import type { Category, ClothingItem, Outfit, OutfitFolder, Wardrobe } from '../types'
import * as cloud from './cloudStorage'
import * as local from './localStorage'
import { isSupabaseConfigured } from './supabase'

let householdId: string | null = null

export function isCloudMode() {
  return isSupabaseConfigured && householdId !== null
}

export function configureCloudStorage(id: string) {
  householdId = id
}

export function clearCloudStorage() {
  householdId = null
}

function requireHousehold() {
  if (!householdId) throw new Error('Cloud storage not configured')
  return householdId
}

export async function initStorage(): Promise<Wardrobe[]> {
  if (isCloudMode()) return cloud.cloudInitStorage(requireHousehold())
  return local.initStorage()
}

export async function saveWardrobes(wardrobes: Wardrobe[]): Promise<void> {
  if (isCloudMode()) return cloud.cloudSaveWardrobes(requireHousehold(), wardrobes)
  return local.saveWardrobes(wardrobes)
}

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  if (isCloudMode()) return cloud.cloudSavePhoto(requireHousehold(), id, blob)
  return local.savePhoto(id, blob)
}

export async function getPhoto(id: string): Promise<Blob | undefined> {
  if (isCloudMode()) return cloud.cloudGetPhoto(requireHousehold(), id)
  return local.getPhoto(id)
}

export async function deletePhoto(id: string): Promise<void> {
  if (isCloudMode()) return cloud.cloudDeletePhoto(requireHousehold(), id)
  return local.deletePhoto(id)
}

export async function saveItem(item: ClothingItem): Promise<void> {
  if (isCloudMode()) return cloud.cloudSaveItem(requireHousehold(), item)
  return local.saveItem(item)
}

export async function getItems(wardrobeId: string): Promise<ClothingItem[]> {
  if (isCloudMode()) return cloud.cloudGetItems(requireHousehold(), wardrobeId)
  return local.getItems(wardrobeId)
}

export async function getAllItems(): Promise<ClothingItem[]> {
  if (isCloudMode()) return cloud.cloudGetAllItems(requireHousehold())
  return local.getAllItems()
}

export async function deleteItem(id: string): Promise<void> {
  if (isCloudMode()) return cloud.cloudDeleteItem(requireHousehold(), id)
  return local.deleteItem(id)
}

export async function reorderItems(
  wardrobeId: string,
  category: Category,
  orderedIds: string[]
): Promise<void> {
  if (isCloudMode()) return cloud.cloudReorderItems(requireHousehold(), wardrobeId, category, orderedIds)
  return local.reorderItems(wardrobeId, category, orderedIds)
}

export async function getFolders(): Promise<OutfitFolder[]> {
  if (isCloudMode()) return cloud.cloudGetFolders(requireHousehold())
  return local.getFolders()
}

export async function saveFolder(folder: OutfitFolder): Promise<void> {
  if (isCloudMode()) return cloud.cloudSaveFolder(requireHousehold(), folder)
  return local.saveFolder(folder)
}

export async function deleteFolder(id: string): Promise<void> {
  if (isCloudMode()) return cloud.cloudDeleteFolder(requireHousehold(), id)
  return local.deleteFolder(id)
}

export async function getOutfits(folderId: string): Promise<Outfit[]> {
  if (isCloudMode()) return cloud.cloudGetOutfits(requireHousehold(), folderId)
  return local.getOutfits(folderId)
}

export async function saveOutfit(outfit: Outfit): Promise<void> {
  if (isCloudMode()) return cloud.cloudSaveOutfit(requireHousehold(), outfit)
  return local.saveOutfit(outfit)
}

export async function deleteOutfit(id: string): Promise<void> {
  if (isCloudMode()) return cloud.cloudDeleteOutfit(id)
  return local.deleteOutfit(id)
}

export async function reorderOutfits(folderId: string, orderedIds: string[]): Promise<void> {
  if (isCloudMode()) return cloud.cloudReorderOutfits(requireHousehold(), folderId, orderedIds)
  return local.reorderOutfits(folderId, orderedIds)
}
