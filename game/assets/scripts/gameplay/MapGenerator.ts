import type { BlockConfig, GameConfigs, LayerConfig, TreasureConfig } from "../data/types";
import { SeededRandom } from "../domain/SeededRandom";
import { CellFlag, type CellState, type DigMap, getCell } from "./MapTypes";
import { hasPathToBottom } from "./pathfinding";

function emptyCell(): CellState {
  return { blockId: null, hp: 0, maxHp: 0, lootId: null, hint: "none", flags: 0 };
}

function filledCell(block: BlockConfig, flags = 0): CellState {
  return {
    blockId: block.id,
    hp: block.hp,
    maxHp: block.hp,
    lootId: null,
    hint: "none",
    flags,
  };
}

function pickWeighted(rng: SeededRandom, weights: Record<string, number>, fallback: string): string {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  if (entries.length === 0) return fallback;
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.next() * total;
  for (const [id, w] of entries) {
    roll -= w;
    if (roll <= 0) return id;
  }
  return entries[entries.length - 1]?.[0] ?? fallback;
}

function blockById(blocks: BlockConfig[], id: string): BlockConfig {
  const found = blocks.find((b) => b.id === id);
  if (!found) throw new Error(`unknown block "${id}"`);
  return found;
}

function softest(layer: LayerConfig, blocks: BlockConfig[]): BlockConfig {
  let best = blockById(blocks, layer.blockIds[0]!);
  for (const id of layer.blockIds) {
    const b = blockById(blocks, id);
    if (b.hp < best.hp) best = b;
  }
  return best;
}

function carvePath(map: DigMap, rng: SeededRandom, soft: BlockConfig): void {
  let x = map.startX;
  let y = map.startY;
  map.cells[y * map.width + x] = emptyCell();
  const maxSteps = map.width * map.height * 2;
  let steps = 0;
  while (y < map.height - 1 && steps < maxSteps) {
    steps += 1;
    const roll = rng.next();
    if (roll < 0.62) y += 1;
    else if (roll < 0.81) x = Math.max(0, x - 1);
    else x = Math.min(map.width - 1, x + 1);
    const cell = filledCell(soft);
    map.cells[y * map.width + x] = cell;
  }
  for (let gx = Math.max(0, x - 1); gx <= Math.min(map.width - 1, x + 1); gx += 1) {
    const cell = map.cells[(map.height - 1) * map.width + gx]!;
    if ((cell.flags & CellFlag.Indestructible) === 0) {
      map.cells[(map.height - 1) * map.width + gx] = filledCell(soft);
    }
  }
}

function buryLoot(map: DigMap, rng: SeededRandom, treasures: TreasureConfig[], count: number): void {
  if (treasures.length === 0 || count <= 0) return;
  let placed = 0;
  let guard = 0;
  while (placed < count && guard < 400) {
    guard += 1;
    const x = rng.nextInt(0, map.width);
    const y = rng.nextInt(Math.max(1, Math.floor(map.height * 0.12)), map.height - 2);
    const cell = getCell(map, x, y);
    if (!cell || !cell.blockId) continue;
    if ((cell.flags & CellFlag.Indestructible) !== 0) continue;
    if (cell.lootId) continue;
    const item = rng.pick(treasures);
    cell.lootId = item.id;
    const rare = item.rarity === "rare" || item.rarity === "epic" || item.rarity === "legendary" || item.rarity === "absurd";
    cell.hint = rare ? "treasure" : "item";
    placed += 1;
  }
}

function applyBackyard(map: DigMap, rng: SeededRandom, blocks: BlockConfig[]): void {
  const brick = blocks.find((b) => b.id === "brick");
  if (!brick) return;
  const y = 8 + rng.nextInt(0, 6);
  const x = rng.nextInt(1, map.width - 1);
  const cell = getCell(map, x, y);
  if (cell && cell.blockId) {
    cell.flags |= CellFlag.Pipe;
    cell.hint = "hazard";
  }
}

function applyLostCity(map: DigMap, rng: SeededRandom, soft: BlockConfig): void {
  const gy = Math.floor(map.height * 0.55);
  for (let x = 0; x < map.width; x += 1) {
    const cell = map.cells[gy * map.width + x]!;
    cell.flags |= CellFlag.Indestructible | CellFlag.Gate;
    cell.blockId = "ancient_brick";
    cell.hp = 8;
    cell.maxHp = 8;
  }
  const door = Math.max(1, Math.min(map.width - 2, map.startX + rng.nextInt(-2, 3)));
  const doorCell = map.cells[gy * map.width + door]!;
  doorCell.flags = CellFlag.Gate;
  doorCell.blockId = "ancient_brick";
  doorCell.hp = 8;
  doorCell.maxHp = 8;
  let buried = 0;
  for (let y = 2; y < gy && buried < 2; y += 1) {
    const x = rng.nextInt(0, map.width);
    const cell = getCell(map, x, y);
    if (!cell || !cell.blockId) continue;
    if ((cell.flags & CellFlag.Indestructible) !== 0) continue;
    cell.lootId = "rune_shard";
    cell.hint = "item";
    cell.flags |= CellFlag.HasRune;
    buried += 1;
  }
  while (buried < 2) {
    const x = (map.startX + buried) % map.width;
    const cell = map.cells[3 * map.width + x]!;
    cell.blockId = soft.id;
    cell.hp = soft.hp;
    cell.maxHp = soft.hp;
    cell.lootId = "rune_shard";
    cell.hint = "item";
    cell.flags |= CellFlag.HasRune;
    buried += 1;
  }
}

