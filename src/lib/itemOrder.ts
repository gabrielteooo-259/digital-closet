import { OUTFIT_CATEGORY_ORDER, type Category, type ClothingItem } from '../types'

export function sortItemsForDisplay(items: ClothingItem[]): ClothingItem[] {
  return [...items].sort((a, b) => {
    const categoryDiff =
      OUTFIT_CATEGORY_ORDER.indexOf(a.category) - OUTFIT_CATEGORY_ORDER.indexOf(b.category)
    if (categoryDiff !== 0) return categoryDiff
    return a.sortOrder - b.sortOrder
  })
}

export function nextSortOrderForCategory(items: ClothingItem[], category: Category): number {
  const sameCategory = items.filter((item) => item.category === category)
  if (sameCategory.length === 0) return 0
  return Math.max(...sameCategory.map((item) => item.sortOrder)) + 1
}
