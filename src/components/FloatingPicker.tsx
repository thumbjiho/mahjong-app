import { useState } from 'react'
import type { TileStr } from '../domain/tiles'
import { TilePicker } from './TilePicker'

// iOS 26 tab bar 스타일: backdrop-blur + 둥근 모서리 + 그림자 + 패딩
export function FloatingPicker({
  hand,
  reserved,
  onPick,
  disabled,
}: {
  hand: TileStr[]
  reserved?: TileStr[]
  onPick: (tile: TileStr) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(true)

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pointer-events-none"
      style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + 0.75rem)` }}
    >
      <div className="max-w-lg mx-auto flex justify-center">
        {open ? (
          <div className="w-full pointer-events-auto bg-white/80 backdrop-blur-2xl rounded-[28px] border border-white/60 shadow-[0_10px_32px_rgba(0,0,0,0.12)] overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
              <span className="text-xs font-medium text-stone-700">패 선택</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 px-2 py-0.5 rounded-full"
              >
                접기 ▾
              </button>
            </div>
            <div className="px-3 pb-3">
              <TilePicker hand={hand} reserved={reserved} onPick={onPick} disabled={disabled} />
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto bg-white/80 backdrop-blur-2xl rounded-full border border-white/60 shadow-[0_10px_28px_rgba(0,0,0,0.12)] px-5 py-2.5 text-sm font-medium text-stone-800 active:scale-95 transition"
          >
            🀄 패 선택 ▴
          </button>
        )}
      </div>
    </div>
  )
}
