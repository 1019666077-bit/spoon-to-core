import type { GameConfigs, WorkerConfig } from "../data/types";

export type WorkerSlot = {
  slot: number;
  worker: WorkerConfig | null;
  hired: boolean;
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
