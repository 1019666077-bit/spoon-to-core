import { CellFlag, getCell, inBounds, ORTHO, type DigMap } from "./MapTypes";

/**
 * Connectivity treats gates as passable (keys exist on the generated map).
 * Indestructible bedrock never is.
 */
export function canTraverse(map: DigMap, x: number, y: number): boolean {
  const cell = getCell(map, x, y);
  if (!cell) return false;
  if ((cell.flags & CellFlag.Indestructible) !== 0 && (cell.flags & CellFlag.Gate) === 0) {
    return false;
  }
  return true;
}

export function hasPathToBottom(map: DigMap, startX = map.startX, startY = map.startY): boolean {
  if (!inBounds(map, startX, startY)) return false;
  const seen = new Uint8Array(map.width * map.height);
  const qx: number[] = [startX];
  const qy: number[] = [startY];
  seen[startY * map.width + startX] = 1;
  let head = 0;
  while (head < qx.length) {
    const x = qx[head]!;
    const y = qy[head]!;
    head += 1;
    if (y === map.height - 1) return true;
    for (const [dx, dy] of ORTHO) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(map, nx, ny)) continue;
      const idx = ny * map.width + nx;
      if (seen[idx]) continue;
      if (!canTraverse(map, nx, ny)) continue;
      seen[idx] = 1;
      qx.push(nx);
      qy.push(ny);
    }
  }
  return false;
}

export function floodReachable(map: DigMap, startX: number, startY: number): Set<number> {
  const out = new Set<number>();
  if (!inBounds(map, startX, startY)) return out;
  const qx: number[] = [startX];
  const qy: number[] = [startY];
  out.add(startY * map.width + startX);
  let head = 0;
  while (head < qx.length) {
    const x = qx[head]!;
    const y = qy[head]!;
    head += 1;
    for (const [dx, dy] of ORTHO) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(map, nx, ny)) continue;
      const idx = ny * map.width + nx;
      if (out.has(idx)) continue;
      if (!canTraverse(map, nx, ny)) continue;
      out.add(idx);
      qx.push(nx);
      qy.push(ny);
    }
  }
  return out;
}
