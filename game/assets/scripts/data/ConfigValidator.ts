import {
  CONFIG_ID_PATTERN,
  LAYER_PLAY_MODES,
  RARITIES,
  SKILL_BRANCHES,
  TOOL_FORMS,
  type BackpackUpgradeTier,
  type BlockConfig,
  type ConsumableConfig,
  type GameConfigs,
  LOOT_KINDS,
  type LayerConfig,
  type LayerPlayMode,
  type LootConfig,
  type LootKind,
  type Rarity,
  type RulesConfig,
  type SkillBranchId,
  type SkillNodeConfig,
  type SkillNodeEffect,
  type StaminaUpgradeTier,
  type ToolConfig,
  type ToolForm,
  type TreasureConfig,
  type WorkerConfig,
} from "./types";


export type ConfigError = {
  path: string;
  message: string;
};

export type ConfigValidationResult =
  | { ok: true; configs: GameConfigs; errors: [] }
  | { ok: false; configs: null; errors: ConfigError[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pushUnique(ids: Set<string>, id: string, path: string, errors: ConfigError[]): void {
  if (ids.has(id)) {
    errors.push({ path, message: `duplicate id "${id}"` });
    return;
  }
  ids.add(id);
}

function checkId(id: string, path: string, errors: ConfigError[]): void {
  if (!CONFIG_ID_PATTERN.test(id)) {
    errors.push({ path, message: `invalid id "${id}"` });
  }
}

function parseBlock(raw: unknown, path: string, errors: ConfigError[]): BlockConfig | null {
  if (!isRecord(raw)) {
    errors.push({ path, message: "expected object" });
    return null;
  }
  const id = asString(raw.id);
  const nameZh = asString(raw.nameZh);
  const nameEn = asString(raw.nameEn);
  const hp = asFiniteNumber(raw.hp);
  const color = asString(raw.color);
  if (!id || !nameZh || !nameEn || hp === null || !color) {
    errors.push({ path, message: "missing id, nameZh, nameEn, hp, or color" });
    return null;
  }
  checkId(id, `${path}.id`, errors);
  if (hp < 1 || !Number.isInteger(hp)) {
    errors.push({ path: `${path}.hp`, message: "hp must be an integer >= 1" });
  }
  return { id, nameZh, nameEn, hp, color };
}

function parseShape(raw: unknown, path: string, errors: ConfigError[]): number[][] | null {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push({ path, message: "shape must be a non-empty matrix" });
    return null;
  }
  const shape: number[][] = [];
  let filled = 0;
  for (let r = 0; r < raw.length; r += 1) {
    const row = raw[r];
    if (!Array.isArray(row) || row.length === 0) {
      errors.push({ path: `${path}[${r}]`, message: "shape row must be a non-empty array" });
      return null;
    }
    const parsed: number[] = [];
    for (let c = 0; c < row.length; c += 1) {
      const cell = row[c];
      if (cell !== 0 && cell !== 1) {
        errors.push({ path: `${path}[${r}][${c}]`, message: "shape cells must be 0 or 1" });
        return null;
      }
      parsed.push(cell);
      if (cell === 1) filled += 1;
    }
    shape.push(parsed);
  }
  if (filled === 0) {
    errors.push({ path, message: "shape must contain at least one filled cell" });
  }
  return shape;
}

function parseTreasure(
  raw: unknown,
  path: string,
  errors: ConfigError[],
  layerIds: Set<string> | null,
): TreasureConfig | null {
  if (!isRecord(raw)) {
    errors.push({ path, message: "expected object" });
    return null;
  }
  const id = asString(raw.id);
  const nameZh = asString(raw.nameZh);
  const nameEn = asString(raw.nameEn);
  const rarity = asString(raw.rarity);
  const value = asFiniteNumber(raw.value);
  const layerId = asString(raw.layerId) ?? "backyard";
  const color = asString(raw.color) ?? "#9A9A9A";
  if (!id || !nameZh || !nameEn || !rarity || value === null) {
    errors.push({ path, message: "missing id, names, rarity, or value" });
    return null;
  }
  checkId(id, `${path}.id`, errors);
  if (!(RARITIES as readonly string[]).includes(rarity)) {
    errors.push({ path: `${path}.rarity`, message: `unknown rarity "${rarity}"` });
  }
  if (value < 0) {
    errors.push({ path: `${path}.value`, message: "value must be >= 0" });
  }
  if (layerIds && !layerIds.has(layerId)) {
    errors.push({ path: `${path}.layerId`, message: `unknown layer "${layerId}"` });
  }
  const shape = parseShape(raw.shape, `${path}.shape`, errors);
  if (!shape) return null;
  return {
    id,
    nameZh,
    nameEn,
    rarity: rarity as Rarity,
    value,
    shape,
    layerId,
    color,
  };
}

function parseTool(raw: unknown, path: string, errors: ConfigError[]): ToolConfig | null {
  if (!isRecord(raw)) {
    errors.push({ path, message: "expected object" });
    return null;
  }
  const id = asString(raw.id);
  const nameZh = asString(raw.nameZh);
  const nameEn = asString(raw.nameEn);
  const power = asFiniteNumber(raw.power);
  const attackInterval = asFiniteNumber(raw.attackInterval);
  const price = asFiniteNumber(raw.price);
  if (!id || !nameZh || !nameEn || power === null || attackInterval === null || price === null) {
    errors.push({ path, message: "missing id, names, power, attackInterval, or price" });
    return null;
  }
  checkId(id, `${path}.id`, errors);
  if (power < 1) errors.push({ path: `${path}.power`, message: "power must be >= 1" });
  if (attackInterval <= 0) {
    errors.push({ path: `${path}.attackInterval`, message: "attackInterval must be > 0" });
  }
  if (price < 0) errors.push({ path: `${path}.price`, message: "price must be >= 0" });
  const formRaw = asString(raw.form);
  if (!formRaw || !(TOOL_FORMS as readonly string[]).includes(formRaw)) {
    errors.push({ path: `${path}.form`, message: "form must be bowl, shovel, scoop, or auger" });
    return { id, nameZh, nameEn, power, attackInterval, price, form: "bowl" };
  }
  return { id, nameZh, nameEn, power, attackInterval, price, form: formRaw as ToolForm };
}

function parseWeights(
  raw: unknown,
  path: string,
  blockIds: string[],
  errors: ConfigError[],
): Record<string, number> {
  const weights: Record<string, number> = {};
  if (raw === undefined) {
    for (const id of blockIds) weights[id] = 1;
    return weights;
  }
  if (!isRecord(raw)) {
    errors.push({ path, message: "blockWeights must be an object" });
    for (const id of blockIds) weights[id] = 1;
    return weights;
  }
  for (const id of blockIds) {
    const w = asFiniteNumber(raw[id]);
    if (w === null || w < 0) {
      errors.push({ path: `${path}.${id}`, message: "weight must be a number >= 0" });
      weights[id] = 1;
    } else {
      weights[id] = w;
    }
  }
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum <= 0) errors.push({ path, message: "blockWeights must sum to > 0" });
  return weights;
}

