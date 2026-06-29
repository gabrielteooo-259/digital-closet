import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ClothingItem, Outfit, OutfitFolder, Category } from '../types'
import { DEFAULT_WARDROBE_ID } from '../types'
import {
  deleteFolder,
  deleteItem,
  deleteOutfit,
  deletePhoto,
  getAllItems,
  getFolders,
  getItems,
  getOutfits,
  initStorage,
  reorderItems as persistItemOrder,
  reorderOutfits as persistOutfitOrder,
  saveFolder,
  saveItem,
  saveOutfit,
  savePhoto,
} from '../lib/storage'
import { nextSortOrderForCategory, sortItemsForDisplay } from '../lib/itemOrder'
import { optimizePhotoForStorage } from '../lib/imageUtils'

interface AppContextValue {
  loading: boolean
  wardrobeId: string
  items: ClothingItem[]
  allItems: ClothingItem[]
  refreshItems: () => Promise<void>
  addItem: (item: Omit<ClothingItem, 'id' | 'createdAt' | 'photoId' | 'sortOrder'>, photoBlob: Blob) => Promise<void>
  updateItem: (item: ClothingItem, photoBlob?: Blob) => Promise<void>
  removeItem: (id: string) => Promise<void>
  reorderItems: (category: Category, orderedIds: string[]) => Promise<void>
  folders: OutfitFolder[]
  refreshFolders: () => Promise<void>
  addFolder: (name: string) => Promise<void>
  removeFolder: (id: string) => Promise<void>
  outfitsByFolder: Record<string, Outfit[]>
  refreshOutfits: () => Promise<void>
  addOutfit: (folderId: string, name: string, itemIds: string[]) => Promise<void>
  updateOutfit: (outfit: Outfit) => Promise<void>
  removeOutfit: (id: string, folderId: string) => Promise<void>
  reorderOutfits: (folderId: string, orderedIds: string[]) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [wardrobeId, setWardrobeId] = useState('')
  const [items, setItems] = useState<ClothingItem[]>([])
  const [allItems, setAllItems] = useState<ClothingItem[]>([])
  const [folders, setFolders] = useState<OutfitFolder[]>([])
  const [outfitsByFolder, setOutfitsByFolder] = useState<Record<string, Outfit[]>>({})

  const refreshItems = useCallback(async () => {
    if (!wardrobeId) return
    const [wardrobeItems, everyItem] = await Promise.all([getItems(wardrobeId), getAllItems()])
    setItems(wardrobeItems)
    setAllItems(everyItem)
  }, [wardrobeId])

  const refreshFolders = useCallback(async () => {
    const list = await getFolders()
    setFolders(list.sort((a, b) => b.createdAt - a.createdAt))
  }, [])

  const refreshOutfits = useCallback(async () => {
    const list = await getFolders()
    const grouped: Record<string, Outfit[]> = {}
    await Promise.all(
      list.map(async (folder) => {
        const outfits = await getOutfits(folder.id)
        grouped[folder.id] = outfits
      })
    )
    setOutfitsByFolder(grouped)
  }, [])

  useEffect(() => {
    async function boot() {
      await initStorage()
      setWardrobeId(DEFAULT_WARDROBE_ID)
      setLoading(false)
    }
    boot()
  }, [])

  useEffect(() => {
    if (!wardrobeId) return
    refreshItems()
  }, [wardrobeId, refreshItems])

  useEffect(() => {
    refreshFolders().then(refreshOutfits)
  }, [refreshFolders, refreshOutfits])

  const addItem = useCallback(
    async (item: Omit<ClothingItem, 'id' | 'createdAt' | 'photoId' | 'sortOrder'>, photoBlob: Blob) => {
      const existing = await getItems(item.wardrobeId)
      const sortOrder = nextSortOrderForCategory(existing, item.category)
      const photoId = generateId('photo')
      const newItem: ClothingItem = {
        ...item,
        id: generateId('item'),
        photoId,
        sortOrder,
        createdAt: Date.now(),
      }
      const optimizedPhoto = await optimizePhotoForStorage(photoBlob)
      await savePhoto(photoId, optimizedPhoto)
      try {
        await saveItem(newItem)
      } catch (err) {
        await deletePhoto(photoId).catch(() => {})
        throw err
      }
      await refreshItems()
    },
    [refreshItems]
  )

