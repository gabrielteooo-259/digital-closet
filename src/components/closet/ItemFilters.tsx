import type { ClothingItem, ItemFilters as Filters } from '../../types'
import { CATEGORIES, SEASONS } from '../../types'
import { ColorSwatch } from '../ui/ColorSwatch'

interface ItemFiltersProps {
  items: ClothingItem[]
  filters: Filters
  onChange: (filters: Filters) => void
  showCategory?: boolean
}

export function CategoryToggle({
  filters,
  onChange,
}: {
  filters: Filters
  onChange: (filters: Filters) => void
}) {
  function update(partial: Partial<Filters>) {
    onChange({ ...filters, ...partial })
  }

  return (
    <div className="flex gap-1">
      {CATEGORIES.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => update({ category: filters.category === c.value ? 'all' : c.value })}
          className={`neo-btn flex-1 py-2 text-xs ${
            filters.category === c.value ? 'bg-yellow' : 'bg-white'
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

export function ItemFiltersBar({ items, filters, onChange, showCategory = true }: ItemFiltersProps) {
  const brands = [...new Set(items.map((i) => i.brand).filter(Boolean))].sort()
  const colors = [...new Set(items.map((i) => i.color).filter((c): c is string => !!c))]
  const tags = [...new Set(items.flatMap((i) => i.tags))].sort()

  function update(partial: Partial<Filters>) {
    onChange({ ...filters, ...partial })
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Search name or brand…"
        value={filters.search}
        onChange={(e) => update({ search: e.target.value })}
        className="neo-input w-full px-3 py-2 text-sm"
      />

      {showCategory && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => update({ category: filters.category === c.value ? 'all' : c.value })}
              className={`shrink-0 neo-btn px-3 py-1 text-xs ${
                filters.category === c.value ? 'bg-yellow' : 'bg-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <select
          value={filters.brand}
          onChange={(e) => update({ brand: e.target.value })}
          className="neo-input px-2 py-2 text-sm"
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={filters.season}
          onChange={(e) => update({ season: e.target.value as Filters['season'] })}
          className="neo-input px-2 py-2 text-sm"
        >
          <option value="all">All seasons</option>
          {SEASONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={filters.tag}
          onChange={(e) => update({ tag: e.target.value })}
          className="neo-input px-2 py-2 text-sm col-span-2"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {colors.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium mb-2">Color</legend>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => update({ color: '' })}
              className={`neo-btn px-3 py-1 text-xs ${filters.color === '' ? 'bg-yellow' : 'bg-white'}`}
            >
              All
            </button>
            {colors.map((hex) => (
              <ColorSwatch
                key={hex}
                hex={hex}
                size="sm"
                selected={filters.color === hex}
                onClick={() => update({ color: filters.color === hex ? '' : hex })}
              />
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}

export function applyFilters(items: ClothingItem[], filters: Filters): ClothingItem[] {
  return items.filter((item) => {
    if (filters.category !== 'all' && item.category !== filters.category) return false
    if (filters.brand && item.brand !== filters.brand) return false
    if (filters.season !== 'all' && !item.season.includes(filters.season)) return false
    if (filters.color && item.color !== filters.color) return false
    if (filters.tag && !item.tags.includes(filters.tag)) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const haystack = [item.name, item.brand, ...item.tags].join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

export const defaultFilters: Filters = {
  search: '',
  category: 'all',
  brand: '',
  season: 'all',
  color: '',
  tag: '',
}

export function isFiltersActive(
  filters: Filters,
  { includeCategory = true }: { includeCategory?: boolean } = {}
): boolean {
  return (
    filters.search !== '' ||
    (includeCategory && filters.category !== 'all') ||
    filters.brand !== '' ||
    filters.season !== 'all' ||
    filters.color !== '' ||
    filters.tag !== ''
  )
}