function parseLayer(
  raw: unknown,
  path: string,
  blockIds: Set<string>,
  treasureIds: Set<string>,
  errors: ConfigError[],
): LayerConfig | null {
  if (!isRecord(raw)) {
    errors.push({ path, message: "expected object" });
    return null;
  }
  const id = asString(raw.id);
  const nameZh = asString(raw.nameZh);
  const nameEn = asString(raw.nameEn);
  const depthMin = asFiniteNumber(raw.depthMin);
  const depthMax = asFiniteNumber(raw.depthMax);
  if (!id || !nameZh || !nameEn || depthMin === null || depthMax === null || !Array.isArray(raw.blockIds)) {
    errors.push({ path, message: "missing id, names, depth range, or blockIds" });
    return null;
  }
  checkId(id, `${path}.id`, errors);
  if (depthMin < 0 || depthMax <= depthMin) {
    errors.push({ path: `${path}.depth`, message: "depthMax must be > depthMin, and depthMin >= 0" });
  }
  const ids: string[] = [];
  for (let i = 0; i < raw.blockIds.length; i += 1) {
    const blockId = asString(raw.blockIds[i]);
    if (!blockId) {
      errors.push({ path: `${path}.blockIds[${i}]`, message: "block id must be a string" });
      continue;
    }
    if (!blockIds.has(blockId)) {
      errors.push({ path: `${path}.blockIds[${i}]`, message: `unknown block "${blockId}"` });
    }
    ids.push(blockId);
  }
  if (ids.length === 0) {
    errors.push({ path: `${path}.blockIds`, message: "layer needs at least one block" });
  }
  const layerTreasureIds: string[] = [];
  if (Array.isArray(raw.treasureIds)) {
    raw.treasureIds.forEach((item, i) => {
      const tid = asString(item);
      if (!tid) {
        errors.push({ path: `${path}.treasureIds[${i}]`, message: "treasure id must be a string" });
        return;
      }
      if (!treasureIds.has(tid)) {
        errors.push({ path: `${path}.treasureIds[${i}]`, message: `unknown treasure "${tid}"` });
      }
      layerTreasureIds.push(tid);
    });
  }
  const recommendedPower = asFiniteNumber(raw.recommendedPower) ?? 1;
  if (recommendedPower < 1) {
    errors.push({ path: `${path}.recommendedPower`, message: "recommendedPower must be >= 1" });
  }
  const generator = asString(raw.generator) ?? id;
  const hazards: string[] = [];
  if (Array.isArray(raw.hazards)) {
    raw.hazards.forEach((item) => {
      const h = asString(item);
      if (h) hazards.push(h);
    });
  }
  const blockWeights = parseWeights(raw.blockWeights, `${path}.blockWeights`, ids, errors);
  const dirtHp = asFiniteNumber(raw.dirtHp) ?? 40;
  if (dirtHp < 1) errors.push({ path: `${path}.dirtHp`, message: "dirtHp must be >= 1" });
  const dirtColor = asString(raw.dirtColor) ?? "#C4A574";
  const scrapeTarget = asFiniteNumber(raw.scrapeTarget) ?? 1;
  if (scrapeTarget <= 0) {
    errors.push({ path: `${path}.scrapeTarget`, message: "scrapeTarget must be > 0" });
  }
  const playRaw = asString(raw.playMode) ?? "dirt_field";
  if (!(LAYER_PLAY_MODES as readonly string[]).includes(playRaw)) {
    errors.push({ path: `${path}.playMode`, message: "playMode must be dirt_field or legacy_grid" });
  }
  return {
    id,
    nameZh,
    nameEn,
    depthMin,
    depthMax,
    blockIds: ids,
    blockWeights,
    treasureIds: layerTreasureIds,
    recommendedPower,
    generator,
    hazards,
    dirtHp,
    dirtColor,
    scrapeTarget,
    playMode: playRaw as LayerPlayMode,
  };
}