  const updateItem = useCallback(
    async (item: ClothingItem, photoBlob?: Blob) => {
      if (photoBlob) {
        await savePhoto(item.photoId, await optimizePhotoForStorage(photoBlob))
      }
      await saveItem(item)
      await refreshItems()
    },
    [refreshItems]
  )

  const removeItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id) ?? allItems.find((i) => i.id === id)
      if (!item) return
      await deleteItem(id)
      await deletePhoto(item.photoId)
      await refreshItems()
    },
    [items, allItems, refreshItems]
  )

  const reorderItems = useCallback(
    async (category: Category, orderedIds: string[]) => {
      const sortOrderById = new Map(orderedIds.map((id, index) => [id, index]))

      setItems((prev) =>
        sortItemsForDisplay(
          prev.map((item) =>
            item.category === category && sortOrderById.has(item.id)
              ? { ...item, sortOrder: sortOrderById.get(item.id)! }
              : item
          )
        )
      )

      setAllItems((prev) =>
        sortItemsForDisplay(
          prev.map((item) => {
            if (item.category !== category) return item
            const index = sortOrderById.get(item.id)
            return index === undefined ? item : { ...item, sortOrder: index }
          })
        )
      )

      await persistItemOrder(wardrobeId, category, orderedIds)
    },
    [wardrobeId]
  )

  const addFolder = useCallback(
    async (name: string) => {
      const folder: OutfitFolder = {
        id: generateId('folder'),
        name,
        createdAt: Date.now(),
      }
      await saveFolder(folder)
      await refreshFolders()
      await refreshOutfits()
    },
    [refreshFolders, refreshOutfits]
  )

  const removeFolder = useCallback(
    async (id: string) => {
      await deleteFolder(id)
      await refreshFolders()
      await refreshOutfits()
    },
    [refreshFolders, refreshOutfits]
  )

  const addOutfit = useCallback(
    async (folderId: string, name: string, itemIds: string[]) => {
      const existing = await getOutfits(folderId)
      const sortOrder =
        existing.length === 0 ? 0 : Math.max(...existing.map((o) => o.sortOrder)) + 1
      const outfit: Outfit = {
        id: generateId('outfit'),
        folderId,
        name,
        itemIds,
        sortOrder,
        createdAt: Date.now(),
      }
      await saveOutfit(outfit)
      await refreshOutfits()
    },
    [refreshOutfits]
  )

  const updateOutfit = useCallback(
    async (outfit: Outfit) => {
      await saveOutfit(outfit)
      await refreshOutfits()
    },
    [refreshOutfits]
  )

  const removeOutfit = useCallback(
    async (id: string, folderId: string) => {
      await deleteOutfit(id)
      setOutfitsByFolder((prev) => ({
        ...prev,
        [folderId]: (prev[folderId] ?? []).filter((o) => o.id !== id),
      }))
    },
    []
  )

  const reorderOutfits = useCallback(async (folderId: string, orderedIds: string[]) => {
    setOutfitsByFolder((prev) => {
      const current = prev[folderId] ?? []
      const byId = new Map(current.map((o) => [o.id, o]))
      return {
        ...prev,
        [folderId]: orderedIds
          .map((id, index) => {
            const outfit = byId.get(id)
            return outfit ? { ...outfit, sortOrder: index } : null
          })
          .filter((o): o is Outfit => !!o),
      }
    })
    await persistOutfitOrder(folderId, orderedIds)
  }, [])

  const value = useMemo(
    () => ({
      loading,
      wardrobeId,
      items,
      allItems,
      refreshItems,
      addItem,
      updateItem,
      removeItem,
      reorderItems,
      folders,
      refreshFolders,
      addFolder,
      removeFolder,
      outfitsByFolder,
      refreshOutfits,
      addOutfit,
      updateOutfit,
      removeOutfit,
      reorderOutfits,
    }),
    [
      loading,
      wardrobeId,
      items,
      allItems,
      refreshItems,
      addItem,
      updateItem,
      removeItem,
      reorderItems,
      folders,
      refreshFolders,
      addFolder,
      removeFolder,
      outfitsByFolder,
      refreshOutfits,
      addOutfit,
      updateOutfit,
      removeOutfit,
      reorderOutfits,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
