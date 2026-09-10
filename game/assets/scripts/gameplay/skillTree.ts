import type { GameConfigs, SkillBranchId, SkillNodeConfig } from "../data/types";

export type SkillNodeStatus = "unlocked" | "available" | "locked";

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