function parseWorker(raw: unknown, path: string, errors: ConfigError[]): WorkerConfig | null {
  if (!isRecord(raw)) {
    errors.push({ path, message: "expected object" });
    return null;
  }
  const id = asString(raw.id);
  const nameZh = asString(raw.nameZh);
  const nameEn = asString(raw.nameEn);
  const slot = asFiniteNumber(raw.slot);
  const hirePrice = asFiniteNumber(raw.hirePrice);
  const digRate = asFiniteNumber(raw.digRate);
  const blurbZh = asString(raw.blurbZh);
  const blurbEn = asString(raw.blurbEn);
  if (
    !id ||
    !nameZh ||
    !nameEn ||
    slot === null ||
    hirePrice === null ||
    digRate === null ||
    !blurbZh ||
    !blurbEn
  ) {
    errors.push({ path, message: "missing worker fields" });
    return null;
  }
  checkId(id, `${path}.id`, errors);
  if (slot < 0 || !Number.isInteger(slot)) {
    errors.push({ path: `${path}.slot`, message: "slot must be an integer >= 0" });
  }
  if (hirePrice < 0) errors.push({ path: `${path}.hirePrice`, message: "hirePrice must be >= 0" });
  if (digRate < 0) errors.push({ path: `${path}.digRate`, message: "digRate must be >= 0" });
  return { id, nameZh, nameEn, slot, hirePrice, digRate, blurbZh, blurbEn };
}

