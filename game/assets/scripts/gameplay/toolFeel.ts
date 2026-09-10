import type { ToolConfig, ToolForm } from "../data/types";

/** Named bowl → shovel jump used by stage 1′ tests and HUD copy. */
export const BOWL_TOOL_ID = "chipped_bowl";
export const HEARTH_SHOVEL_ID = "hearth_shovel";
export const YARD_IRON_SHOVEL_ID = "yard_iron_shovel";

export type SwingBonuses = {
  bonusPower: number;
  surgeMul: number;
};

export function scoopPower(tool: ToolConfig, bonuses: SwingBonuses = { bonusPower: 0, surgeMul: 1 }): number {
  const surge = bonuses.surgeMul > 0 ? bonuses.surgeMul : 1;
  return Math.max(1, Math.floor((tool.power + Math.max(0, bonuses.bonusPower)) * surge));
}

export function scoopInterval(tool: ToolConfig): number {
  return Math.max(0.05, tool.attackInterval);
}

export function formIsShovelLike(form: ToolForm): boolean {
  return form === "shovel" || form === "scoop" || form === "auger";
}

/**
 * Perceptible bowl → first-shovel delta.
 * Stage 1′ requires the test to name both sides of this jump.
 */
export function bowlToShovelDelta(
  bowl: ToolConfig,
  shovel: ToolConfig,
): { powerGain: number; intervalCut: number } {
  return {
    powerGain: shovel.power - bowl.power,
    intervalCut: bowl.attackInterval - shovel.attackInterval,
  };
}
