export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "absurd",
] as const;

export type Rarity = (typeof RARITIES)[number];

export type BlockConfig = {
  id: string;
  nameZh: string;
  nameEn: string;
  hp: number;
  color: string;
};

export type TreasureConfig = {
  id: string;
  nameZh: string;
  nameEn: string;
  rarity: Rarity;
  value: number;
  /** Occupied cells. 1 = filled, 0 = empty. Must keep the actual matrix, not just cell count. */
  shape: number[][];
  layerId: string;
  color: string;
};

export const TOOL_FORMS = ["bowl", "shovel", "scoop", "auger"] as const;

export type ToolForm = (typeof TOOL_FORMS)[number];

export type ToolConfig = {
  id: string;
  nameZh: string;
  nameEn: string;
  power: number;
  attackInterval: number;
  price: number;
  /** Empire growth: start as a bowl, then a shovel, then modified forms. */
  form: ToolForm;
};

export const LAYER_PLAY_MODES = ["dirt_field", "legacy_grid"] as const;

export type LayerPlayMode = (typeof LAYER_PLAY_MODES)[number];

export type LayerConfig = {
  id: string;
  nameZh: string;
  nameEn: string;
  depthMin: number;
  depthMax: number;
  blockIds: string[];
  blockWeights: Record<string, number>;
  treasureIds: string[];
  recommendedPower: number;
  generator: string;
  hazards: string[];
  /** Clickable dirt patch HP. Maze generation is a deprioritized leftover. */
  dirtHp: number;
  dirtColor: string;
  scrapeTarget: number;
  playMode: LayerPlayMode;
};

export const SKILL_BRANCHES = ["vessel", "crew", "stratum", "hoard", "rift"] as const;

export type SkillBranchId = (typeof SKILL_BRANCHES)[number];

export type WorkerConfig = {
  id: string;
  nameZh: string;
  nameEn: string;
  slot: number;
  hirePrice: number;
  digRate: number;
  blurbZh: string;
  blurbEn: string;
};

export type SkillNodeConfig = {
  id: string;
  nameZh: string;
  nameEn: string;
  branch: SkillBranchId;
  requires: string[];
  tier: number;
};

export type StaminaUpgradeTier = {
  level: number;
  max: number;
  price: number;
};

export type BackpackUpgradeTier = {
  level: number;
  cols: number;
  rows: number;
  price: number;
};

export type UpgradeConfig = {
  stamina: StaminaUpgradeTier[];
  backpack: BackpackUpgradeTier[];
};

export type ConsumableConfig = {
  id: string;
  nameZh: string;
  nameEn: string;
  price: number;
  maxPerRun: number;
};

export type RulesConfig = {
  mapWidth: number;
  mapDepth: number;
  cellSize: number;
  visibleRows: number;
  critChance: number;
  critMultiplier: number;
  staminaPerHit: number;
  lowStaminaRatio: number;
  lastStruggleSeconds: number;
  returnHoldSeconds: number;
  fullBagTimeScale: number;
  firstTreasureSeconds: number;
  firstRareSeconds: number;
  dropIntervalMin: number;
  dropIntervalMax: number;
  firstRunMinGold: number;
  firstRunStaminaGift: number;
  firstFindBonus: number;
  insureSlotsBase: number;
  tutorialSeed: number;
  bagAlmostFullRatio: number;
  hazardStaminaPenalty: number;
  floodedStaminaMul: number;
  tutorialTextMaxChars: number;
  minAttackInterval: number;
};

export type GameConfigs = {
  blocks: BlockConfig[];
  treasures: TreasureConfig[];
  tools: ToolConfig[];
  layers: LayerConfig[];
  upgrades: UpgradeConfig;
  consumables: ConsumableConfig[];
  rules: RulesConfig;
  workers: WorkerConfig[];
  skillNodes: SkillNodeConfig[];
};

export const CONFIG_ID_PATTERN = /^[a-z][a-z0-9_]*$/;

export const RARITY_COLORS: Record<Rarity, string> = {
  common: "#9A9A9A",
  uncommon: "#3D9E5F",
  rare: "#3B82C4",
  epic: "#8B5CF6",
  legendary: "#E8B84A",
  absurd: "#E07A2F",
};
