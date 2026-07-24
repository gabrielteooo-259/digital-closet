export type Category = 'top' | 'bottom' | 'cap' | 'shoes'

export const OUTFIT_CATEGORY_ORDER: Category[] = ['cap', 'top', 'bottom', 'shoes']

export interface Wardrobe {
  id: string
  name: string
}

export interface ClothingItem {
  id: string
  wardrobeId: string
  photoId: string
  name: string
  brand: string
  tags: string[]
  color: string | null
  category: Category
  sortOrder: number
  createdAt: number
}

export interface OutfitFolder {
  id: string
  name: string
  createdAt: number
}

export interface Outfit {
  id: string
  folderId: string
  name: string
  itemIds: string[]
  sortOrder: number
  createdAt: number
}

export interface ItemFilters {
  search: string
  category: Category | 'all'
  brand: string
  color: string
  tag: string
}

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'cap', label: 'Cap' },
  { value: 'shoes', label: 'Shoes' },
]

export const DEFAULT_WARDROBE_ID = 'wardrobe-1'

export const DEFAULT_WARDROBES: Wardrobe[] = [{ id: DEFAULT_WARDROBE_ID, name: 'Closet' }]
