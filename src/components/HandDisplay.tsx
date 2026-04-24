import type { TileStr } from '../domain/tiles'
import { sortKey, tileName } from '../domain/tiles'

// 14슬롯 한 줄 고정. 컨테이너 너비에 맞춰 타일이 자동 축소.
export function HandDisplay({
  tiles,
  onRemove,
}: {
  tiles: TileStr[]
  onRemove: (index: number) => void
}) {
  const sorted = tiles
    .map((tile, originalIndex) => ({ tile, originalIndex }))
    .sort((a, b) => sortKey(a.tile) - sortKey(b.tile))
  const emptySlots = Math.max(0, 14 - tiles.length)

  return (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: `repeat(14, minmax(0, 1fr))` }}
    >
      {sorted.map((item, i) => (
        <button
          key={`${item.tile}-${item.originalIndex}-${i}`}
          type="button"
          aria-label={tileName(item.tile)}
          onClick={() => onRemove(item.originalIndex)}
          className="aspect-[7/10] rounded overflow-hidden border border-stone-300 bg-white shadow-sm active:scale-95 transition min-w-0"
        >
          <img
            src={`/tiles/${item.tile}.svg`}
            alt={tileName(item.tile)}
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        </button>
      ))}
      {Array.from({ length: emptySlots }, (_, i) => (
        <div
          key={`empty-${i}`}
          className="aspect-[7/10] rounded border border-dashed border-stone-300 bg-stone-50 min-w-0"
        />
      ))}
    </div>
  )
}
