import type { GameConfigs, ToolConfig, TreasureConfig } from "../data/types";
import { SeededRandom } from "../domain/SeededRandom";
import { BackpackGrid, type PlacedItem } from "./BackpackGrid";
import { rollDrop, isRareOrBetter } from "./DropTable";
import { generateMap } from "./MapGenerator";
import {
  CellFlag,
  crackState,
  getCell,
  hasFlag,
  inBounds,
  isAdjacent,
  isDiggable,
  ORTHO,
  type DigMap,
} from "./MapTypes";

export type HitInfo = {
  x: number;
  y: number;
  damage: number;
  crit: boolean;
  broke: boolean;
  remaining: number;
  maxHp: number;
};

export type PendingLoot = {
  treasure: TreasureConfig;
  quality: PlacedItem["quality"];
};

export type RunSnapshot = {
  runId: string;
  seed: number;
  layerId: string;
  items: PlacedItem[];
  deepest: number;
  elapsed: number;
  firstRun: boolean;
};

export type DigSessionOpts = {
  configs: GameConfigs;
  seed: number;
  layerId: string;
  tool: ToolConfig;
  staminaMax: number;
  backpack: { cols: number; rows: number };
  firstRun: boolean;
  dynamite: number;
  drinks: number;
  runId: string;
};

export class DigSession {
  readonly runId: string;
  readonly seed: number;
  readonly layerId: string;
  readonly firstRun: boolean;
  readonly map: DigMap;
  readonly backpack: BackpackGrid;
  readonly tool: ToolConfig;
  readonly configs: GameConfigs;

  playerX: number;
  playerY: number;
  stamina: number;
  maxStamina: number;
  elapsed = 0;
  deepest: number;
  holding = false;
  holdX = 0;
  holdY = 0;
  selectedX: number;
  selectedY: number;
  attackCooldown = 0;
  returnHold = 0;
  returnHeld = false;
  lastStruggle: number | null = null;
  staminaGiftUsed = false;
  timeScale = 1;
  paused = false;
  overlay: "none" | "backpack" | "fullbag" | "struggle" | "pause" = "none";
  pendingLoot: PendingLoot | null = null;
  lastHit: HitInfo | null = null;
  lastDropAt = -999;
  treasuresFound = 0;
  rareFound = 0;
  runes = 0;
  dynamite: number;
  drinks: number;
  drinksUsed = 0;
  dynamiteUsed = 0;
  cameraY = 0;
  wantsResult = false;
  dirtyHud = true;
  bagAlmostFullFired = false;
  heatTimer = 0;
  pipeTimer = 0;
  reachedEnd = false;

  private readonly combatRng: SeededRandom;
  private readonly lootRng: SeededRandom;
  private readonly lookup: Map<string, TreasureConfig>;

  constructor(opts: DigSessionOpts) {
    this.configs = opts.configs;
    this.runId = opts.runId;
    this.seed = opts.seed;
    this.layerId = opts.layerId;
    this.firstRun = opts.firstRun;
    this.tool = opts.tool;
    this.maxStamina = opts.staminaMax;
    this.stamina = opts.staminaMax;
    this.dynamite = opts.dynamite;
    this.drinks = opts.drinks;
    this.map = generateMap({
      configs: opts.configs,
      layerId: opts.layerId,
      seed: opts.seed,
      firstRun: opts.firstRun,
    });
    this.playerX = this.map.startX;
    this.playerY = this.map.startY;
    this.selectedX = this.playerX;
    this.selectedY = Math.min(this.map.height - 1, this.playerY + 1);
    this.deepest = this.playerY;
    this.backpack = new BackpackGrid(opts.backpack.cols, opts.backpack.rows);
    this.combatRng = new SeededRandom((opts.seed ^ 0x484954) >>> 0);
    this.lootRng = new SeededRandom((opts.seed ^ 0x4c4f54) >>> 0);
    this.lookup = new Map(opts.configs.treasures.map((t) => [t.id, t]));
    this.syncCamera();
  }

  treasure(id: string): TreasureConfig | undefined {
    return this.lookup.get(id);
  }