function parseSkillNode(raw: unknown, path: string, errors: ConfigError[]): SkillNodeConfig | null {
  if (!isRecord(raw)) {
    errors.push({ path, message: "expected object" });
    return null;
  }
  const id = asString(raw.id);
  const nameZh = asString(raw.nameZh);
  const nameEn = asString(raw.nameEn);
  const branch = asString(raw.branch);
  const tier = asFiniteNumber(raw.tier);
  if (!id || !nameZh || !nameEn || !branch || tier === null) {
    errors.push({ path, message: "missing id, names, branch, or tier" });
    return null;
  }
  checkId(id, `${path}.id`, errors);
  if (!(SKILL_BRANCHES as readonly string[]).includes(branch)) {
    errors.push({ path: `${path}.branch`, message: `unknown branch "${branch}"` });
  }
  if (tier < 0 || !Number.isInteger(tier)) {
    errors.push({ path: `${path}.tier`, message: "tier must be an integer >= 0" });
  }
  const requires: string[] = [];
  if (raw.requires !== undefined) {
    if (!Array.isArray(raw.requires)) {
      errors.push({ path: `${path}.requires`, message: "requires must be an array of ids" });
    } else {
      raw.requires.forEach((item, i) => {
        const req = asString(item);
        if (!req) {
          errors.push({ path: `${path}.requires[${i}]`, message: "requirement must be a string" });
          return;
        }
        requires.push(req);
      });
    }
  }
  const cost = asFiniteNumber(raw.cost) ?? 1;
  if (cost < 1) errors.push({ path: `${path}.cost`, message: "cost must be >= 1" });
  const effects = parseSkillEffects(raw.effects, `${path}.effects`, errors);
  return { id, nameZh, nameEn, branch: branch as SkillBranchId, requires, tier, cost, effects };
}

function parseSkillEffects(raw: unknown, path: string, errors: ConfigError[]): SkillNodeEffect {
  if (raw === undefined || raw === null) return {};
  if (!isRecord(raw)) {
    errors.push({ path, message: "effects must be an object" });
    return {};
  }
  const effects: SkillNodeEffect = {};
  if (raw.digPower !== undefined) {
    const n = asFiniteNumber(raw.digPower);
    if (n === null) errors.push({ path: `${path}.digPower`, message: "must be a number" });
    else effects.digPower = n;
  }
  if (raw.workerMul !== undefined) {
    const n = asFiniteNumber(raw.workerMul);
    if (n === null) errors.push({ path: `${path}.workerMul`, message: "must be a number" });
    else effects.workerMul = n;
  }
  if (raw.unlockBreakthrough !== undefined) {
    if (typeof raw.unlockBreakthrough !== "boolean") {
      errors.push({ path: `${path}.unlockBreakthrough`, message: "must be a boolean" });
    } else {
      effects.unlockBreakthrough = raw.unlockBreakthrough;
    }
  }
  return effects;
}

function parseLoot(raw: unknown, path: string, errors: ConfigError[], layerIds: Set<string>): LootConfig | null {
  if (!isRecord(raw)) {
    errors.push({ path, message: "expected object" });
    return null;
  }
  const id = asString(raw.id);
  const nameZh = asString(raw.nameZh);
  const nameEn = asString(raw.nameEn);
  const kind = asString(raw.kind);
  const sellValue = asFiniteNumber(raw.sellValue);
  const weight = asFiniteNumber(raw.weight);
  const layerId = asString(raw.layerId) ?? "";
  if (!id || !nameZh || !nameEn || !kind || sellValue === null || weight === null) {
    errors.push({ path, message: "missing id, names, kind, sellValue, or weight" });
    return null;
  }
  checkId(id, `${path}.id`, errors);
  if (!(LOOT_KINDS as readonly string[]).includes(kind)) {
    errors.push({ path: `${path}.kind`, message: `unknown loot kind "${kind}"` });
  }
  if (sellValue < 0) errors.push({ path: `${path}.sellValue`, message: "sellValue must be >= 0" });
  if (weight < 0) errors.push({ path: `${path}.weight`, message: "weight must be >= 0" });
  if (layerId && !layerIds.has(layerId)) {
    errors.push({ path: `${path}.layerId`, message: `unknown layer "${layerId}"` });
  }
  return { id, nameZh, nameEn, kind: kind as LootKind, sellValue, weight, layerId };
}

