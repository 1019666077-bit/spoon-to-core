export const TUTORIAL_STEPS = [
  { id: "dig_first", text: "点旁边那格土", event: "block_broken" },
  { id: "first_treasure", text: "挖出第一件宝物", event: "treasure_got" },
  { id: "bag_almost_full", text: "背包快满了", event: "bag_almost_full" },
  { id: "sort_bag", text: "拖动整理背包", event: "bag_sorted" },
  { id: "return", text: "长按返程回家", event: "returned" },
  { id: "settle", text: "出售本局宝物", event: "settled" },
  { id: "upgrade_bag", text: "升级更大背包", event: "upgraded_backpack" },
  { id: "second_run", text: "再次出发挖掘", event: "second_run_started" },
] as const;

export type TutorialStepId = (typeof TUTORIAL_STEPS)[number]["id"];
export type TutorialEvent = (typeof TUTORIAL_STEPS)[number]["event"];

export type TutorialState = {
  completed: boolean;
  stepIndex: number;
};

export function createTutorial(completed = false, stepIndex = 0): TutorialState {
  return { completed, stepIndex: completed ? TUTORIAL_STEPS.length : stepIndex };
}

export function currentStep(state: TutorialState): (typeof TUTORIAL_STEPS)[number] | null {
  if (state.completed) return null;
  return TUTORIAL_STEPS[state.stepIndex] ?? null;
}

export function tutorialText(state: TutorialState): string | null {
  return currentStep(state)?.text ?? null;
}

/**
 * Event-driven only. Illegal / out-of-order events are ignored.
 */
export function advanceTutorial(state: TutorialState, event: string): TutorialState {
  if (state.completed) return state;
  const step = TUTORIAL_STEPS[state.stepIndex];
  if (!step) return { completed: true, stepIndex: TUTORIAL_STEPS.length };
  if (step.event !== event) return state;
  const next = state.stepIndex + 1;
  if (next >= TUTORIAL_STEPS.length) return { completed: true, stepIndex: next };
  return { completed: false, stepIndex: next };
}

export function chineseCharCount(text: string): number {
  const chars = Array.from(text.replace(/\s+/g, ""));
  return chars.length;
}
