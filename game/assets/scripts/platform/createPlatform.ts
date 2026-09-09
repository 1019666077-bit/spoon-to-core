import type { PlatformAdapter } from "./PlatformAdapter";
import { WebAdapter } from "./WebAdapter";

/** Stage 0 always returns the web mock. Stage 6 will branch on the host SDK. */
export function createPlatform(): PlatformAdapter {
  return new WebAdapter();
}