function parseStaminaTier(raw: unknown, path: string, errors: ConfigError[]): StaminaUpgradeTier | null {
  if (!isRecord(raw)) {
    errors.push({ path, message: "expected object" });
    return null;
  }
  const level = asFiniteNumber(raw.level);
  const max = asFiniteNumber(raw.max);
  const price = asFiniteNumber(raw.price);
  if (level === null || max === null || price === null) {
    errors.push({ path, message: "missing level, max, or price" });
    return null;
  }
  if (level < 0 || max < 1 || price < 0) {
    errors.push({ path, message: "stamina tier values out of range" });
  }
  return { level, max, price };
}

function parseBackpackTier(raw: unknown, path: string, errors: ConfigError[]): BackpackUpgradeTier | null {
  if (!isRecord(raw)) {
    errors.push({ path, message: "expected object" });
    return null;
  }
  const level = asFiniteNumber(raw.level);
  const cols = asFiniteNumber(raw.cols);
  const rows = asFiniteNumber(raw.rows);
  const price = asFiniteNumber(raw.price);
  if (level === null || cols === null || rows === null || price === null) {
    errors.push({ path, message: "missing level, cols, rows, or price" });
    return null;
  }
  if (level < 0 || cols < 1 || rows < 1 || price < 0) {
    errors.push({ path, message: "backpack tier values out of range" });
  }
  return { level, cols, rows, price };
}

function parseConsumable(raw: unknown, path: string, errors: ConfigError[]): ConsumableConfig | null {
  if (!isRecord(raw)) {
    errors.push({ path, message: "expected object" });
    return null;
  }
  const id = asString(raw.id);
  const nameZh = asString(raw.nameZh);
  const nameEn = asString(raw.nameEn);
  const price = asFiniteNumber(raw.price);
  const maxPerRun = asFiniteNumber(raw.maxPerRun);
  if (!id || !nameZh || !nameEn || price === null || maxPerRun === null) {
    errors.push({ path, message: "missing id, names, price, or maxPerRun" });
    return null;
  }
  checkId(id, `${path}.id`, errors);
  if (price < 0) errors.push({ path: `${path}.price`, message: "price must be >= 0" });
  if (maxPerRun < 1) errors.push({ path: `${path}.maxPerRun`, message: "maxPerRun must be >= 1" });
  return { id, nameZh, nameEn, price, maxPerRun };
}

const RULE_DEFAULTS: RulesConfig = {
  mapWidth: 12,
  mapDepth: 40,
  cellSize: 64,
  visibleRows: 9,
  critChance: 0.05,
  critMultiplier: 2,
  staminaPerHit: 1,
  lowStaminaRatio: 0.25,
  lastStruggleSeconds: 10,
  returnHoldSeconds: 0.8,
  fullBagTimeScale: 0.2,
  firstTreasureSeconds: 20,
  firstRareSeconds: 90,
  dropIntervalMin: 6,
  dropIntervalMax: 10,
  firstRunMinGold: 90,
  firstRunStaminaGift: 20,
  firstFindBonus: 0.5,
  insureSlotsBase: 1,
  tutorialSeed: 10001,
  bagAlmostFullRatio: 0.75,
  hazardStaminaPenalty: 2,
  floodedStaminaMul: 1.3,
  tutorialTextMaxChars: 16,
  minAttackInterval: 0.12,
};

