import type { SaveData } from "../save/SaveSchema";

export const OVERHEAT_SHOVEL_ID = "overheat_shovel";
export const OVERHEAT_NAME_ZH = "过热铲";
export const OVERHEAT_SURGE_SECONDS = 4;
export const OVERHEAT_COOLDOWN_SECONDS = 16;
export const OVERHEAT_POWER_MUL = 3;

export type BreakthroughState = {
  surgeRemaining: number;
  cooldownRemaining: number;
};

export function createBreakthrough(cooldownRemaining = 0): BreakthroughState {
  return { surgeRemaining: 0, cooldownRemaining: Math.max(0, cooldownRemaining) };
}

/** Unlocked after leaving the bowl, or by the first rift node. */
export function isBreakthroughUnlocked(save: SaveData): boolean {
  if (save.toolForm !== "bowl") return true;
  return save.unlockedSkillNodeIds.includes("rft_first_crack");
}

export function canActivateBreakthrough(state: BreakthroughState, unlocked: boolean): boolean {
  return unlocked && state.surgeRemaining <= 0 && state.cooldownRemaining <= 0;
}

export function activateBreakthrough(state: BreakthroughState): BreakthroughState | null {
  if (state.surgeRemaining > 0 || state.cooldownRemaining > 0) return null;
  return { surgeRemaining: OVERHEAT_SURGE_SECONDS, cooldownRemaining: 0 };
}

export function tickBreakthrough(state: BreakthroughState, dt: number): BreakthroughState {
  const step = Math.max(0, dt);
  if (state.surgeRemaining > 0) {
    const surge = Math.max(0, state.surgeRemaining - step);
    return {
      surgeRemaining: surge,
      cooldownRemaining: surge <= 0 ? OVERHEAT_COOLDOWN_SECONDS : 0,
    };
  }
  if (state.cooldownRemaining > 0) {
    return {
      surgeRemaining: 0,
      cooldownRemaining: Math.max(0, state.cooldownRemaining - step),
    };
  }
  return state;
}

export function surgeMultiplier(state: BreakthroughState): number {
  return state.surgeRemaining > 0 ? OVERHEAT_POWER_MUL : 1;
}
