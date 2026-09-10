import type { LayerConfig, ToolConfig } from "../data/types";

/** Clickable dirt patch for the empire dig path. No maze, no adjacency. */
export type DirtField = {
  layerId: string;
  remaining: number;
  max: number;
  scrape: number;
  clicks: number;
  color: string;
};

export function createDirtField(layer: LayerConfig, scrape = 0): DirtField {
  const max = Math.max(1, Math.floor(layer.dirtHp));
  const clamped = clamp01(scrape);
  const remaining = Math.round(max * (1 - clamped));
  return {
    layerId: layer.id,
    remaining,
    max,
    scrape: remaining <= 0 ? 1 : (max - remaining) / max,
    clicks: 0,
    color: layer.dirtColor,
  };
}

export function scrapeRatio(field: DirtField): number {
  if (field.max <= 0) return 1;
  return clamp01((field.max - field.remaining) / field.max);
}

/**
 * Subtract tool power from remaining dirt. Overflow does not chain.
 * Pure: returns a new field.
 */
export function clickDirt(
  field: DirtField,
  power: number,
): { field: DirtField; dealt: number; emptied: boolean } {
  if (field.remaining <= 0) {
    return { field: { ...field, scrape: 1 }, dealt: 0, emptied: true };
  }
  const dealt = Math.min(field.remaining, Math.max(1, Math.floor(power)));
  const remaining = field.remaining - dealt;
  const next: DirtField = {
    ...field,
    remaining,
    scrape: remaining <= 0 ? 1 : (field.max - remaining) / field.max,
    clicks: field.clicks + 1,
  };
  return { field: next, dealt, emptied: remaining <= 0 };
}

export function clickDirtWithTool(field: DirtField, tool: ToolConfig): ReturnType<typeof clickDirt> {
  return clickDirt(field, tool.power);
}

export function refillDirt(field: DirtField, amount: number): DirtField {
  const remaining = Math.min(field.max, field.remaining + Math.max(0, Math.floor(amount)));
  return {
    ...field,
    remaining,
    scrape: remaining <= 0 ? 1 : (field.max - remaining) / field.max,
  };
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
