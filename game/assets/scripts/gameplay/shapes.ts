export type CellOffset = { x: number; y: number };

export function rotateShapeOnce(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0]?.length ?? 0;
  const next: number[][] = [];
  for (let c = 0; c < cols; c += 1) {
    const row: number[] = [];
    for (let r = rows - 1; r >= 0; r -= 1) {
      row.push(shape[r]?.[c] === 1 ? 1 : 0);
    }
    next.push(row);
  }
  return next;
}

export function rotateShape(shape: number[][], turns: number): number[][] {
  let current = shape.map((row) => row.slice());
  const n = ((turns % 4) + 4) % 4;
  for (let i = 0; i < n; i += 1) current = rotateShapeOnce(current);
  return current;
}

export function shapeCells(shape: number[][]): CellOffset[] {
  const cells: CellOffset[] = [];
  for (let y = 0; y < shape.length; y += 1) {
    const row = shape[y] ?? [];
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === 1) cells.push({ x, y });
    }
  }
  return cells;
}

export function shapeSize(shape: number[][]): { w: number; h: number } {
  return { w: shape[0]?.length ?? 0, h: shape.length };
}
