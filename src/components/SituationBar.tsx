import { useState } from 'react'
import type { OptionsState } from './OptionsPanel'
import { OptionsPanel } from './OptionsPanel'
import { tileName, type TileStr } from '../domain/tiles'

// 상단 고정 floating 바 — 요약 + 도라 항상 노출.
// 탭하면 바텀시트로 전체 옵션 편집
export function SituationBar({
  value,
  onChange,
  hand,
}: {
  value: OptionsState
  onChange: (v: OptionsState) => void
  hand?: TileStr[]
}) {
  const [open, setOpen] = useState(false)
  const summary = buildSummary(value)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-white/85 backdrop-blur-xl rounded-2xl border border-stone-200/70 shadow-[0_4px_16px_rgba(0,0,0,0.04)] px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-[10px] uppercase tracking-wider text-stone-400 shrink-0">
            상황
          </span>
          <span className="text-xs text-stone-800 shrink-0">{summary}</span>
          <span className="text-[10px] text-stone-400 shrink-0 ml-1">도라</span>
          {value.doraIndicators.length === 0 ? (
            <span className="text-[11px] text-stone-400 shrink-0">없음</span>
          ) : (
            <div className="flex gap-0.5 min-w-0 overflow-hidden">
              {value.doraIndicators.map((t, i) => (
                <img
                  key={`${t}-${i}`}
                  src={`/tiles/${t}.svg`}
                  alt={tileName(t)}
                  className="w-5 h-7 shrink-0 rounded-sm border border-stone-200 bg-white"
                  draggable={false}
                />
              ))}
            </div>
          )}
          <span className="ml-auto shrink-0 text-stone-400 text-xs">편집 ▸</span>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md max-h-[85dvh] overflow-y-auto scrollbar-hide bg-white rounded-t-2xl sm:rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sticky top-0 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-stone-800">상황 설정</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-stone-500 hover:text-stone-800 px-2 py-1"
              >
                닫기
              </button>
            </header>
            <OptionsPanel value={value} onChange={onChange} hand={hand} />
          </div>
        </div>
      )}
    </>
  )
}

function buildSummary(v: OptionsState): string {
  const parts: string[] = []
  parts.push(`${tileName(v.bakaze)}장`)
  parts.push(v.jikaze === '1z' ? '친' : `${tileName(v.jikaze)}가`)
  parts.push(v.tsumo ? '쯔모' : '론')
  if (v.riichi) parts.push(v.doubleRiichi ? '더블리치' : '리치')
  if (v.ippatsu && v.riichi) parts.push('일발')
  if (v.lastTile) parts.push('해저/하저')
  if (v.afterKan) parts.push(v.tsumo ? '린샨' : '창깡')
  return parts.join(' · ')
}
