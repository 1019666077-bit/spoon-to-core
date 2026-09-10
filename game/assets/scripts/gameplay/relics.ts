import { cloneSave, type SaveData } from "../save/SaveSchema";

export const RELIC_SLOT_CAP = 3;
export const SHARDS_PER_RELIC = 3;

export function applyRelicChip(save: SaveData): SaveData {
  const copy = cloneSave(save);
  copy.shardPieces += 1;
  if (copy.relicSlotsFilled < RELIC_SLOT_CAP && copy.shardPieces >= SHARDS_PER_RELIC) {
    copy.shardPieces -= SHARDS_PER_RELIC;
    copy.relicSlotsFilled += 1;
  }
  return copy;
}

export function relicProgressLabel(save: SaveData): string {
  return `遗物槽 ${save.relicSlotsFilled}/${RELIC_SLOT_CAP} · 拼图 ${save.shardPieces}/${SHARDS_PER_RELIC}`;
}
