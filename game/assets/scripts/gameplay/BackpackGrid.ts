import type { TreasureConfig } from "../data/types";
import { rotateShape, shapeCells } from "./shapes";

export type QualityId = "broken" | "normal" | "complete" | "museum";

export type PlacedItem = {
  instanceId: string;
  treasureId: string;
  rotation: number;
  x: number;
  y: number;
  insured: boolean;
  quality: QualityId;
};

export type AutoPlaceResult =
  | { ok: true; item: PlacedItem }
  | { ok: false; reason: "no-space" };

let nextInstance = 1;

export function nextItemId(now = 0): string {
  nextInstance += 1;
  return `it-${now}-${nextInstance}`;
}

export class BackpackGrid {
  cols: number;
  rows: number;
  items: PlacedItem[] = [];
  private occup: (string | null)[];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.occup = new Array(cols * rows).fill(null);
  }

  get totalCells(): number {
    return this.cols * this.rows;
  }

  get occupiedCount(): number {
    let n = 0;
    for (const v of this.occup) if (v) n += 1;
    return n;
  }

  get fillRatio(): number {
    return this.occupiedCount / this.totalCells;
  }

  occupancy(): (string | null)[] {
    return this.occup.slice();
  }

  itemAt(x: number, y: number): PlacedItem | null {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
    const id = this.occup[y * this.cols + x];
    if (!id) return null;
    return this.items.find((it) => it.instanceId === id) ?? null;
  }

  canPlace(shape: number[][], ox: number, oy: number, ignoreId?: string): boolean {
    const cells = shapeCells(shape);
    if (cells.length === 0) return false;
    for (const c of cells) {
      const x = ox + c.x;
      const y = oy + c.y;
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return false;
      const occ = this.occup[y * this.cols + x];
      if (occ && occ !== ignoreId) return false;
    }
    return true;
  }

  autoPlace(treasure: TreasureConfig, opts?: { quality?: QualityId; instanceId?: string }): AutoPlaceResult {
    const quality = opts?.quality ?? "normal";
    const instanceId = opts?.instanceId ?? nextItemId();
    for (let rot = 0; rot < 4; rot += 1) {
      const shape = rotateShape(treasure.shape, rot);
      for (let y = 0; y < this.rows; y += 1) {
        for (let x = 0; x < this.cols; x += 1) {
          if (!this.canPlace(shape, x, y)) continue;
          const item: PlacedItem = {
            instanceId,
            treasureId: treasure.id,
            rotation: rot,
            x,
            y,
            insured: false,
            quality,
          };
          this.stamp(item, treasure);
          this.items.push(item);
          return { ok: true, item };
        }
      }
    }
    return { ok: false, reason: "no-space" };
  }

  rotate(instanceId: string, treasure: TreasureConfig): boolean {
    const item = this.items.find((it) => it.instanceId === instanceId);
    if (!item) return false;
    this.unstamp(item, treasure);
    for (let extra = 1; extra <= 4; extra += 1) {
      const rot = (item.rotation + extra) % 4;
      const shape = rotateShape(treasure.shape, rot);
      if (this.canPlace(shape, item.x, item.y, item.instanceId)) {
        item.rotation = rot;
        this.stamp(item, treasure);
        return true;
      }
      for (let y = 0; y < this.rows; y += 1) {
        for (let x = 0; x < this.cols; x += 1) {
          if (!this.canPlace(shape, x, y, item.instanceId)) continue;
          item.rotation = rot;
          item.x = x;
          item.y = y;
          this.stamp(item, treasure);
          return true;
        }
      }
    }
    this.stamp(item, treasure);
    return false;
  }

  move(instanceId: string, x: number, y: number, treasure: TreasureConfig): boolean {
    const item = this.items.find((it) => it.instanceId === instanceId);
    if (!item) return false;
    const shape = rotateShape(treasure.shape, item.rotation);
    if (!this.canPlace(shape, x, y, item.instanceId)) return false;
    this.unstamp(item, treasure);
    item.x = x;
    item.y = y;
    this.stamp(item, treasure);
    return true;
  }

  /**
   * Place `moving` at (x,y). If it overlaps a single other item, try to swap.
   */
  moveOrSwap(
    instanceId: string,
    x: number,
    y: number,
    lookup: (id: string) => TreasureConfig,
  ): boolean {
    const item = this.items.find((it) => it.instanceId === instanceId);
    if (!item) return false;
    const treasure = lookup(item.treasureId);
    const shape = rotateShape(treasure.shape, item.rotation);
    const cells = shapeCells(shape);
    const overlapped = new Set<string>();
    for (const c of cells) {
      const px = x + c.x;
      const py = y + c.y;
      if (px < 0 || py < 0 || px >= this.cols || py >= this.rows) return false;
      const occ = this.occup[py * this.cols + px];
      if (occ && occ !== instanceId) overlapped.add(occ);
    }
    if (overlapped.size === 0) return this.move(instanceId, x, y, treasure);
    if (overlapped.size !== 1) return false;
    const otherId = [...overlapped][0]!;
    const other = this.items.find((it) => it.instanceId === otherId);
    if (!other) return false;
    const otherT = lookup(other.treasureId);
    this.unstamp(item, treasure);
    this.unstamp(other, otherT);
    const oldX = item.x;
    const oldY = item.y;
    item.x = x;
    item.y = y;
    other.x = oldX;
    other.y = oldY;
    const itemFits = this.canPlace(rotateShape(treasure.shape, item.rotation), item.x, item.y, item.instanceId);
    const otherFits = this.canPlace(rotateShape(otherT.shape, other.rotation), other.x, other.y, other.instanceId);
    if (itemFits && otherFits) {
      this.stamp(item, treasure);
      this.stamp(other, otherT);
      return true;
    }
    item.x = oldX;
    item.y = oldY;
    other.x = x;
    other.y = y;
    this.stamp(item, treasure);
    this.stamp(other, otherT);
    return false;
  }

  discard(instanceId: string, treasure: TreasureConfig): PlacedItem | null {
    const idx = this.items.findIndex((it) => it.instanceId === instanceId);
    if (idx < 0) return null;
    const item = this.items[idx]!;
    this.unstamp(item, treasure);
    this.items.splice(idx, 1);
    return item;
  }

  insure(instanceId: string, slots: number): boolean {
    const item = this.items.find((it) => it.instanceId === instanceId);
    if (!item) return false;
    const used = this.items.filter((it) => it.insured).length;
    if (!item.insured && used >= slots) return false;
    item.insured = true;
    return true;
  }

  snapshot(): PlacedItem[] {
    return this.items.map((it) => ({ ...it }));
  }

  resize(cols: number, rows: number, lookup: (id: string) => TreasureConfig): void {
    const kept = this.items.map((it) => ({ ...it }));
    this.cols = cols;
    this.rows = rows;
    this.items = [];
    this.occup = new Array(cols * rows).fill(null);
    for (const it of kept) {
      const t = lookup(it.treasureId);
      const placed = this.autoPlace(t, { quality: it.quality, instanceId: it.instanceId });
      if (placed.ok) {
        placed.item.insured = it.insured;
        placed.item.rotation = it.rotation;
      }
    }
  }

  private stamp(item: PlacedItem, treasure: TreasureConfig): void {
    const shape = rotateShape(treasure.shape, item.rotation);
    for (const c of shapeCells(shape)) {
      this.occup[(item.y + c.y) * this.cols + (item.x + c.x)] = item.instanceId;
    }
  }

  private unstamp(item: PlacedItem, treasure: TreasureConfig): void {
    const shape = rotateShape(treasure.shape, item.rotation);
    for (const c of shapeCells(shape)) {
      const idx = (item.y + c.y) * this.cols + (item.x + c.x);
      if (this.occup[idx] === item.instanceId) this.occup[idx] = null;
    }
  }
}
