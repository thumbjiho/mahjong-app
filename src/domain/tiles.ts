// MPS 표기법
//   1m~9m: 만수 (0m = 적5만)
//   1p~9p: 통수 (0p = 적5통)
//   1s~9s: 삭수 (0s = 적5삭)
//   1z=동, 2z=남, 3z=서, 4z=북, 5z=백, 6z=발, 7z=중

export type Suit = 'm' | 'p' | 's' | 'z'
export type TileStr = string // e.g. "3m", "0p", "4z"

// riichi-rs의 Tile ID (1~34)로 변환 — 적도라는 일반 5와 같은 ID
const BASE_ID: Record<Suit, number> = { m: 0, p: 9, s: 18, z: 27 }

export function tileToId(tile: TileStr): number {
  const num = parseInt(tile[0], 10)
  const suit = tile[1] as Suit
  if (suit === 'z') return BASE_ID.z + num // 1z→28 ... 7z→34
  if (num === 0) return BASE_ID[suit] + 5 // 적5 → 일반5 ID
  return BASE_ID[suit] + num
}

export function isAka(tile: TileStr): boolean {
  return tile[0] === '0'
}

// ID → 대표 MPS (적도라 구분 안 함 → 5 반환)
export function idToTile(id: number): TileStr {
  if (id >= 1 && id <= 9) return `${id}m`
  if (id >= 10 && id <= 18) return `${id - 9}p`
  if (id >= 19 && id <= 27) return `${id - 18}s`
  if (id >= 28 && id <= 34) return `${id - 27}z`
  throw new Error(`invalid tile id: ${id}`)
}

// 정렬 키: 만→통→삭→자, 적도라는 5와 같은 자리
export function sortKey(tile: TileStr): number {
  const id = tileToId(tile)
  // 적5는 일반5 직후에 오도록 살짝 보정
  if (isAka(tile)) return id + 0.5
  return id
}

export function sortTiles(tiles: TileStr[]): TileStr[] {
  return [...tiles].sort((a, b) => sortKey(a) - sortKey(b))
}

// 표시용 한글 이름
const Z_NAMES: Record<string, string> = {
  '1z': '동', '2z': '남', '3z': '서', '4z': '북',
  '5z': '백', '6z': '발', '7z': '중',
}

export function tileName(tile: TileStr): string {
  if (tile[1] === 'z') return Z_NAMES[tile]
  if (tile[0] === '0') return `적5${suitName(tile[1] as Suit)}`
  const suit = suitName(tile[1] as Suit)
  return `${tile[0]}${suit}`
}

function suitName(s: Suit): string {
  return { m: '만', p: '통', s: '삭', z: '' }[s] ?? ''
}

// 모든 34종 타일 (적도라 제외) — 도라 표시패 선택 등에 사용
export const ALL_TILES: TileStr[] = [
  '1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m',
  '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p',
  '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s',
  '1z', '2z', '3z', '4z', '5z', '6z', '7z',
]

// picker용 — 적5를 5 바로 뒤에 끼워넣은 순서
export const PICKER_SUITS: { label: string; tiles: TileStr[] }[] = [
  { label: '만', tiles: ['1m', '2m', '3m', '4m', '5m', '0m', '6m', '7m', '8m', '9m'] },
  { label: '통', tiles: ['1p', '2p', '3p', '4p', '5p', '0p', '6p', '7p', '8p', '9p'] },
  { label: '삭', tiles: ['1s', '2s', '3s', '4s', '5s', '0s', '6s', '7s', '8s', '9s'] },
  { label: '자', tiles: ['1z', '2z', '3z', '4z', '5z', '6z', '7z'] },
]

// 손패 내 각 종류의 실제 카운트 (적5도 일반5에 합산)
export function countById(hand: TileStr[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const t of hand) {
    const id = tileToId(t)
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}