  tick(dt: number): void {
    if (this.paused || this.wantsResult) return;
    if (this.overlay === "backpack" || this.overlay === "pause") return;
    const scale = this.overlay === "fullbag" ? this.configs.rules.fullBagTimeScale : this.timeScale;
    const step = Math.min(0.1, dt) * scale;
    this.elapsed += step;
    this.syncCamera();
    this.tickHazards(step);

    if (this.lastStruggle !== null) {
      this.lastStruggle -= step;
      if (this.lastStruggle <= 0) {
        this.wantsResult = true;
        this.dirtyHud = true;
        return;
      }
    }

    if (this.returnHeld) {
      this.returnHold += step;
      if (this.returnHold >= this.configs.rules.returnHoldSeconds) {
        this.completeReturn();
        return;
      }
    }

    if (this.holding && this.pendingLoot === null && this.overlay !== "fullbag") {
      this.attackCooldown -= step;
      if (this.attackCooldown <= 0) {
        this.hitCell(this.holdX, this.holdY);
        const interval = Math.max(this.configs.rules.minAttackInterval, this.tool.attackInterval);
        this.attackCooldown = interval;
      }
    }
  }

  pointerDown(x: number, y: number): boolean {
    if (this.paused || this.wantsResult) return false;
    if (this.overlay === "backpack" || this.overlay === "pause") return false;
    if (!inBounds(this.map, x, y)) return false;
    if (!isAdjacent(this.playerX, this.playerY, x, y)) return false;
    this.selectedX = x;
    this.selectedY = y;
    this.holding = true;
    this.holdX = x;
    this.holdY = y;
    this.attackCooldown = 0;
    this.hitCell(x, y);
    this.attackCooldown = Math.max(this.configs.rules.minAttackInterval, this.tool.attackInterval);
    return true;
  }

  pointerUp(): void {
    this.holding = false;
  }

  moveSelect(dx: number, dy: number): void {
    const nx = this.playerX + dx;
    const ny = this.playerY + dy;
    if (!inBounds(this.map, nx, ny)) return;
    this.selectedX = nx;
    this.selectedY = ny;
    this.dirtyHud = true;
  }

  digSelected(): void {
    this.pointerDown(this.selectedX, this.selectedY);
    this.pointerUp();
  }

  setReturnHeld(held: boolean): void {
    this.returnHeld = held;
    if (!held) this.returnHold = 0;
  }

  completeReturn(): void {
    this.returnHeld = false;
    this.returnHold = 0;
    this.wantsResult = true;
    this.dirtyHud = true;
  }

  togglePause(on?: boolean): void {
    const next = on ?? this.overlay !== "pause";
    if (next) {
      this.paused = true;
      this.overlay = "pause";
      this.holding = false;
    } else {
      this.paused = false;
      this.overlay = this.pendingLoot ? "fullbag" : "none";
    }
    this.dirtyHud = true;
  }

  openBackpack(open: boolean): void {
    if (open) {
      this.overlay = "backpack";
      this.holding = false;
    } else if (this.pendingLoot) {
      this.overlay = "fullbag";
    } else {
      this.overlay = this.lastStruggle !== null ? "struggle" : "none";
    }
    this.dirtyHud = true;
  }

  hitCell(x: number, y: number): boolean {
    if (this.stamina <= 0 && this.lastStruggle !== null && this.lastStruggle <= 0) return false;
    if (this.pendingLoot) return false;
    if (!isAdjacent(this.playerX, this.playerY, x, y)) return false;
    const cell = getCell(this.map, x, y);
    if (!cell) return false;
    if (cell.blockId === null) {
      this.playerX = x;
      this.playerY = y;
      this.deepest = Math.max(this.deepest, y);
      if (hasFlag(cell, CellFlag.EndRoom)) this.reachedEnd = true;
      this.dirtyHud = true;
      return true;
    }
    if (!isDiggable(cell, this.runes)) {
      this.lastHit = { x, y, damage: 0, crit: false, broke: false, remaining: cell.hp, maxHp: cell.maxHp };
      this.dirtyHud = true;
      return false;
    }

    let cost = this.configs.rules.staminaPerHit;
    if (hasFlag(cell, CellFlag.Flooded) || this.standingInFlood()) {
      cost = Math.ceil(cost * this.configs.rules.floodedStaminaMul);
    }
    this.spendStamina(cost);

    const crit = this.combatRng.next() < this.configs.rules.critChance;
    let damage = this.tool.power * (crit ? this.configs.rules.critMultiplier : 1);
    if (damage > cell.hp) damage = cell.hp;
    cell.hp -= damage;
    const broke = cell.hp <= 0;
    this.lastHit = {
      x,
      y,
      damage,
      crit,
      broke,
      remaining: Math.max(0, cell.hp),
      maxHp: cell.maxHp,
    };
    this.dirtyHud = true;

    if (!broke) return true;

    const lootId = cell.lootId;
    const fossil = hasFlag(cell, CellFlag.Fossil);
    cell.blockId = null;
    cell.hp = 0;
    cell.maxHp = 0;
    cell.lootId = null;
    cell.hint = "none";
    if (hasFlag(cell, CellFlag.Gate)) cell.flags = CellFlag.None;
    this.playerX = x;
    this.playerY = y;
    this.deepest = Math.max(this.deepest, y);
    if (hasFlag(cell, CellFlag.EndRoom)) this.reachedEnd = true;

    if (lootId) {
      const t = this.lookup.get(lootId);
      if (t) this.offerLoot(t, fossil ? "broken" : "normal");
    } else {
      this.tryTimeDrop(fossil);
    }
    return true;
  }

