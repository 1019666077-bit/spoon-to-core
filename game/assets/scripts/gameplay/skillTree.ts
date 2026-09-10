import type { GameConfigs, SkillBranchId, SkillNodeConfig } from "../data/types";
import { cloneSave, type SaveData } from "../save/SaveSchema";

export type SkillNodeStatus = "unlocked" | "available" | "locked";

export const DIRT_PER_SKILL_POINT = 8;

export type SkillBonuses = {
  digPower: number;
  workerMul: number;
  unlockBreakthrough: boolean;
};

export type UnlockSkillResult =
  | { ok: true; save: SaveData }
  | { ok: false; reason: "unknown" | "locked" | "owned" | "poor"; save: SaveData };

export function skillBranches(nodes: readonly SkillNodeConfig[]): SkillBranchId[] {
  const seen: SkillBranchId[] = [];
  for (const node of nodes) {
    if (!seen.includes(node.branch)) seen.push(node.branch);
  }
  return seen;
}

export function nodesByBranch(
  nodes: readonly SkillNodeConfig[],
  branch: SkillBranchId,
): SkillNodeConfig[] {
  return nodes.filter((node) => node.branch === branch).sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
}

export function canUnlock(node: SkillNodeConfig, unlockedIds: readonly string[]): boolean {
  if (unlockedIds.includes(node.id)) return false;
  return node.requires.every((id) => unlockedIds.includes(id));
}

export function nodeStatus(node: SkillNodeConfig, unlockedIds: readonly string[]): SkillNodeStatus {
  if (unlockedIds.includes(node.id)) return "unlocked";
  if (canUnlock(node, unlockedIds)) return "available";
  return "locked";
}

export function visibleTree(
  configs: GameConfigs,
  unlockedIds: readonly string[],
): { node: SkillNodeConfig; status: SkillNodeStatus }[] {
  return configs.skillNodes.map((node) => ({ node, status: nodeStatus(node, unlockedIds) }));
}

export function skillBonuses(configs: GameConfigs, unlockedIds: readonly string[]): SkillBonuses {
  const bonuses: SkillBonuses = { digPower: 0, workerMul: 0, unlockBreakthrough: false };
  for (const node of configs.skillNodes) {
    if (!unlockedIds.includes(node.id)) continue;
    bonuses.digPower += node.effects.digPower ?? 0;
    bonuses.workerMul += node.effects.workerMul ?? 0;
    if (node.effects.unlockBreakthrough) bonuses.unlockBreakthrough = true;
  }
  return bonuses;
}

export function skillPointsFromDirt(prevLifetime: number, nextLifetime: number, step = DIRT_PER_SKILL_POINT): number {
  const size = Math.max(1, step);
  return Math.floor(Math.max(0, nextLifetime) / size) - Math.floor(Math.max(0, prevLifetime) / size);
}

export function unlockSkillNode(save: SaveData, configs: GameConfigs, nodeId: string): UnlockSkillResult {
  const node = configs.skillNodes.find((item) => item.id === nodeId);
  if (!node) return { ok: false, reason: "unknown", save };
  if (save.unlockedSkillNodeIds.includes(nodeId)) return { ok: false, reason: "owned", save };
  if (!canUnlock(node, save.unlockedSkillNodeIds)) return { ok: false, reason: "locked", save };
  const cost = Math.max(1, node.cost);
  if (save.skillPoints < cost) return { ok: false, reason: "poor", save };
  const copy = cloneSave(save);
  copy.skillPoints -= cost;
  copy.unlockedSkillNodeIds = [...copy.unlockedSkillNodeIds, nodeId];
  return { ok: true, save: copy };
}
