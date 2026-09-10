import type { GameConfigs, WorkerConfig } from "../data/types";
import { cloneSave, type SaveData } from "../save/SaveSchema";
import { clickDirt, type DirtField } from "./LayerDirtField";
import type { BuyResult } from "./Upgrades";

export type WorkerSlot = {
  slot: number;
  worker: WorkerConfig | null;
  hired: boolean;
};

export type WorkerTickInput = {
  field: DirtField;
  workers: readonly WorkerConfig[];
  dt: number;
  accumulator: number;
  workerMul: number;
  goldPerDirt: number;
};

export type WorkerTickResult = {
  field: DirtField;
  accumulator: number;
  dirtDealt: number;
  gold: number;
  working: boolean;
  idle: boolean;
};

export function workerById(configs: GameConfigs, id: string): WorkerConfig | undefined {
  return configs.workers.find((worker) => worker.id === id);
}

export function isHired(roster: readonly string[], id: string): boolean {
  return roster.includes(id);
}

/** One slot per configured worker, filled from the save roster. */
export function rosterSlots(configs: GameConfigs, roster: readonly string[]): WorkerSlot[] {
  return configs.workers
    .slice()
    .sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id))
    .map((worker) => ({
      slot: worker.slot,
      worker,
      hired: roster.includes(worker.id),
    }));
}

export function hiredWorkers(configs: GameConfigs, roster: readonly string[]): WorkerConfig[] {
  return roster
    .map((id) => workerById(configs, id))
    .filter((worker): worker is WorkerConfig => worker !== undefined);
}

export function hireWorker(save: SaveData, configs: GameConfigs, workerId: string): BuyResult {
  const worker = workerById(configs, workerId);
  if (!worker) return { ok: false, reason: "unknown", save };
  if (save.workerRoster.includes(workerId)) return { ok: false, reason: "max", save };
  if (save.gold < worker.hirePrice) return { ok: false, reason: "poor", save };
  const copy = cloneSave(save);
  copy.gold -= worker.hirePrice;
  copy.workerRoster = [...copy.workerRoster, workerId];
  return { ok: true, save: copy, spent: worker.hirePrice };
}

/**
 * Hired crew automatically scoop the current dirt field.
 * Accumulator stores fractional dirt so slow rates still resolve.
 */
export function tickHiredWorkers(input: WorkerTickInput): WorkerTickResult {
  const hired = input.workers.length > 0;
  if (!hired) {
    return {
      field: input.field,
      accumulator: input.accumulator,
      dirtDealt: 0,
      gold: 0,
      working: false,
      idle: false,
    };
  }
  if (input.field.remaining <= 0) {
    return {
      field: input.field,
      accumulator: input.accumulator,
      dirtDealt: 0,
      gold: 0,
      working: false,
      idle: true,
    };
  }
  const rate = input.workers.reduce((sum, worker) => sum + worker.digRate, 0) * (1 + Math.max(0, input.workerMul));
  const acc = input.accumulator + rate * Math.max(0, input.dt);
  const whole = Math.floor(acc);
  const leftover = acc - whole;
  if (whole <= 0) {
    return {
      field: input.field,
      accumulator: leftover,
      dirtDealt: 0,
      gold: 0,
      working: true,
      idle: false,
    };
  }
  const scooped = clickDirt(input.field, whole);
  return {
    field: scooped.field,
    accumulator: leftover,
    dirtDealt: scooped.dealt,
    gold: scooped.dealt * Math.max(0, input.goldPerDirt),
    working: true,
    idle: false,
  };
}

export function crewStatusLabel(working: boolean, idle: boolean, hired: boolean): string {
  if (!hired) return "待雇";
  if (working) return "工作";
  if (idle) return "怠工";
  return "在编";
}
