import type { PlatformAdapter } from "../platform/PlatformAdapter";

export class AnalyticsStub {
  constructor(private readonly platform: PlatformAdapter) {}

  report(name: string, params?: Record<string, unknown>): void {
    this.platform.reportEvent(name, params);
  }
}
