export type AdKind = "rewarded" | "interstitial";

export type AdFailReason = "unavailable" | "cancelled" | "failed" | "hidden";

export type AdResult =
  | {
      ok: true;
      kind: AdKind;
      simulated: true;
      rewardId?: string;
      detail: string;
    }
  | {
      ok: false;
      kind: AdKind;
      simulated: true;
      reason: AdFailReason;
      rewardId?: string;
      detail: string;
    };

export type PurchaseResult = {
  ok: false;
  reason: "not-implemented";
  detail: string;
};

export interface PlatformAdapter {
  readonly id: "web" | "crazygames" | "android" | "wechat";
  initialize(): Promise<void>;
  showRewardedAd(rewardId: string): Promise<AdResult>;
  showInterstitial(): Promise<AdResult>;
  gameplayStart(): void;
  gameplayStop(): void;
  reportEvent(name: string, params?: Record<string, unknown>): void;
  persist(key: string, value: string): boolean;
  restore(key: string): string | null;
  remove(key: string): void;
  purchase(productId: string): Promise<PurchaseResult>;
  onPause(handler: () => void): () => void;
  onResume(handler: () => void): () => void;
}
