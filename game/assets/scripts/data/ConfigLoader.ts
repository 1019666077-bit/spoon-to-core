import { validateConfigs } from "./ConfigValidator";
import type { GameConfigs } from "./types";

export class ConfigLoadError extends Error {
  readonly errors: { path: string; message: string }[];

  constructor(errors: { path: string; message: string }[]) {
    super(`Invalid game config: ${errors.map((e) => `${e.path} ${e.message}`).join("; ")}`);
    this.name = "ConfigLoadError";
    this.errors = errors;
  }
}

export function loadConfigs(raw: unknown): GameConfigs {
  const result = validateConfigs(raw);
  if (!result.ok) throw new ConfigLoadError(result.errors);
  return result.configs;
}
