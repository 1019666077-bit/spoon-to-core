export const CellFlag = {
  None: 0,
  Indestructible: 1,
  Gate: 2,
  Flooded: 4,
  EndRoom: 8,
  Cool: 16,
  Fossil: 32,
  Pipe: 64,
  HasRune: 128,
} as const;

export type HintKind = "none" | "item" | "treasure" | "hazard" | "secret";

export type CellState = {
  blockId: string | null;
  hp: number;
  maxHp: number;
  lootId: string | null;
  hint: HintKind;
  flags: number;
};

export type DigMap = {
  width: number;
  height: number;
  seed: number;
  layerId: string;
  cells: CellState[];
  startX: number;
  startY: number;
};

export function cellIndex(map: DigMap, x: number, y: number): number {
  return y * map.width + x;
}

export function inBounds(map: DigMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function getCell(map: DigMap, x: number, y: number): CellState | null {
  if (!inBounds(map, x, y)) return null;
  return map.cells[cellIndex(map, x, y)] ?? null;
}

export function isEmpty(cell: CellState): boolean {
  return cell.blockId === null && (cell.flags & CellFlag.Indestructible) === 0;
}

export function isWalkable(cell: CellState): boolean {
  return cell.blockId === null && (cell.flags & CellFlag.Indestructible) === 0;
}

export function isDiggable(cell: CellState, runes: number): boolean {
  if (cell.blockId === null) return false;
  if ((cell.flags & CellFlag.Indestructible) !== 0) return false;
  if ((cell.flags & CellFlag.Gate) !== 0 && runes < 2) return false;
  return true;
}

export function hasFlag(cell: CellState, flag: number): boolean {
  return (cell.flags & flag) !== 0;
}

/** 0 intact, 1 crack, 2 crack, 3 about to break. */
export function crackState(hp: number, maxHp: number): 0 | 1 | 2 | 3 {
  if (maxHp <= 0 || hp >= maxHp) return 0;
  if (hp <= 0) return 3;
  const t = hp / maxHp;
  if (t > 2 / 3) return 1;
  if (t > 1 / 3) return 2;
  return 3;
}

export const ORTHO: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

export function isAdjacent(ax: number, ay: number, bx: number, by: number): boolean {
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}
