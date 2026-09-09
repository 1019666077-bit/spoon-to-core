import {
  CONFIG_ID_PATTERN,
  RARITIES,
  type BlockConfig,
  type GameConfigs,
  type LayerConfig,
  type Rarity,
  type ToolConfig,
  type TreasureConfig,
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

function parseTreasure(raw: unknown, path: string, errors: ConfigError[]): TreasureConfig | null {
  if (!isRecord(raw)) {
    errors.push({ path, message: "expected object" });
    return null;
  }
  const id = asString(raw.id);
  const nameZh = asString(raw.nameZh);
  const nameEn = asString(raw.nameEn);
  const rarity = asString(raw.rarity);
  const value = asFiniteNumber(raw.value);
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
  const shape = parseShape(raw.shape, `${path}.shape`, errors);
  if (!shape) return null;
  return { id, nameZh, nameEn, rarity: rarity as Rarity, value, shape };
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
  return { id, nameZh, nameEn, power, attackInterval, price };
}

function parseLayer(
  raw: unknown,
  path: string,
  blockIds: Set<string>,
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
  return { id, nameZh, nameEn, depthMin, depthMax, blockIds: ids };
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
  const treasures: TreasureConfig[] = [];
  const treasureIds = new Set<string>();
  if (Array.isArray(raw.treasures)) {
    raw.treasures.forEach((item, i) => {
      const parsed = parseTreasure(item, `treasures[${i}]`, errors);
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
      const parsed = parseLayer(item, `layers[${i}]`, blockIds, errors);
      if (parsed) {
        pushUnique(layerIds, parsed.id, `layers[${i}].id`, errors);
        layers.push(parsed);
      }
    });
  }
  if (errors.length > 0) return { ok: false, configs: null, errors };
  return { ok: true, configs: { blocks, treasures, tools, layers }, errors: [] };
}
