import { useMemo, useState } from 'react'
import type { TileStr } from '../domain/tiles'
import type { CalcFn, DiscardOption, HandAnalysis, WinContext, WinResult } from '../domain/engine'
import { analyze, formatPayment, isDealer } from '../domain/engine'
import { TileImage } from './TileImage'

export function ResultPanel({
  calc,
  hand,
  ctx,
}: {
  calc: CalcFn
  hand: TileStr[]
  ctx: WinContext
}) {
  const state: HandAnalysis = useMemo(
    () => analyze(calc, hand, ctx),
    [calc, hand, ctx]
  )
  const dealer = isDealer(ctx.jikaze)

  if (state.kind === 'incomplete') {
    return (
      <Info>
        13장까지 입력하면 텐파이 분석, 14장이면 화료·버릴 패 분석 (현재 {state.count}/14)
      </Info>
    )
  }

  if (state.kind === 'overfull') {
    return <Info tone="warn">손패가 너무 많습니다 ({state.count})</Info>
  }

  if (state.kind === 'error') {
    return <Info tone="error">분석 에러: {state.message}</Info>
  }

  if (state.kind === 'tenpai') {
    return <TenpaiView state={state} ctx={ctx} dealer={dealer} />
  }

  return <DiscardView state={state} ctx={ctx} dealer={dealer} />
}

