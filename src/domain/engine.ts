import type { TileStr } from './tiles'
import { tileToId, idToTile, isAka, sortTiles } from './tiles'

type RiichiCalc = (input: RiichiInput) => RiichiResult
type RiichiInput = {
  closed_part: number[]
  open_part: unknown[]
  calc_hairi?: boolean
  options?: Partial<{
    dora: number[]
    aka_count: number
    riichi: boolean
    ippatsu: boolean
    double_riichi: boolean
    after_kan: boolean
    tile_discarded_by_someone: number // -1 = 쯔모
    bakaze: number
    jikaze: number
    allow_aka: boolean
    allow_kuitan: boolean
    last_tile: boolean
  }>
}
type RiichiResult = {
  is_agari: boolean
  yakuman: number
  han: number
  fu: number
  ten: number
  outgoing_ten?: [number, number]
  yaku: Record<string, number>
  hairi?: {
    now: number
    wait: number[]
    waits_after_discard: Array<[number, number[]]>
  }
}

export type CalcFn = RiichiCalc

let engineLoader: Promise<{ calc: RiichiCalc }> | null = null
export function loadEngine() {
  if (!engineLoader) {
    engineLoader = (async () => {
      const mod = (await import('riichi-rs-bundlers')) as unknown as { calc: RiichiCalc }
      runSelfTest(mod.calc)
      return mod
    })()
  }
  return engineLoader
}

// 엔진 로드 직후 1회 — 엔진 리턴 구조를 직접 찍어서 확인
function runSelfTest(calc: RiichiCalc) {
  // 1m2m3m 4p5p6p 7s8s9s 1z1z1z 7z → 탄키 on 7z
  const tenpai = [1, 2, 3, 13, 14, 15, 25, 26, 27, 28, 28, 28, 34]
  // 14장 버전: 위에 8m 추가 (agari 아님)
  const fourteen = [1, 2, 3, 13, 14, 15, 25, 26, 27, 28, 28, 28, 34, 26]

  const r13 = calc({ closed_part: tenpai, open_part: [], calc_hairi: true })
  const r14 = calc({ closed_part: fourteen, open_part: [], calc_hairi: true })

  console.group('[engine] self-test')
  console.log('13장 텐파이 (기대: wait에 34 포함)')
  console.log('  hairi.now:', r13.hairi?.now)
  console.log('  hairi.wait:', r13.hairi?.wait)
  console.log('  hairi.wait.length:', r13.hairi?.wait?.length)
  console.log('  hairi.waits_after_discard:', r13.hairi?.waits_after_discard)
  console.log('  raw:', JSON.stringify(r13.hairi))

  console.log('14장')
  console.log('  hairi.now:', r14.hairi?.now)
  console.log('  hairi.wait:', r14.hairi?.wait)
  console.log('  hairi.waits_after_discard:', r14.hairi?.waits_after_discard)
  console.log('  raw:', JSON.stringify(r14.hairi))
  console.groupEnd()
}

// ─── 화료 컨텍스트 ────────────────────────────────────────────
export type WinContext = {
  bakaze: TileStr // '1z'~'4z'
  jikaze: TileStr // '1z'~'4z'
  riichi: boolean
  tsumo: boolean
  doraIndicators: TileStr[]
  ippatsu: boolean // 리치 후 1순 내 화료
  doubleRiichi: boolean // 첫 순 리치
  lastTile: boolean // 해저/하저
  afterKan: boolean // 린샨(쯔모) / 창깡(론)
}

// 도라 표시패 → 도라
function nextTile(tile: TileStr): TileStr {
  if (tile[1] === 'z') {
    const n = parseInt(tile[0], 10)
    if (n >= 1 && n <= 4) return `${(n % 4) + 1}z` // 풍패 순환
    if (n >= 5 && n <= 7) return `${((n - 5 + 1) % 3) + 5}z` // 삼원패 순환
  }
  const num = tile[0] === '0' ? 5 : parseInt(tile[0], 10)
  const nextNum = num === 9 ? 1 : num + 1
  return `${nextNum}${tile[1]}`
}

