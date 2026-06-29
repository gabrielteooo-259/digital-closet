export interface DetectedColor {
  hex: string
  name: string
}

const COLOR_PALETTE: { name: string; rgb: [number, number, number] }[] = [
  { name: 'Black', rgb: [20, 20, 20] },
  { name: 'White', rgb: [245, 245, 245] },
  { name: 'Gray', rgb: [128, 128, 128] },
  { name: 'Beige', rgb: [210, 180, 140] },
  { name: 'Brown', rgb: [101, 67, 33] },
  { name: 'Red', rgb: [200, 30, 30] },
  { name: 'Pink', rgb: [255, 150, 180] },
  { name: 'Orange', rgb: [230, 120, 30] },
  { name: 'Yellow', rgb: [240, 210, 50] },
  { name: 'Green', rgb: [50, 140, 70] },
  { name: 'Blue', rgb: [40, 90, 180] },
  { name: 'Navy', rgb: [20, 40, 80] },
  { name: 'Purple', rgb: [120, 60, 160] },
]

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`
}

export function hexFromColorName(name: string): string | null {
  const match = COLOR_PALETTE.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  )
  return match ? rgbToHex(...match.rgb) : null
}

function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  )
}

function nearestPaletteColor(r: number, g: number, b: number): DetectedColor {
  let best = COLOR_PALETTE[0]
  let bestDist = Infinity
  for (const c of COLOR_PALETTE) {
    const d = colorDistance([r, g, b], c.rgb)
    if (d < bestDist) {
      bestDist = d
      best = c
    }
  }
  return { name: best.name, hex: rgbToHex(...best.rgb) }
}

export async function detectColors(imageBlob: Blob, maxColors = 3): Promise<DetectedColor[]> {
  const bitmap = await createImageBitmap(imageBlob)
  const canvas = document.createElement('canvas')
  const size = 64
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return []
  }

  ctx.drawImage(bitmap, 0, 0, size, size)
  bitmap.close()

  const { data } = ctx.getImageData(0, 0, size, size)
  const buckets = new Map<string, { count: number; color: DetectedColor }>()

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < 128) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r > 240 && g > 240 && b > 240) continue
    const color = nearestPaletteColor(r, g, b)
    const existing = buckets.get(color.hex)
    if (existing) {
      existing.count += 1
    } else {
      buckets.set(color.hex, { count: 1, color })
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxColors)
    .map(({ color }) => color)
}

export function normalizeItemColor(item: Record<string, unknown>): string | null {
  if (typeof item.color === 'string') return item.color
  const legacy = item.colors
  if (Array.isArray(legacy) && legacy.length > 0 && typeof legacy[0] === 'string') {
    return hexFromColorName(legacy[0]) ?? null
  }
  return null
}
