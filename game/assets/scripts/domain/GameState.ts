export const GameStates = {
  Boot: "boot",
  Home: "home",
  Digging: "digging",
  LayerChoice: "layer_choice",
  Result: "result",
} as const;

export type GameStateId = (typeof GameStates)[keyof typeof GameStates];

const ALL: readonly GameStateId[] = [
  GameStates.Boot,
  GameStates.Home,
  GameStates.Digging,
  GameStates.LayerChoice,
  GameStates.Result,
];

export function isGameState(value: unknown): value is GameStateId {
  return typeof value === "string" && (ALL as readonly string[]).includes(value);
}

/**
 * Empire loop: home ↔ digging ↔ layer_choice.
 * boot / result stay for launch and the deprioritized backpack-return path.
 */
export function canTransition(from: GameStateId, to: GameStateId): boolean {
  if (from === to) return true;
  if (from === GameStates.Boot && (to === GameStates.Home || to === GameStates.Digging)) {
    return true;
  }
  if (from === GameStates.Home && to === GameStates.Digging) return true;
  if (
    from === GameStates.Digging &&
    (to === GameStates.Home || to === GameStates.Result || to === GameStates.LayerChoice)
  ) {
    return true;
  }
  if (from === GameStates.LayerChoice && (to === GameStates.Digging || to === GameStates.Home)) {
    return true;
  }
  if (from === GameStates.Result && to === GameStates.Home) return true;
  return false;
}