// ─── 결과 타입 ───────────────────────────────────────────────
export type WinResult = {
  winTile: TileStr
  isAgari: boolean
  han: number
  fu: number
  yakuman: number
  ten: number
  // [oya로부터/ko로부터] — 쯔모 시 각자 지불액, 론 시 undefined일 수 있음
  outgoingTen: [number, number] | null
  yaku: { id: number; han: number; name: string }[]
  bonusIppatsu: string
  bonusUradora: string
}

export function isDealer(jikaze: TileStr): boolean {
  return jikaze === '1z' // 동가 = 친
}

// 쯔모 분할 또는 론 일괄 — 한국/일본 표준 표기
export function formatPayment(
  result: WinResult,
  tsumo: boolean,
  dealer: boolean
): string {
  if (!tsumo) return `${result.ten.toLocaleString()}점`
  const [fromOya, fromKo] = result.outgoingTen ?? [0, 0]
  if (dealer) {
    // 친가 쯔모: 모두에게 동일 금액 × 3
    return `${fromOya.toLocaleString()} 올 (×3)`
  }
  // 자가 쯔모: ko ${fromKo}, oya ${fromOya}
  return `${fromKo.toLocaleString()} / ${fromOya.toLocaleString()}`
}

export type DiscardOption = {
  discard: TileStr
  shanten: number
  waits: TileStr[]
  winResults: WinResult[] // shanten===0일 때 각 wait별 화료 시뮬 결과
}

export type HandAnalysis =
  | { kind: 'incomplete'; count: number; needed: number }
  | { kind: 'overfull'; count: number }
  | { kind: 'error'; message: string }
  | { kind: 'tenpai'; shanten: number; waits: TileStr[]; winResults: WinResult[] } // 13장
  | { kind: 'discard'; agari: WinResult | null; discards: DiscardOption[] } // 14장

function emptyWinResult(winTile: TileStr): WinResult {
  return {
    winTile,
    isAgari: false,
    han: 0,
    fu: 0,
    yakuman: 0,
    ten: 0,
    outgoingTen: null,
    yaku: [],
    bonusIppatsu: '',
    bonusUradora: '',
  }
}

// ─── 단일 손패 화료 시뮬 (내부용) ─────────────────────────────
// 엔진은 non-agari shape에 대해 "Incorrect number of tiles" 같은 에러를 throw할 수 있어서
// 방어적으로 try/catch 후 화료 안 됨으로 처리
function simulate(
  calc: RiichiCalc,
  hand13: TileStr[],
  winTile: TileStr,
  ctx: WinContext
): WinResult {
  const fullHand = [...hand13, winTile]
  const doraIds = ctx.doraIndicators.map(nextTile).map(tileToId)
  const akaCount = fullHand.filter(isAka).length

  let result: RiichiResult
  try {
    result = calc({
      closed_part: fullHand.map(tileToId),
      open_part: [],
      calc_hairi: false,
      options: {
        bakaze: tileToId(ctx.bakaze),
        jikaze: tileToId(ctx.jikaze),
        riichi: ctx.riichi,
        ippatsu: ctx.riichi && ctx.ippatsu,
        double_riichi: ctx.doubleRiichi,
        after_kan: ctx.afterKan,
        last_tile: ctx.lastTile,
        tile_discarded_by_someone: ctx.tsumo ? -1 : tileToId(winTile),
        dora: doraIds,
        aka_count: akaCount,
        allow_aka: true,
        allow_kuitan: true,
      },
    })
  } catch (err) {
    // 엔진이 "역 없음" / non-agari shape 등을 Err로 돌려주면 여기로 옴.
    // try/catch로 isAgari=false 처리 → 정상 UI 흐름. debug 레벨로만 기록.
    console.debug('[engine] simulate rejected', { winTile, err })
    return emptyWinResult(winTile)
  }

  const yaku = Object.entries(result.yaku ?? {}).map(([idStr, han]) => ({
    id: parseInt(idStr, 10),
    han,
    name: YAKU_NAMES[parseInt(idStr, 10)] ?? `?${idStr}`,
  }))

  return {
    winTile,
    isAgari: result.is_agari,
    han: result.han,
    fu: result.fu,
    yakuman: result.yakuman,
    ten: result.ten,
    outgoingTen: result.outgoing_ten ?? null,
    yaku,
    bonusIppatsu: ctx.riichi ? '+1판 (리치 후 1순 내)' : '',
    bonusUradora: ctx.riichi ? '0~여러 판 (운)' : '',
  }
}

