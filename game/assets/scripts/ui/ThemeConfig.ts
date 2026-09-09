/**
 * Visual tokens for the greybox. Cocos views read this file.
 * The web preview CSS variables must stay in sync with these values.
 */
export const ThemeConfig = {
  bg: "#16110C",
  bgElevated: "#2A2118",
  bgSubtle: "#1E1711",
  kraft: "#C4A574",
  orange: "#E07A2F",
  orangePressed: "#C46824",
  fg: "#F3E6D0",
  muted: "#A89480",
  danger: "#C44536",
  soil1: "#6B4F32",
  soil2: "#4A3424",
  soil3: "#2C1C12",
  pit: "#0B0806",
  rivet: "#3D3226",
  designWidth: 1280,
  designHeight: 720,
  mainButtonWidth: 240,
  mainButtonHeight: 76,
  iconHit: 64,
} as const;

export type ThemeConfigId = typeof ThemeConfig;