  tryPlacePending(): boolean {
    if (!this.pendingLoot) return false;
    const placed = this.backpack.autoPlace(this.pendingLoot.treasure, { quality: this.pendingLoot.quality });
    if (!placed.ok) {
      this.overlay = "fullbag";
      this.dirtyHud = true;
      return false;
    }
    this.onTreasurePlaced(this.pendingLoot.treasure);
    this.pendingLoot = null;
    this.overlay = this.lastStruggle !== null ? "struggle" : "none";
    this.syncBagPressure();
    this.dirtyHud = true;
    return true;
  }

  discardPending(): void {
    this.pendingLoot = null;
    this.overlay = this.lastStruggle !== null ? "struggle" : "none";
    this.dirtyHud = true;
  }

  rotateItem(id: string): boolean {
    const item = this.backpack.items.find((it) => it.instanceId === id);
    if (!item) return false;
    const t = this.lookup.get(item.treasureId);
    if (!t) return false;
    const ok = this.backpack.rotate(id, t);
    if (ok) this.dirtyHud = true;
    return ok;
  }

  moveItem(id: string, x: number, y: number): boolean {
    const ok = this.backpack.moveOrSwap(id, x, y, (tid) => this.lookup.get(tid)!);
    if (ok) this.dirtyHud = true;
    return ok;
  }

  discardItem(id: string, confirmed = false): boolean {
    const item = this.backpack.items.find((it) => it.instanceId === id);
    if (!item) return false;
    const t = this.lookup.get(item.treasureId);
    if (!t) return false;
    if ((t.rarity === "legendary" || t.rarity === "absurd") && !confirmed) return false;
    this.backpack.discard(id, t);
    this.syncBagPressure();
    if (this.pendingLoot) this.tryPlacePending();
    this.dirtyHud = true;
    return true;
  }

  insureItem(id: string): boolean {
    const ok = this.backpack.insure(id, this.configs.rules.insureSlotsBase);
    if (ok) this.dirtyHud = true;
    return ok;
  }

  useDynamite(): boolean {
    if (this.dynamite <= 0 || this.dynamiteUsed >= 3) return false;
    if (this.firstRun && this.elapsed < 1) return false;
    this.dynamite -= 1;
    this.dynamiteUsed += 1;
    const targets = [{ x: this.playerX, y: this.playerY }, ...ORTHO.map(([dx, dy]) => ({ x: this.playerX + dx, y: this.playerY + dy }))];
    for (const t of targets) {
      const cell = getCell(this.map, t.x, t.y);
      if (!cell || !cell.blockId) continue;
      if ((cell.flags & CellFlag.Indestructible) !== 0 && (cell.flags & CellFlag.Gate) === 0) continue;
      if ((cell.flags & CellFlag.Gate) !== 0 && this.runes < 2) continue;
      const fossil = hasFlag(cell, CellFlag.Fossil);
      const lootId = cell.lootId;
      cell.blockId = null;
      cell.hp = 0;
      cell.maxHp = 0;
      cell.lootId = null;
      if (lootId) {
        const treasure = this.lookup.get(lootId);
        if (treasure) this.offerLoot(treasure, fossil ? "broken" : "normal");
      }
    }
    this.dirtyHud = true;
    return true;
  }

  useDrink(): boolean {
    if (this.drinks <= 0 || this.drinksUsed >= 2) return false;
    this.drinks -= 1;
    this.drinksUsed += 1;
    this.stamina = Math.min(this.maxStamina, this.stamina + 30);
    if (this.lastStruggle !== null && this.stamina > 0) {
      this.lastStruggle = null;
      this.overlay = "none";
    }
    this.dirtyHud = true;
    return true;
  }

  snapshot(): RunSnapshot {
    return {
      runId: this.runId,
      seed: this.seed,
      layerId: this.layerId,
      items: this.backpack.snapshot(),
      deepest: this.deepest,
      elapsed: this.elapsed,
      firstRun: this.firstRun,
    };
  }