// ─── 메인 분석 함수 ──────────────────────────────────────────
export function analyze(
  calc: RiichiCalc,
  hand: TileStr[],
  ctx: WinContext
): HandAnalysis {
  if (hand.length < 13) {
    return { kind: 'incomplete', count: hand.length, needed: 13 - hand.length }
  }
  if (hand.length > 14) {
    return { kind: 'overfull', count: hand.length }
  }

  try {
    if (hand.length === 13) return analyze13(calc, hand, ctx)
    return analyze14(calc, hand, ctx)
  } catch (err) {
    console.error('[engine] analysis failed', { hand, err })
    return { kind: 'error', message: err instanceof Error ? err.message : String(err) }
  }
}

// riichi-rs 출력 타일 ID는 0-indexed (1m=0, 7z=33). 입력은 1-indexed.
// 이 라이브러리의 quirk이므로 output에 +1 해서 우리 내부 표준(1-indexed)으로 맞춘다.
function extractWaits(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  const arr = raw as number[]
  // 길이 34면 count/bitmap: 각 인덱스가 0-indexed 타일, +1로 변환
  if (arr.length === 34) {
    return arr.flatMap((v, i) => (v > 0 ? [i + 1] : []))
  }
  // ID 리스트: 0~33 → 1~34
  return [...new Set(arr)].filter((v) => v >= 0 && v <= 33).map((v) => v + 1)
}

function analyze13(calc: RiichiCalc, hand: TileStr[], ctx: WinContext): HandAnalysis {
  const r = calc({
    closed_part: hand.map(tileToId),
    open_part: [],
    calc_hairi: true,
  })
  const shanten = r.hairi?.now ?? 99
  const waitIds = extractWaits(r.hairi?.wait).sort((a, b) => a - b)
  const waits = waitIds.map(idToTile)

  console.log('[engine] analyze13', {
    input: hand,
    inputIds: hand.map(tileToId),
    shanten,
    waits,
  })

  const winResults = shanten === 0 ? waits.map((w) => simulate(calc, hand, w, ctx)) : []

  return { kind: 'tenpai', shanten, waits, winResults }
}