function applyDino(map: DigMap, rng: SeededRandom): void {
  for (let i = 0; i < 6; i += 1) {
    const x = rng.nextInt(0, map.width);
    const y = rng.nextInt(6, map.height - 3);
    const cell = getCell(map, x, y);
    if (cell && cell.blockId) cell.flags |= CellFlag.Fossil;
  }
}

function applyUndersea(map: DigMap, rng: SeededRandom): void {
  for (let y = Math.floor(map.height * 0.35); y < map.height - 2; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (rng.next() < 0.45) {
        const cell = map.cells[y * map.width + x]!;
        cell.flags |= CellFlag.Flooded;
      }
    }
  }
}

function applyCore(map: DigMap, rng: SeededRandom): void {
  for (let i = 0; i < 5; i += 1) {
    const x = rng.nextInt(0, map.width);
    const y = rng.nextInt(8, map.height - 2);
    const cell = getCell(map, x, y);
    if (cell) cell.flags |= CellFlag.Cool;
  }
}

function stampEndRoom(map: DigMap, soft: BlockConfig): void {
  const y0 = map.height - 2;
  for (let y = y0; y < map.height; y += 1) {
    for (let x = 1; x < map.width - 1; x += 1) {
      const cell = map.cells[y * map.width + x]!;
      if ((cell.flags & CellFlag.Indestructible) !== 0 && (cell.flags & CellFlag.Gate) === 0) continue;
      if (y === map.height - 1 && x > 2 && x < map.width - 3) {
        cell.blockId = null;
        cell.hp = 0;
        cell.maxHp = 0;
        cell.flags |= CellFlag.EndRoom;
      } else {
        cell.blockId = soft.id;
        cell.hp = soft.hp;
        cell.maxHp = soft.hp;
        cell.flags |= CellFlag.EndRoom;
      }
    }
  }
  for (let y = 0; y < map.height; y += 1) {
    for (const x of [0, map.width - 1]) {
      if (y === 0) continue;
      const cell = map.cells[y * map.width + x]!;
      if (!cell.blockId) {
        cell.blockId = soft.id;
        cell.hp = soft.hp;
        cell.maxHp = soft.hp;
      }
    }
  }
}

export type GenerateMapInput = {
  configs: GameConfigs;
  layerId: string;
  seed: number;
  firstRun?: boolean;
};

export function generateMap(input: GenerateMapInput): DigMap {
  const layer = input.configs.layers.find((l) => l.id === input.layerId) ?? input.configs.layers[0]!;
  const rules = input.configs.rules;
  const width = rules.mapWidth;
  const height = rules.mapDepth;
  const rng = new SeededRandom(input.seed);
  const startX = Math.floor(width / 2);
  const startY = 0;
  const cells: CellState[] = new Array(width * height);
  const fallback = layer.blockIds[0]!;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const id = pickWeighted(rng, layer.blockWeights, fallback);
      cells[y * width + x] = filledCell(blockById(input.configs.blocks, id));
    }
  }

  const map: DigMap = {
    width,
    height,
    seed: input.seed,
    layerId: layer.id,
    cells,
    startX,
    startY,
  };

  const soft = softest(layer, input.configs.blocks);
  carvePath(map, rng, soft);

  if (layer.generator === "lost_city") applyLostCity(map, rng, soft);
  if (layer.generator === "backyard" && !input.firstRun) applyBackyard(map, rng, input.configs.blocks);
  if (layer.generator === "dino_grave") applyDino(map, rng);
  if (layer.generator === "undersea") applyUndersea(map, rng);
  if (layer.generator === "core") applyCore(map, rng);

  stampEndRoom(map, soft);
  map.cells[startY * width + startX] = emptyCell();
  if (startX > 0) map.cells[startY * width + (startX - 1)] = emptyCell();
  if (startX < width - 1) map.cells[startY * width + (startX + 1)] = emptyCell();

  const layerTreasures = input.configs.treasures.filter((t) => layer.treasureIds.includes(t.id));
  buryLoot(map, rng, layerTreasures, input.firstRun ? 3 : 6);

  if (!hasPathToBottom(map)) {
    for (let y = 0; y < height; y += 1) {
      const cell = map.cells[y * width + startX]!;
      if ((cell.flags & CellFlag.Gate) !== 0) {
        cell.flags = CellFlag.Gate;
        cell.blockId = soft.id;
        cell.hp = soft.hp;
        cell.maxHp = soft.hp;
      } else if ((cell.flags & CellFlag.Indestructible) !== 0) {
        cell.flags = 0;
        cell.blockId = soft.id;
        cell.hp = soft.hp;
        cell.maxHp = soft.hp;
      } else if (!cell.blockId && y > 0) {
        cell.blockId = soft.id;
        cell.hp = soft.hp;
        cell.maxHp = soft.hp;
      }
    }
    map.cells[startY * width + startX] = emptyCell();
  }

  return map;
}

export function mapsEqual(a: DigMap, b: DigMap): boolean {
  if (a.width !== b.width || a.height !== b.height || a.seed !== b.seed) return false;
  for (let i = 0; i < a.cells.length; i += 1) {
    const ca = a.cells[i]!;
    const cb = b.cells[i]!;
    if (ca.blockId !== cb.blockId || ca.maxHp !== cb.maxHp || ca.lootId !== cb.lootId || ca.flags !== cb.flags) {
      return false;
    }
  }
  return true;
}