  depthMeters(): number {
    const layer = this.configs.layers.find((l) => l.id === this.layerId);
    if (!layer) return this.playerY;
    const t = this.map.height <= 1 ? 0 : this.playerY / (this.map.height - 1);
    return layer.depthMin + t * (layer.depthMax - layer.depthMin);
  }

  crackAt(x: number, y: number): 0 | 1 | 2 | 3 {
    const cell = getCell(this.map, x, y);
    if (!cell || !cell.blockId) return 0;
    return crackState(cell.hp, cell.maxHp);
  }

  lowStamina(): boolean {
    return this.stamina <= this.maxStamina * this.configs.rules.lowStaminaRatio;
  }

  private offerLoot(treasure: TreasureConfig, quality: PlacedItem["quality"]): void {
    const placed = this.backpack.autoPlace(treasure, { quality });
    if (placed.ok) {
      this.onTreasurePlaced(treasure);
      this.syncBagPressure();
      return;
    }
    this.pendingLoot = { treasure, quality };
    this.overlay = "fullbag";
    this.dirtyHud = true;
  }

  private onTreasurePlaced(treasure: TreasureConfig): void {
    this.treasuresFound += 1;
    if (isRareOrBetter(treasure.rarity)) this.rareFound += 1;
    if (treasure.id === "rune_shard") this.runes += 1;
    this.lastDropAt = this.elapsed;
  }

  private tryTimeDrop(fossil: boolean): void {
    const drop = rollDrop({
      elapsed: this.elapsed,
      treasuresFound: this.treasuresFound,
      rareFound: this.rareFound,
      isFirstRun: this.firstRun,
      secondsSinceLastDrop: this.elapsed - this.lastDropAt,
      layerId: this.layerId,
      rng: this.lootRng,
      configs: this.configs,
    });
    if (!drop) return;
    this.offerLoot(drop.treasure, fossil ? "broken" : "normal");
  }

  private spendStamina(amount: number): void {
    this.stamina = Math.max(0, this.stamina - amount);
    if (this.stamina > 0) return;
    if (this.firstRun && !this.staminaGiftUsed) {
      this.staminaGiftUsed = true;
      this.stamina = this.configs.rules.firstRunStaminaGift;
      this.dirtyHud = true;
      return;
    }
    if (this.lastStruggle === null) {
      this.lastStruggle = this.configs.rules.lastStruggleSeconds;
      this.overlay = "struggle";
      this.holding = false;
    }
  }

  private standingInFlood(): boolean {
    const cell = getCell(this.map, this.playerX, this.playerY);
    return !!cell && hasFlag(cell, CellFlag.Flooded);
  }

  private tickHazards(dt: number): void {
    if (this.firstRun) return;
    const layer = this.configs.layers.find((l) => l.id === this.layerId);
    if (!layer) return;
    if (layer.hazards.includes("leaky_pipe")) {
      this.pipeTimer += dt;
      if (this.pipeTimer >= 8) {
        this.pipeTimer = 0;
        for (const [dx, dy] of ORTHO) {
          const cell = getCell(this.map, this.playerX + dx, this.playerY + dy);
          if (cell && hasFlag(cell, CellFlag.Pipe)) {
            this.spendStamina(this.configs.rules.hazardStaminaPenalty);
          }
        }
      }
    }
    if (layer.hazards.includes("heat_wave")) {
      this.heatTimer += dt;
      if (this.heatTimer >= 12) {
        this.heatTimer = 0;
        const here = getCell(this.map, this.playerX, this.playerY);
        if (!here || !hasFlag(here, CellFlag.Cool)) {
          this.spendStamina(this.configs.rules.hazardStaminaPenalty);
        }
      }
    }
  }

  private syncBagPressure(): void {
    const full = this.backpack.fillRatio >= 1 || this.pendingLoot !== null;
    const almost = this.backpack.fillRatio >= this.configs.rules.bagAlmostFullRatio;
    if (full) {
      this.overlay = "fullbag";
      this.timeScale = this.configs.rules.fullBagTimeScale;
    } else if (this.overlay === "fullbag") {
      this.overlay = "none";
      this.timeScale = 1;
    }
    if (almost && !this.bagAlmostFullFired) this.bagAlmostFullFired = true;
  }

  private syncCamera(): void {
    const vis = this.configs.rules.visibleRows;
    const target = this.playerY - Math.floor(vis / 2);
    const max = Math.max(0, this.map.height - vis);
    this.cameraY = Math.max(0, Math.min(max, target));
  }
}