function analyze14(calc: RiichiCalc, hand: TileStr[], ctx: WinContext): HandAnalysis {
  // 1. hairi 계산 (discard 분석 준비) — 옵션 없이 호출하면 엔진이 throw 안 함
  const mainResult = calc({
    closed_part: hand.map(tileToId),
    open_part: [],
    calc_hairi: true,
  })
  const mainShanten = mainResult.hairi?.now ?? 99

  // 2. 화료 시뮬 — hand 안의 모든 종류 패를 "마지막 도래패"로 가정해서 각각 시도.
  //    가장 먼저 is_agari=true가 나오는 경우를 채택 (유저가 입력 순서를 신경쓰지 않아도 됨)
  let agari: WinResult | null = null
  const candidateTiles = [...new Set(hand)]
  // 우선순위: hand[hand.length-1] (마지막 입력) 먼저 시도
  const lastInput = hand[hand.length - 1]
  const orderedCandidates = [lastInput, ...candidateTiles.filter((t) => t !== lastInput)]

  for (const winTile of orderedCandidates) {
    // 그 타일을 hand에서 하나 제거한 13장 + 그 타일을 winning으로 간주
    const idx = hand.indexOf(winTile)
    const hand13 = [...hand.slice(0, idx), ...hand.slice(idx + 1)]
    const sim = simulate(calc, hand13, winTile, ctx)
    if (sim.isAgari) {
      agari = sim
      break
    }
  }

  console.log('[engine] analyze14 agari-check', {
    mainShanten,
    triedTiles: orderedCandidates,
    foundAgari: agari
      ? { winTile: agari.winTile, han: agari.han, fu: agari.fu, ten: agari.ten }
      : null,
  })

  // 3. 각 종류의 패 하나씩 버렸을 때 샨텐/대기 계산
  const uniqueDiscards = [...new Set(hand)]
  const discards: DiscardOption[] = uniqueDiscards.map((discardTile) => {
    const idx = hand.indexOf(discardTile)
    const remaining = [...hand.slice(0, idx), ...hand.slice(idx + 1)]
    const r = calc({
      closed_part: remaining.map(tileToId),
      open_part: [],
      calc_hairi: true,
    })
    const shanten = r.hairi?.now ?? 99
    const waitIds = extractWaits(r.hairi?.wait).sort((a, b) => a - b)
    const waits = waitIds.map(idToTile)
    const winResults =
      shanten === 0 ? waits.map((w) => simulate(calc, remaining, w, ctx)) : []
    return { discard: discardTile, shanten, waits, winResults }
  })

  // 정렬: 샨텐 낮을수록, 그 다음 대기패 많을수록 우선
  discards.sort((a, b) => {
    if (a.shanten !== b.shanten) return a.shanten - b.shanten
    if (a.waits.length !== b.waits.length) return b.waits.length - a.waits.length
    return 0
  })

  // discard 표시 순서: sort 후 타일 순서대로 다시 그룹화
  // (같은 샨텐 내에서 타일 순서 정렬)
  const grouped = new Map<number, DiscardOption[]>()
  for (const d of discards) {
    const list = grouped.get(d.shanten) ?? []
    list.push(d)
    grouped.set(d.shanten, list)
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => {
      // 더 많은 대기패 > 더 작은 타일 id
      if (a.waits.length !== b.waits.length) return b.waits.length - a.waits.length
      return tileToId(a.discard) - tileToId(b.discard)
    })
  }
  const flatDiscards: DiscardOption[] = []
  const shanten_keys = [...grouped.keys()].sort((a, b) => a - b)
  for (const s of shanten_keys) flatDiscards.push(...(grouped.get(s) ?? []))

  console.log('[engine] analyze14', {
    input: hand,
    mainShanten,
    agari: agari ? { han: agari.han, fu: agari.fu, ten: agari.ten } : null,
    discardsShanten: flatDiscards.map((d) => `${d.discard}→s${d.shanten}(${d.waits.length})`),
  })

  return {
    kind: 'discard',
    agari,
    discards: flatDiscards,
  }
}

// ─── 역 이름 ─────────────────────────────────────────────────
export const YAKU_NAMES: Record<number, string> = {
  0: '국사무쌍13면',
  1: '국사무쌍',
  2: '구련보등9면',
  3: '구련보등',
  4: '사암각단기',
  5: '사암각',
  6: '대사희',
  7: '소사희',
  8: '대삼원',
  9: '자일색',
  10: '녹일색',
  11: '청로두',
  12: '사깡즈',
  13: '천화',
  14: '지화',
  15: '인화',
  16: '대차륜',
  17: '청일색',
  18: '혼일색',
  19: '이페코',
  20: '순전대요구',
  21: '혼전대요구',
  22: '대대화',
  23: '혼로두',
  24: '삼깡즈',
  25: '소삼원',
  26: '삼색동각',
  27: '삼암각',
  28: '치또이츠',
  29: '더블리치',
  30: '일기통관',
  31: '삼색동순',
  32: '탕야오',
  33: '핑후',
  34: '이페코',
  35: '멘젠쯔모',
  36: '리치',
  37: '일발',
  38: '린샨카이호',
  39: '창깡',
  40: '해저로월',
  41: '하저로어',
  42: '장풍 동',
  43: '장풍 남',
  44: '장풍 서',
  45: '장풍 북',
  46: '자풍 동',
  47: '자풍 남',
  48: '자풍 서',
  49: '자풍 북',
  50: '백',
  51: '발',
  52: '중',
  53: '도라',
  54: '우라도라',
  55: '적도라',
}

// sortTiles 재-export (ResultPanel에서 편하게 쓰라고)
export { sortTiles }