function parseRules(raw: unknown, errors: ConfigError[]): RulesConfig {
  if (raw === undefined) return { ...RULE_DEFAULTS };
  if (!isRecord(raw)) {
    errors.push({ path: "rules", message: "rules must be an object" });
    return { ...RULE_DEFAULTS };
  }
  const rules: RulesConfig = { ...RULE_DEFAULTS };
  (Object.keys(RULE_DEFAULTS) as (keyof RulesConfig)[]).forEach((key) => {
    if (raw[key] === undefined) return;
    const n = asFiniteNumber(raw[key]);
    if (n === null) {
      errors.push({ path: `rules.${key}`, message: "must be a finite number" });
      return;
    }
    if (n < 0) errors.push({ path: `rules.${key}`, message: "must be >= 0" });
    (rules[key] as number) = n;
  });
  if (rules.mapWidth < 3) errors.push({ path: "rules.mapWidth", message: "mapWidth must be >= 3" });
  if (rules.mapDepth < 8) errors.push({ path: "rules.mapDepth", message: "mapDepth must be >= 8" });
  if (rules.dropIntervalMax < rules.dropIntervalMin) {
    errors.push({ path: "rules.dropInterval", message: "dropIntervalMax must be >= dropIntervalMin" });
  }
  return rules;
}

