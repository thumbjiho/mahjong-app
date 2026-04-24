import type { TileStr } from '../domain/tiles'
import { PICKER_SUITS, tileToId, isAka } from '../domain/tiles'
import { TileImage } from './TileImage'

// 같은 ID (5m/0m은 ID 동일) 총 카운트
function countById(tiles: TileStr[], tile: TileStr): number {
  const id = tileToId(tile)
  return tiles.filter((t) => tileToId(t) === id).length
}

// 적도라는 자기 자신(문자열) 기준 카운트
function countExact(tiles: TileStr[], tile: TileStr): number {
  return tiles.filter((t) => t === tile).length
}

export function TilePicker({
  hand,
  reserved,
  onPick,
  disabled,
}: {
  hand: TileStr[]
  reserved?: TileStr[] // 도라 표시패 등 이미 물리적으로 차지된 타일
  onPick: (tile: TileStr) => void
  disabled?: boolean
}) {
  const extras = reserved ?? []

  function handlePick(tile: TileStr) {
    if (disabled) return
    // 총 물리 카운트 (hand + 도라 표시패)
    const totalId = countById(hand, tile) + countById(extras, tile)
    if (totalId >= 4) return
    if (isAka(tile)) {
      const totalExact = countExact(hand, tile) + countExact(extras, tile)
      if (totalExact >= 1) return
    }
    onPick(tile)
  }

  return (
    <div className="space-y-1.5">
      {PICKER_SUITS.map((s) => (
        <div
          key={s.label}
          className="flex gap-1 p-1.5 bg-stone-100 rounded-lg justify-center"
        >
          {s.tiles.map((tile) => {
            const handIdCount = countById(hand, tile)
            const totalIdCount = handIdCount + countById(extras, tile)
            const handExactCount = countExact(hand, tile)
            const aka = isAka(tile)
            const totalExactCount = handExactCount + countExact(extras, tile)
            const atMax = totalIdCount >= 4 || (aka && totalExactCount >= 1)
            return (
              <div key={tile} className="relative flex justify-center">
                <TileImage
                  tile={tile}
                  size="sm"
                  disabled={disabled || atMax}
                  onClick={() => handlePick(tile)}
                />
                {handExactCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center pointer-events-none ${
                      aka ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                  >
                    {handExactCount}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
