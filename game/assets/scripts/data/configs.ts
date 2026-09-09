import type { GameConfigs } from "./types";

/** Stage 0 minimum content. JSON mirrors live in assets/config and assets/resources/config. */
export const CONFIG_BUNDLE: GameConfigs = {
  blocks: [
    { id: "loose_soil", nameZh: "松土", nameEn: "Loose Soil", hp: 1, color: "#C4A574" },
    { id: "clay", nameZh: "黏土", nameEn: "Clay", hp: 2, color: "#8B5A2B" },
    { id: "rubble", nameZh: "碎石", nameEn: "Rubble", hp: 4, color: "#7A7A72" },
    { id: "hard_rock", nameZh: "硬岩", nameEn: "Hard Rock", hp: 7, color: "#4A4F57" },
  ],
  treasures: [
    { id: "rusty_coin", nameZh: "生锈硬币", nameEn: "Rusty Coin", rarity: "common", value: 8, shape: [[1]] },
    { id: "dead_phone", nameZh: "没电的旧手机", nameEn: "Dead Phone", rarity: "common", value: 15, shape: [[1], [1]] },
    { id: "neighbor_key", nameZh: "邻居家的钥匙", nameEn: "Neighbor's Key", rarity: "uncommon", value: 30, shape: [[1]] },
    { id: "mud_soda", nameZh: "泥封汽水瓶", nameEn: "Muddy Soda Bottle", rarity: "uncommon", value: 42, shape: [[1], [1]] },
    { id: "old_cartridge", nameZh: "老式游戏卡带", nameEn: "Old Game Cartridge", rarity: "uncommon", value: 55, shape: [[1]] },
  ],
  tools: [
    { id: "rusty_spoon", nameZh: "生锈饭勺", nameEn: "Rusty Spoon", power: 1, attackInterval: 0.32, price: 0 },
    { id: "steel_spoon", nameZh: "加固钢勺", nameEn: "Steel Spoon", power: 2, attackInterval: 0.3, price: 150 },
  ],
  layers: [
    {
      id: "backyard",
      nameZh: "后院与城市地下",
      nameEn: "Backyard & City Underground",
      depthMin: 0,
      depthMax: 50,
      blockIds: ["loose_soil", "clay", "rubble", "hard_rock"],
    },
  ],
};