export function validateConfigs(raw: unknown): ConfigValidationResult {
  const errors: ConfigError[] = [];
  if (!isRecord(raw)) {
    return { ok: false, configs: null, errors: [{ path: "$", message: "config root must be an object" }] };
  }
  if (!Array.isArray(raw.blocks) || raw.blocks.length === 0) {
    errors.push({ path: "blocks", message: "need at least one block" });
  }
  if (!Array.isArray(raw.treasures) || raw.treasures.length === 0) {
    errors.push({ path: "treasures", message: "need at least one treasure" });
  }
  if (!Array.isArray(raw.tools) || raw.tools.length === 0) {
    errors.push({ path: "tools", message: "need at least one tool" });
  }
  if (!Array.isArray(raw.layers) || raw.layers.length === 0) {
    errors.push({ path: "layers", message: "need at least one layer" });
  }
  const blocks: BlockConfig[] = [];
  const blockIds = new Set<string>();
  if (Array.isArray(raw.blocks)) {
    raw.blocks.forEach((item, i) => {
      const parsed = parseBlock(item, `blocks[${i}]`, errors);
      if (parsed) {
        pushUnique(blockIds, parsed.id, `blocks[${i}].id`, errors);
        blocks.push(parsed);
      }
    });
  }
  const layerIdPreview = new Set<string>();
  if (Array.isArray(raw.layers)) {
    raw.layers.forEach((item) => {
      if (isRecord(item) && typeof item.id === "string") layerIdPreview.add(item.id);
    });
  }
  const treasures: TreasureConfig[] = [];
  const treasureIds = new Set<string>();
  if (Array.isArray(raw.treasures)) {
    raw.treasures.forEach((item, i) => {
      const parsed = parseTreasure(item, `treasures[${i}]`, errors, layerIdPreview.size > 0 ? layerIdPreview : null);
      if (parsed) {
        pushUnique(treasureIds, parsed.id, `treasures[${i}].id`, errors);
        treasures.push(parsed);
      }
    });
  }
  const tools: ToolConfig[] = [];
  const toolIds = new Set<string>();
  if (Array.isArray(raw.tools)) {
    raw.tools.forEach((item, i) => {
      const parsed = parseTool(item, `tools[${i}]`, errors);
      if (parsed) {
        pushUnique(toolIds, parsed.id, `tools[${i}].id`, errors);
        tools.push(parsed);
      }
    });
  }
  const layers: LayerConfig[] = [];
  const layerIds = new Set<string>();
  if (Array.isArray(raw.layers)) {
    raw.layers.forEach((item, i) => {
      const parsed = parseLayer(item, `layers[${i}]`, blockIds, treasureIds, errors);
      if (parsed) {
        pushUnique(layerIds, parsed.id, `layers[${i}].id`, errors);
        layers.push(parsed);
      }
    });
  }

  const stamina: StaminaUpgradeTier[] = [];
  const backpack: BackpackUpgradeTier[] = [];
  if (isRecord(raw.upgrades)) {
    if (Array.isArray(raw.upgrades.stamina)) {
      raw.upgrades.stamina.forEach((item, i) => {
        const parsed = parseStaminaTier(item, `upgrades.stamina[${i}]`, errors);
        if (parsed) stamina.push(parsed);
      });
    }
    if (Array.isArray(raw.upgrades.backpack)) {
      raw.upgrades.backpack.forEach((item, i) => {
        const parsed = parseBackpackTier(item, `upgrades.backpack[${i}]`, errors);
        if (parsed) backpack.push(parsed);
      });
    }
  } else {
    errors.push({ path: "upgrades", message: "need upgrades.stamina and upgrades.backpack" });
  }
  if (stamina.length === 0) errors.push({ path: "upgrades.stamina", message: "need at least one stamina tier" });
  if (backpack.length === 0) errors.push({ path: "upgrades.backpack", message: "need at least one backpack tier" });

  const consumables: ConsumableConfig[] = [];
  const consumableIds = new Set<string>();
  if (Array.isArray(raw.consumables)) {
    raw.consumables.forEach((item, i) => {
      const parsed = parseConsumable(item, `consumables[${i}]`, errors);
      if (parsed) {
        pushUnique(consumableIds, parsed.id, `consumables[${i}].id`, errors);
        consumables.push(parsed);
      }
    });
  } else {
    errors.push({ path: "consumables", message: "need consumables array" });
  }

  const rules = parseRules(raw.rules, errors);

  const workers: WorkerConfig[] = [];
  const workerIds = new Set<string>();
  if (!Array.isArray(raw.workers) || raw.workers.length === 0) {
    errors.push({ path: "workers", message: "need at least one worker" });
  } else {
    raw.workers.forEach((item, i) => {
      const parsed = parseWorker(item, `workers[${i}]`, errors);
      if (parsed) {
        pushUnique(workerIds, parsed.id, `workers[${i}].id`, errors);
        workers.push(parsed);
      }
    });
  }

  const skillNodes: SkillNodeConfig[] = [];
  const skillIds = new Set<string>();
  if (!Array.isArray(raw.skillNodes) || raw.skillNodes.length < 40) {
    errors.push({ path: "skillNodes", message: "need at least 40 skill nodes" });
  }
  if (Array.isArray(raw.skillNodes)) {
    raw.skillNodes.forEach((item, i) => {
      const parsed = parseSkillNode(item, `skillNodes[${i}]`, errors);
      if (parsed) {
        pushUnique(skillIds, parsed.id, `skillNodes[${i}].id`, errors);
        skillNodes.push(parsed);
      }
    });
    const branches = new Set(skillNodes.map((node) => node.branch));
    if (branches.size < 4) {
      errors.push({ path: "skillNodes", message: "need at least 4 skill branches" });
    }
    skillNodes.forEach((node, i) => {
      node.requires.forEach((req, r) => {
        if (!skillIds.has(req)) {
          errors.push({
            path: `skillNodes[${i}].requires[${r}]`,
            message: `unknown skill node "${req}"`,
          });
        }
      });
    });
  }

  const loot: LootConfig[] = [];
  const lootIds = new Set<string>();
  if (!Array.isArray(raw.loot) || raw.loot.length < 15) {
    errors.push({ path: "loot", message: "need at least 15 sellable loot configs" });
  }
  if (Array.isArray(raw.loot)) {
    raw.loot.forEach((item, i) => {
      const parsed = parseLoot(item, `loot[${i}]`, errors, layerIds);
      if (parsed) {
        pushUnique(lootIds, parsed.id, `loot[${i}].id`, errors);
        loot.push(parsed);
      }
    });
  }

  if (errors.length > 0) return { ok: false, configs: null, errors };
  return {
    ok: true,
    configs: {
      blocks,
      treasures,
      tools,
      layers,
      upgrades: { stamina, backpack },
      consumables,
      rules,
      workers,
      skillNodes,
      loot,
    },
    errors: [],
  };
}
