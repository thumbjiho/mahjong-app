import type { TileStr } from '../domain/tiles'
import { ALL_TILES, tileName, tileToId } from '../domain/tiles'
import { TileImage } from './TileImage'

const WINDS: TileStr[] = ['1z', '2z', '3z', '4z']

export type OptionsState = {
  bakaze: TileStr
  jikaze: TileStr
  riichi: boolean
  tsumo: boolean
  doraIndicators: TileStr[]
  ippatsu: boolean
  doubleRiichi: boolean
  lastTile: boolean
  afterKan: boolean
}

export function OptionsPanel({
  value,
  onChange,
  hand = [],
}: {
  value: OptionsState
  onChange: (next: OptionsState) => void
  hand?: TileStr[] // 물리 카운트 제약 확인용
}) {
  function update<K extends keyof OptionsState>(key: K, v: OptionsState[K]) {
    onChange({ ...value, [key]: v })
  }

  // 같은 ID 총합 (hand + 이미 선택된 도라)
  function usedCount(tile: TileStr): number {
    const id = tileToId(tile)
    return [...hand, ...value.doraIndicators].filter((t) => tileToId(t) === id).length
  }

  function addDora(tile: TileStr) {
    if (value.doraIndicators.length >= 5) return
    if (usedCount(tile) >= 4) return
    update('doraIndicators', [...value.doraIndicators, tile])
  }

  function removeDoraAt(index: number) {
    update(
      'doraIndicators',
      value.doraIndicators.filter((_, i) => i !== index)
    )
  }

  return (
    <div className="space-y-3 p-3">
      {/* 장풍/자풍 */}
      <div className="grid grid-cols-2 gap-3">
        <WindSelector label="장풍" value={value.bakaze} onChange={(v) => update('bakaze', v)} />
        <WindSelector label="자풍" value={value.jikaze} onChange={(v) => update('jikaze', v)} />
      </div>

      {/* 화료 방식 */}
      <div>
        <p className="text-xs text-stone-600 mb-1.5">화료 방식</p>
        <div className="flex gap-2">
          <Toggle
            label="쯔모"
            active={value.tsumo}
            onClick={() => update('tsumo', true)}
            variant="green"
          />
          <Toggle
            label="론"
            active={!value.tsumo}
            onClick={() => update('tsumo', false)}
            variant="blue"
          />
        </div>
      </div>

      {/* 상황 역들 */}
      <div>
        <p className="text-xs text-stone-600 mb-1.5">상황 역</p>
        <div className="flex flex-wrap gap-1.5">
          <Toggle label="리치" active={value.riichi} onClick={() => update('riichi', !value.riichi)} />
          <Toggle
            label="일발"
            active={value.ippatsu}
            onClick={() => update('ippatsu', !value.ippatsu)}
            disabled={!value.riichi}
          />
          <Toggle
            label="더블리치"
            active={value.doubleRiichi}
            onClick={() => update('doubleRiichi', !value.doubleRiichi)}
            disabled={!value.riichi}
          />
          <Toggle
            label="해저/하저"
            active={value.lastTile}
            onClick={() => update('lastTile', !value.lastTile)}
          />
          <Toggle
            label={value.tsumo ? '린샨' : '창깡'}
            active={value.afterKan}
            onClick={() => update('afterKan', !value.afterKan)}
          />
        </div>
      </div>

      {/* 도라 표시패 */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="text-xs text-stone-600">
            도라 표시패 · 최대 5 · 현재 {value.doraIndicators.length}
          </p>
          <p className="text-[10px] text-stone-400">탭=추가, 선택된 도라 탭=제거</p>
        </div>
        {value.doraIndicators.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 p-2 bg-amber-50 rounded border border-amber-200">
            {value.doraIndicators.map((t, i) => (
              <TileImage
                key={`${t}-${i}`}
                tile={t}
                size="sm"
                onClick={() => removeDoraAt(i)}
              />
            ))}
          </div>
        )}
        <div className="grid grid-cols-9 gap-1 p-1.5 bg-stone-50 rounded">
          {ALL_TILES.map((t) => {
            const count = value.doraIndicators.filter((d) => d === t).length
            const disabled = value.doraIndicators.length >= 5 || usedCount(t) >= 4
            return (
              <div key={t} className="relative">
                <button
                  type="button"
                  onClick={() => addDora(t)}
                  disabled={disabled}
                  className={`w-full aspect-[7/10] rounded border transition bg-white disabled:opacity-40 ${
                    count > 0 ? 'border-amber-500 ring-2 ring-amber-300' : 'border-stone-200'
                  }`}
                >
                  <img
                    src={`/tiles/${t}.svg`}
                    alt={tileName(t)}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </button>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center pointer-events-none">
                    {count}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function WindSelector({
  label,
  value,
  onChange,
}: {
  label: string
  value: TileStr
  onChange: (v: TileStr) => void
}) {
  return (
    <div>
      <p className="text-xs text-stone-600 mb-1">{label}</p>
      <div className="flex gap-1">
        {WINDS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onChange(w)}
            className={`flex-1 py-1.5 rounded text-sm font-medium transition ${
              value === w
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {tileName(w)}
          </button>
        ))}
      </div>
    </div>
  )
}

function Toggle({
  label,
  active,
  onClick,
  variant = 'red',
  disabled,
}: {
  label: string
  active: boolean
  onClick: () => void
  variant?: 'red' | 'blue' | 'green'
  disabled?: boolean
}) {
  const colors = {
    red: active ? 'bg-red-500 text-white' : 'bg-stone-100 text-stone-500',
    blue: active ? 'bg-blue-500 text-white' : 'bg-stone-100 text-stone-500',
    green: active ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-500',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1 rounded-full text-xs font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${colors[variant]}`}
    >
      {label}
    </button>
  )
}
