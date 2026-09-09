export const GameStates = {
  Boot: "boot",
  Home: "home",
  Digging: "digging",
  Result: "result",
} as const;

export type GameStateId = (typeof GameStates)[keyof typeof GameStates];

const ALL: readonly GameStateId[] = [
  GameStates.Boot,
  GameStates.Home,
  GameStates.Digging,
  GameStates.Result,
];

export function isGameState(value: unknown): value is GameStateId {
  return typeof value === "string" && (ALL as readonly string[]).includes(value);
}

export function canTransition(from: GameStateId, to: GameStateId): boolean {
  if (from === to) return true;
  if (from === GameStates.Boot && (to === GameStates.Home || to === GameStates.Digging)) {
    return true;
  }
  if (from === GameStates.Home && to === GameStates.Digging) return true;
  if (from === GameStates.Digging && (to === GameStates.Home || to === GameStates.Result)) {
    return true;
  }
  if (from === GameStates.Result && to === GameStates.Home) return true;
  return false;
}
