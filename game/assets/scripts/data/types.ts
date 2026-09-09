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

export type ToolConfig = {
  id: string;
  nameZh: string;
  nameEn: string;
  power: number;
  attackInterval: number;
  price: number;
};

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
