import type { TileStr } from '../domain/tiles'
import { sortKey } from '../domain/tiles'
import { EmptyTile, TileImage } from './TileImage'

export function Hand({
  tiles,
  onRemove,
  capacity = 14,
}: {
  tiles: TileStr[]
  onRemove: (index: number) => void
  capacity?: number
}) {
  // 정렬 순서로 보여주되, 클릭 시 원본 배열 index로 제거
  const sorted = tiles
    .map((tile, originalIndex) => ({ tile, originalIndex }))
    .sort((a, b) => sortKey(a.tile) - sortKey(b.tile))
  const emptySlots = Math.max(0, capacity - tiles.length)

  return (
    <div className="flex flex-wrap gap-1 items-end justify-center">
      {sorted.map((item, i) => (
        <TileImage
          key={`${item.tile}-${item.originalIndex}-${i}`}
          tile={item.tile}
          size="md"
          onClick={() => onRemove(item.originalIndex)}
        />
      ))}
      {Array.from({ length: emptySlots }, (_, i) => (
        <EmptyTile key={`empty-${i}`} size="md" />
      ))}
    </div>
  )
}
