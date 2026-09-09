import { GAME_VERSION } from "../domain/version";
import type { AdResult, PlatformAdapter, PurchaseResult } from "./PlatformAdapter";

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

function detectLocalStorage(): StorageLike | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const probe = "__spoon_to_core_probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Web mock adapter. Ads always return an explicit simulated result.
 * Stage 0 has no ad UI; CrazyGames Basic Launch must not show dead ad buttons.
 */
export class WebAdapter implements PlatformAdapter {
  readonly id = "web" as const;
  private storage: StorageLike = new MemoryStorage();
  private usingMemory = true;
  private pauseHandlers = new Set<() => void>();
  private resumeHandlers = new Set<() => void>();
  private visibilityBound = false;
  private gameplayActive = false;
  readonly events: { name: string; params?: Record<string, unknown> }[] = [];

  async initialize(): Promise<void> {
    const live = detectLocalStorage();
    if (live) {
      this.storage = live;
      this.usingMemory = false;
    }
    this.bindVisibility();
    this.reportEvent("game_boot", {
      version: GAME_VERSION,
      platform: this.id,
      storage: this.usingMemory ? "memory" : "localStorage",
    });
  }

  async showRewardedAd(rewardId: string): Promise<AdResult> {
    return {
      ok: false,
      kind: "rewarded",
      simulated: true,
      reason: "unavailable",
      rewardId,
      detail: "WebAdapter: no live ads in stage 0",
    };
  }

  async showInterstitial(): Promise<AdResult> {
    return {
      ok: false,
      kind: "interstitial",
      simulated: true,
      reason: "hidden",
      detail: "WebAdapter: interstitials hidden until Full Launch",
    };
  }

  gameplayStart(): void {
    this.gameplayActive = true;
    this.reportEvent("gameplay_start", {});
  }

  gameplayStop(): void {
    this.gameplayActive = false;
    this.reportEvent("gameplay_stop", {});
  }

  reportEvent(name: string, params?: Record<string, unknown>): void {
    this.events.push({ name, params });
    if (typeof console !== "undefined" && typeof console.debug === "function") {
      console.debug("[analytics]", name, params ?? {});
    }
  }

  persist(key: string, value: string): boolean {
    try {
      this.storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  restore(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch {
      /* ignore */
    }
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    return {
      ok: false,
      reason: "not-implemented",
      detail: `WebAdapter: purchases are out of scope (${productId})`,
    };
  }

  onPause(handler: () => void): () => void {
    this.pauseHandlers.add(handler);
    return () => this.pauseHandlers.delete(handler);
  }

  onResume(handler: () => void): () => void {
    this.resumeHandlers.add(handler);
    return () => this.resumeHandlers.delete(handler);
  }

  get isGameplayActive(): boolean {
    return this.gameplayActive;
  }

  private bindVisibility(): void {
    if (this.visibilityBound) return;
    if (typeof document === "undefined") return;
    this.visibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pauseHandlers.forEach((handler) => handler());
      } else {
        this.resumeHandlers.forEach((handler) => handler());
      }
    });
  }
}
