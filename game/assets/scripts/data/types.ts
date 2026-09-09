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
};

export type GameConfigs = {
  blocks: BlockConfig[];
  treasures: TreasureConfig[];
  tools: ToolConfig[];
  layers: LayerConfig[];
};

export const CONFIG_ID_PATTERN = /^[a-z][a-z0-9_]*$/;
