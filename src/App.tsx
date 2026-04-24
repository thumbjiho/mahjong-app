import { useState } from 'react'
import type { TileStr } from './domain/tiles'
import type { OptionsState } from './components/OptionsPanel'
import { useEngine } from './hooks/useEngine'
import { HandDisplay } from './components/HandDisplay'
import { FloatingPicker } from './components/FloatingPicker'
import { SituationBar } from './components/SituationBar'
import { ResultPanel } from './components/ResultPanel'

const MAX_TILES = 14

const DEFAULT_OPTIONS: OptionsState = {
  bakaze: '1z',
  jikaze: '1z',
  riichi: false,
  tsumo: true,
  doraIndicators: [],
  ippatsu: false,
  doubleRiichi: false,
  lastTile: false,
  afterKan: false,
}

function App() {
  const { engine, error, loading } = useEngine()
  const [hand, setHand] = useState<TileStr[]>([])
  const [options, setOptions] = useState<OptionsState>(DEFAULT_OPTIONS)

  function addTile(tile: TileStr) {
    if (hand.length >= MAX_TILES) return
    setHand((prev) => [...prev, tile])
  }

  function removeAt(index: number) {
    setHand((prev) => prev.filter((_, i) => i !== index))
  }

  function clearHand() {
    setHand([])
  }

  if (loading) {
    return (
      <div className="h-dvh bg-stone-50 flex items-center justify-center">
        <p className="text-stone-500 text-sm">엔진 로딩 중...</p>
      </div>
    )
  }

  if (error || !engine) {
    return (
      <div className="h-dvh bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 max-w-md">
          <p className="text-rose-700 font-semibold">엔진 로드 실패</p>
          <p className="text-rose-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh overflow-hidden bg-stone-50 text-stone-800 flex flex-col">
      {/* 상단 고정 영역 — 헤더 + 상황 + 손패 */}
      <div className="shrink-0 px-3 pt-3 pb-2">
        <div className="max-w-lg mx-auto space-y-2.5">
          <header className="flex items-center justify-between">
            <h1 className="text-lg font-bold">🀄 대기패 계산기</h1>
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-500">{hand.length}/14</span>
              <button
                type="button"
                onClick={clearHand}
                disabled={hand.length === 0}
                className="text-xs text-stone-500 hover:text-stone-700 disabled:text-stone-300 underline underline-offset-2"
              >
                초기화
              </button>
            </div>
          </header>
          <SituationBar value={options} onChange={setOptions} hand={hand} />
          <section className="bg-white rounded-lg border border-stone-200 p-2">
            <HandDisplay tiles={hand} onRemove={removeAt} />
          </section>
        </div>
      </div>

      {/* 스크롤 영역 — 결과만 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-3">
        <div className="max-w-lg mx-auto pb-[260px]">
          <ResultPanel calc={engine.calc as never} hand={hand} ctx={options} />
        </div>
      </div>

      <FloatingPicker
        hand={hand}
        reserved={options.doraIndicators}
        onPick={addTile}
        disabled={hand.length >= MAX_TILES}
      />
    </div>
  )
}

export default App
