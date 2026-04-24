import type { TileStr } from '../domain/tiles'
import { tileName } from '../domain/tiles'

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'w-8 h-11',       // picker용
  md: 'w-10 h-14',      // 손패용 (모바일 기본)
  lg: 'w-12 h-16',      // 태블릿/데스크톱 손패
}

export function TileImage({
  tile,
  size = 'md',
  disabled = false,
  onClick,
}: {
  tile: TileStr
  size?: Size
  disabled?: boolean
  onClick?: () => void
}) {
  const sizeClass = SIZE_CLASSES[size]
  const base =
    'relative inline-block rounded-md overflow-hidden select-none shadow-sm border border-stone-300 bg-white transition-transform'
  const interactive = onClick
    ? disabled
      ? 'opacity-40 cursor-not-allowed'
      : 'cursor-pointer active:scale-95 hover:shadow-md'
    : ''

  const content = (
    <img
      src={`/tiles/${tile}.svg`}
      alt={tileName(tile)}
      className="w-full h-full object-contain pointer-events-none"
      draggable={false}
    />
  )

  if (!onClick) {
    // 단순 표시용 — button 래핑 없이 img 컨테이너만
    return (
      <span
        aria-label={tileName(tile)}
        className={`${base} ${sizeClass} inline-flex`}
      >
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={tileName(tile)}
      className={`${base} ${sizeClass} ${interactive}`}
    >
      {content}
    </button>
  )
}

// 비어있는 슬롯 (손패 13장에서 아직 안 채운 자리 표시)
export function EmptyTile({ size = 'md' }: { size?: Size }) {
  const sizeClass = SIZE_CLASSES[size]
  return (
    <div
      className={`${sizeClass} rounded-md border border-dashed border-stone-300 bg-stone-50`}
    />
  )
}
