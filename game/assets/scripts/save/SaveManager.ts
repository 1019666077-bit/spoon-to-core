import type { PlatformAdapter } from "../platform/PlatformAdapter";
import { migrateSave } from "./migrations";
import {
  createDefaultSave,
  SAVE_BACKUP_KEY,
  SAVE_KEY,
  type SaveData,
} from "./SaveSchema";

export type LoadResult = {
  save: SaveData;
  recovered: boolean;
  errors: string[];
};

export class SaveManager {
  constructor(
    private readonly platform: PlatformAdapter,
    private readonly now: () => number = () => Date.now(),
  ) {}

  load(): LoadResult {
    const primary = this.readKey(SAVE_KEY);
    if (primary.ok) {
      const migrated = migrateSave(primary.value, this.now());
      return {
        save: migrated.save,
        recovered: migrated.migrated,
        errors: migrated.errors,
      };
    }

    const backup = this.readKey(SAVE_BACKUP_KEY);
    if (backup.ok) {
      const migrated = migrateSave(backup.value, this.now());
      return {
        save: migrated.save,
        recovered: true,
        errors: ["primary-corrupt", ...migrated.errors],
      };
    }

    return {
      save: createDefaultSave(this.now()),
      recovered: true,
      errors: [primary.error ?? "missing-save"],
    };
  }

  write(save: SaveData): boolean {
    const stamped: SaveData = { ...save, lastSafeSaveAt: this.now() };
    const payload = JSON.stringify(stamped);
    const previous = this.platform.restore(SAVE_KEY);
    if (previous) {
      const backedUp = this.platform.persist(SAVE_BACKUP_KEY, previous);
      if (!backedUp) {
        this.platform.reportEvent("save_backup_failed", {});
      }
    }
    const ok = this.platform.persist(SAVE_KEY, payload);
    if (!ok) {
      this.platform.reportEvent("save_write_failed", {});
      return false;
    }
    if (!this.platform.restore(SAVE_BACKUP_KEY)) {
      this.platform.persist(SAVE_BACKUP_KEY, payload);
    }
    return true;
  }

  private readKey(key: string): { ok: true; value: unknown } | { ok: false; error: string } {
    const raw = this.platform.restore(key);
    if (raw === null || raw === undefined || raw === "") {
      return { ok: false, error: "missing-save" };
    }
    try {
      return { ok: true, value: JSON.parse(raw) as unknown };
    } catch {
      return { ok: false, error: "corrupt-json" };
    }
  }
}