// ─── 13장 뷰 ─────────────────────────────────────────────────
function TenpaiView({
  state,
  ctx,
  dealer,
}: {
  state: Extract<HandAnalysis, { kind: 'tenpai' }>
  ctx: WinContext
  dealer: boolean
}) {
  if (state.shanten > 0) {
    return (
      <div className="bg-white rounded-lg border border-stone-200 p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-stone-500">샨텐수</span>
          <span className="text-2xl font-bold text-stone-800">{state.shanten}</span>
          <span className="text-xs text-stone-500">
            (텐파이까지 {state.shanten}장 교체 필요)
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-3 flex items-center justify-between">
        <div>
          <span className="text-xs text-emerald-700">상태</span>
          <p className="text-xl font-bold text-emerald-800">텐파이</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-emerald-700">대기패 {state.waits.length}종</span>
          <div className="flex gap-1 mt-1 flex-wrap justify-end max-w-[180px]">
            {state.waits.map((t) => (
              <TileImage key={t} tile={t} size="sm" />
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs text-stone-600 px-1">
          각 대기패 화료 시 ({ctx.tsumo ? '쯔모' : '론'} · {dealer ? '친' : '자'})
        </p>
        {state.winResults.map((w) => (
          <WinRow key={w.winTile} result={w} ctx={ctx} dealer={dealer} />
        ))}
      </div>
    </div>
  )
}

// ─── 14장 뷰 ─────────────────────────────────────────────────
function DiscardView({
  state,
  ctx,
  dealer,
}: {
  state: Extract<HandAnalysis, { kind: 'discard' }>
  ctx: WinContext
  dealer: boolean
}) {
  const tenpaiDiscards = state.discards.filter((d) => d.shanten === 0)
  const nonTenpaiDiscards = state.discards.filter((d) => d.shanten !== 0)

  return (
    <div className="space-y-3">
      {state.agari && (
        <div className="bg-rose-50 rounded-lg border-2 border-rose-300 p-3">
          <p className="text-xs text-rose-700 font-semibold">
            🎉 {ctx.tsumo ? '쯔모' : '론'} 화료 · {dealer ? '친' : '자'}
          </p>
          <AgariSummary result={state.agari} ctx={ctx} dealer={dealer} />
        </div>
      )}

      {tenpaiDiscards.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-stone-600 px-1 font-medium">
            텐파이 유지 ({tenpaiDiscards.length}종)
          </p>
          {tenpaiDiscards.map((d) => (
            <DiscardCard
              key={d.discard}
              option={d}
              ctx={ctx}
              dealer={dealer}
              defaultOpen={tenpaiDiscards.length === 1}
            />
          ))}
        </div>
      )}

      {nonTenpaiDiscards.length > 0 && (
        <details className="bg-white rounded-lg border border-stone-200">
          <summary className="cursor-pointer p-3 text-sm text-stone-600 select-none">
            샨텐 후퇴 옵션 ({nonTenpaiDiscards.length}종)
          </summary>
          <div className="border-t border-stone-100 p-3 space-y-2">
            {nonTenpaiDiscards.map((d) => (
              <ShantenRow key={d.discard} option={d} />
            ))}
          </div>
        </details>
      )}

      {tenpaiDiscards.length === 0 && !state.agari && (
        <Info tone="warn">어느 패를 버려도 텐파이가 되지 않습니다</Info>
      )}
    </div>
  )
}

function DiscardCard({
  option,
  ctx,
  dealer,
  defaultOpen = false,
}: {
  option: DiscardOption
  ctx: WinContext
  dealer: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const winnableCount = option.winResults.filter((w) => w.isAgari).length
  const totalWaits = option.waits.length

  return (
    <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-stone-50"
      >
        <TileImage tile={option.discard} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-stone-800">버리고 텐파이</span>
            <span className="text-xs text-stone-500">
              대기 {totalWaits}종
              {winnableCount < totalWaits && ` · 화료 ${winnableCount}종`}
            </span>
          </div>
          <div className="flex gap-0.5 mt-1 flex-wrap">
            {option.waits.map((t) => (
              <img
                key={t}
                src={`/tiles/${t}.svg`}
                alt={t}
                className="w-6 h-8 rounded-sm border border-stone-200 bg-white"
                draggable={false}
              />
            ))}
          </div>
        </div>
        <span className="text-stone-400 text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-stone-100 p-3 space-y-2 bg-stone-50">
          {option.winResults.map((w) => (
            <WinRow key={w.winTile} result={w} ctx={ctx} dealer={dealer} compact />
          ))}
        </div>
      )}
    </div>
  )
}

function ShantenRow({ option }: { option: DiscardOption }) {
  return (
    <div className="flex items-center gap-3">
      <TileImage tile={option.discard} size="sm" />
      <span className="text-sm text-stone-600">
        {option.shanten === -1 ? '화료 형태?' : `${option.shanten}샨텐`}
      </span>
    </div>
  )
}

// ─── 화료 결과 카드 ───────────────────────────────────────────
function WinRow({
  result,
  ctx,
  dealer,
  compact = false,
}: {
  result: WinResult
  ctx: WinContext
  dealer: boolean
  compact?: boolean
}) {
  if (!result.isAgari) {
    return (
      <div
        className={`bg-white rounded border border-stone-200 ${
          compact ? 'p-2' : 'p-3'
        } flex items-center gap-3`}
      >
        <TileImage tile={result.winTile} size="sm" />
        <span className="text-sm text-stone-500">역 없음 (화료 불가)</span>
      </div>
    )
  }

  const isYakuman = result.yakuman > 0
  const paymentLine = formatPayment(result, ctx.tsumo, dealer)

  return (
    <div className={`bg-white rounded border border-stone-200 overflow-hidden`}>
      <div className={`flex items-center gap-3 ${compact ? 'p-2' : 'p-3'}`}>
        <TileImage tile={result.winTile} size={compact ? 'sm' : 'md'} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            {isYakuman ? (
              <span className="text-base font-bold text-rose-600">
                {result.yakuman === 1 ? '역만' : `${result.yakuman}배역만`}
              </span>
            ) : (
              <span className={`font-bold text-stone-800 ${compact ? 'text-sm' : 'text-lg'}`}>
                {result.han}판 {result.fu}부
              </span>
            )}
            <span className="text-sm text-stone-600 font-medium">· {paymentLine}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {result.yaku.map((y) => (
              <span
                key={y.id}
                className="text-[11px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded"
              >
                {y.name}
                {y.han > 0 && <span className="text-stone-500"> +{y.han}</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
      {ctx.riichi && !compact && !ctx.ippatsu && (
        <div className="px-3 pb-3 pt-0 border-t border-stone-100">
          <p className="text-[11px] text-stone-500 mt-2">
            운 요소 (확정 시 옵션 패널에서 켜주세요)
          </p>
          <div className="flex flex-wrap gap-2 mt-1 text-[11px]">
            <Badge label="일발" value="리치 후 1순 내 화료 +1판" />
            <Badge label="우라도라" value="0~여러 판 (운)" />
          </div>
        </div>
      )}
    </div>
  )
}

function AgariSummary({
  result,
  ctx,
  dealer,
}: {
  result: WinResult
  ctx: WinContext
  dealer: boolean
}) {
  const isYakuman = result.yakuman > 0
  const paymentLine = formatPayment(result, ctx.tsumo, dealer)
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        {isYakuman ? (
          <span className="text-xl font-bold text-rose-700">
            {result.yakuman === 1 ? '역만' : `${result.yakuman}배역만`}
          </span>
        ) : (
          <span className="text-xl font-bold text-rose-800">
            {result.han}판 {result.fu}부
          </span>
        )}
        <span className="text-base text-rose-700 font-semibold">{paymentLine}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {result.yaku.map((y) => (
          <span
            key={y.id}
            className="text-[11px] bg-white text-rose-700 px-1.5 py-0.5 rounded border border-rose-200"
          >
            {y.name}
            {y.han > 0 && <span className="text-rose-400"> +{y.han}</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── 헬퍼 ─────────────────────────────────────────────────
function Info({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'warn' | 'error'
}) {
  const toneClass = {
    neutral: 'bg-white border-stone-200 text-stone-500',
    warn: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-rose-50 border-rose-200 text-rose-700',
  }[tone]
  return (
    <div className={`rounded-lg border p-4 text-center text-sm ${toneClass}`}>{children}</div>
  )
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
      <span className="font-medium">{label}</span>: <span>{value}</span>
    </span>
  )
}
