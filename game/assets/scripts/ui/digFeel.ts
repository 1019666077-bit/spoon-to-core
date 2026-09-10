import type { ToolForm } from "../data/types";
import type { DirtField } from "../gameplay/LayerDirtField";

/** Dig-field greybox size. Shared by GameView hit target and tests. */
export const DIRT_PATCH_COLS = 10;
export const DIRT_PATCH_ROWS = 6;
export const DIRT_FIELD_W = 900;
export const DIRT_FIELD_H = 400;
export const SWING_SECONDS = 0.22;
export const FLASH_SECONDS = 0.14;

/** Visible silhouette. Narrative is 碗→铲; shovel-likes share the spade drawing. */
export type ToolSilhouette = "bowl" | "shovel";

export type Vec2 = { x: number; y: number };

export type DrawCmd =
  | { kind: "fillCircle"; x: number; y: number; r: number; color: string; alpha?: number }
  | { kind: "fillEllipse"; x: number; y: number; rx: number; ry: number; color: string; alpha?: number }
  | { kind: "fillRoundRect"; x: number; y: number; w: number; h: number; r: number; color: string; alpha?: number }
  | { kind: "fillPoly"; points: Vec2[]; color: string; alpha?: number }
  | { kind: "stroke"; points: Vec2[]; color: string; width: number; alpha?: number };

export type SwingPose = {
  rotationDeg: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  crackFlash: number;
};

export type DigFeelState = {
  swingT: number;
  flashT: number;
  hitIndex: number;
  lastClicks: number;
  lastRemaining: number;
};

export type DirtPatch = {
  index: number;
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
  intact: boolean;
  crack: 0 | 1 | 2 | 3;
  hit: boolean;
};

export function toolSilhouette(form: ToolForm | string): ToolSilhouette {
  return form === "bowl" ? "bowl" : "shovel";
}

export function formLabelZh(form: ToolForm | string): string {
  if (form === "bowl") return "碗";
  if (form === "shovel") return "铲";
  if (form === "auger") return "钻铲";
  if (form === "scoop") return "舀铲";
  return form;
}

export function createDigFeel(): DigFeelState {
  return { swingT: 0, flashT: 0, hitIndex: -1, lastClicks: -1, lastRemaining: -1 };
}

export function tickDigFeel(state: DigFeelState, dt: number): DigFeelState {
  return {
    ...state,
    swingT: Math.max(0, state.swingT - Math.max(0, dt)),
    flashT: Math.max(0, state.flashT - Math.max(0, dt)),
  };
}

/**
 * First observation is silent so boot does not auto-swing.
 * Later remaining/click drops start a scoop pose + crack flash.
 */
export function noteDirtChange(
  state: DigFeelState,
  clicks: number,
  remaining: number,
  fieldMax: number,
): DigFeelState {
  if (state.lastClicks < 0) {
    return { ...state, lastClicks: clicks, lastRemaining: remaining };
  }
  const changed = clicks !== state.lastClicks || remaining < state.lastRemaining;
  if (!changed) {
    return { ...state, lastClicks: clicks, lastRemaining: remaining };
  }
  const total = DIRT_PATCH_COLS * DIRT_PATCH_ROWS;
  const intactCount = fieldMax <= 0 ? 0 : Math.round((remaining / fieldMax) * total);
  const dugCount = Math.max(0, total - intactCount);
  return {
    swingT: SWING_SECONDS,
    flashT: FLASH_SECONDS,
    hitIndex: Math.max(0, dugCount - 1),
    lastClicks: clicks,
    lastRemaining: remaining,
  };
}

export function restPose(): SwingPose {
  return { rotationDeg: -16, offsetX: 0, offsetY: 0, scale: 1, crackFlash: 0 };
}

export function swingPose(swingT: number, flashT: number, silhouette: ToolSilhouette): SwingPose {
  if (swingT <= 0 && flashT <= 0) return { ...restPose(), crackFlash: 0 };
  const t = 1 - Math.max(0, Math.min(1, swingT / SWING_SECONDS));
  const strike = t < 0.38 ? t / 0.38 : 1 - (t - 0.38) / 0.62;
  const amp = silhouette === "bowl" ? 50 : 36;
  const dip = silhouette === "bowl" ? 34 : 42;
  return {
    rotationDeg: -16 + amp * strike,
    offsetX: (silhouette === "bowl" ? 10 : 18) * strike,
    offsetY: -dip * strike,
    scale: 1 + 0.1 * strike,
    crackFlash: Math.max(0, Math.min(1, flashT / FLASH_SECONDS)),
  };
}

export function dirtProgress01(field: Pick<DirtField, "remaining" | "max">): number {
  if (field.max <= 0) return 0;
  return Math.max(0, Math.min(1, field.remaining / field.max));
}

export function dirtPatches(field: DirtField, hitIndex = -1): DirtPatch[] {
  const cols = DIRT_PATCH_COLS;
  const rows = DIRT_PATCH_ROWS;
  const total = cols * rows;
  const intactCount = Math.round(dirtProgress01(field) * total);
  const dugCount = total - intactCount;
  const gap = 5;
  const w = (DIRT_FIELD_W - gap * (cols + 1)) / cols;
  const h = (DIRT_FIELD_H - gap * (rows + 1)) / rows;
  const originX = -DIRT_FIELD_W / 2;
  const originY = -DIRT_FIELD_H / 2;
  const scrape = field.scrape;
  const patches: DirtPatch[] = [];
  for (let i = 0; i < total; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const intact = i >= dugCount;
    let crack: 0 | 1 | 2 | 3 = 0;
    if (intact) {
      if (scrape > 0.72) crack = 3;
      else if (scrape > 0.45) crack = 2;
      else       if (scrape > 0.18) crack = 1;
      if (dugCount > 0 && i === dugCount) crack = Math.max(crack, 2) as 0 | 1 | 2 | 3;
    }
    patches.push({
      index: i,
      col,
      row,
      x: originX + gap + col * (w + gap),
      y: originY + gap + (rows - 1 - row) * (h + gap),
      w,
      h,
      intact,
      crack,
      hit: i === hitIndex,
    });
  }
  return patches;
}

export function shadeHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const n = (i: number) =>
    Math.max(0, Math.min(255, parseInt(h.slice(i, i + 2), 16) + amount))
      .toString(16)
      .padStart(2, "0");
  return `#${n(0)}${n(2)}${n(4)}`;
}

export function pitBackdropCommands(): DrawCmd[] {
  return [
    {
      kind: "fillRoundRect",
      x: -DIRT_FIELD_W / 2 - 22,
      y: -DIRT_FIELD_H / 2 - 22,
      w: DIRT_FIELD_W + 44,
      h: DIRT_FIELD_H + 44,
      r: 32,
      color: "#24180F",
    },
    {
      kind: "fillRoundRect",
      x: -DIRT_FIELD_W / 2 - 8,
      y: -DIRT_FIELD_H / 2 - 8,
      w: DIRT_FIELD_W + 16,
      h: DIRT_FIELD_H + 16,
      r: 24,
      color: "#0B0806",
    },
  ];
}

export function dirtDrawCommands(field: DirtField, hitIndex: number, flash01: number): DrawCmd[] {
  const cmds = pitBackdropCommands();
  const patches = dirtPatches(field, hitIndex);
  for (const patch of patches) {
    const clod = shadeHex(field.color, ((patch.index * 13) % 5) * 8 - 16);
    if (patch.intact) {
      cmds.push({
        kind: "fillRoundRect",
        x: patch.x,
        y: patch.y,
        w: patch.w,
        h: patch.h,
        r: 8,
        color: shadeHex(clod, -22),
      });
      cmds.push({
        kind: "fillRoundRect",
        x: patch.x + 2,
        y: patch.y + 4,
        w: patch.w - 4,
        h: patch.h - 6,
        r: 7,
        color: clod,
      });
      cmds.push({
        kind: "fillRoundRect",
        x: patch.x + 4,
        y: patch.y + patch.h * 0.62,
        w: patch.w - 8,
        h: Math.max(4, patch.h * 0.22),
        r: 4,
        color: shadeHex(clod, 28),
        alpha: 140,
      });
      if (patch.crack > 0) {
        const x0 = patch.x + patch.w * 0.22;
        const y0 = patch.y + patch.h * 0.78;
        const points: Vec2[] = [
          { x: x0, y: y0 },
          { x: patch.x + patch.w * 0.42, y: patch.y + patch.h * (0.55 - patch.crack * 0.04) },
          { x: patch.x + patch.w * 0.3, y: patch.y + patch.h * 0.18 },
        ];
        if (patch.crack >= 2) {
          points.push({ x: patch.x + patch.w * 0.62, y: patch.y + patch.h * 0.42 });
        }
        if (patch.crack >= 3) {
          points.push({ x: patch.x + patch.w * 0.78, y: patch.y + patch.h * 0.16 });
        }
        cmds.push({ kind: "stroke", points, color: "#120C08", width: 1.6 + patch.crack * 0.3, alpha: 180 });
      }
    } else {
      cmds.push({
        kind: "fillRoundRect",
        x: patch.x + 3,
        y: patch.y + 3,
        w: patch.w - 6,
        h: patch.h - 6,
        r: 10,
        color: "#120C08",
      });
      cmds.push({
        kind: "fillCircle",
        x: patch.x + patch.w * 0.5,
        y: patch.y + patch.h * 0.42,
        r: Math.min(patch.w, patch.h) * 0.16,
        color: shadeHex(field.color, -40),
        alpha: 90,
      });
    }
    if (patch.hit && flash01 > 0) {
      cmds.push({
        kind: "fillRoundRect",
        x: patch.x,
        y: patch.y,
        w: patch.w,
        h: patch.h,
        r: 8,
        color: "#F3E6D0",
        alpha: Math.floor(90 * flash01),
      });
    }
  }
  const hit = patches.find((p) => p.hit);
  if (hit && flash01 > 0) cmds.push(...crumbCommands(hit, flash01));
  return cmds;
}

export function crumbCommands(patch: DirtPatch, flash01: number): DrawCmd[] {
  const cx = patch.x + patch.w / 2;
  const cy = patch.y + patch.h / 2;
  const cmds: DrawCmd[] = [];
  for (let i = 0; i < 5; i += 1) {
    const ang = 0.35 + (i / 5) * Math.PI;
    const dist = 14 + (1 - flash01) * 26;
    cmds.push({
      kind: "fillCircle",
      x: cx + Math.cos(ang) * dist,
      y: cy + Math.sin(ang) * dist + 6,
      r: 3.5 + flash01 * 3,
      color: i % 2 === 0 ? "#C4A574" : "#6B4F32",
      alpha: Math.floor(210 * flash01),
    });
  }
  return cmds;
}

export function progressBarCommands(ratio: number, width = 640, height = 18): DrawCmd[] {
  const x = -width / 2;
  const y = -height / 2;
  const fill = Math.max(6, width * Math.max(0, Math.min(1, ratio)));
  return [
    { kind: "fillRoundRect", x, y, w: width, h: height, r: 8, color: "#1E1711" },
    { kind: "fillRoundRect", x: x + 2, y: y + 2, w: fill - 4, h: height - 4, r: 6, color: "#6B4F32" },
    { kind: "fillRoundRect", x: x + 2, y: y + height * 0.45, w: fill - 4, h: 4, r: 2, color: "#C4A574", alpha: 90 },
  ];
}

/**
 * Rest-pose drawing of the chipped rice-bowl or the later spade.
 * Node transform applies swing; crackFlash only restyles the chip/crack.
 */
export function toolDrawCommands(silhouette: ToolSilhouette, crackFlash = 0): DrawCmd[] {
  return silhouette === "bowl" ? bowlCommands(crackFlash) : shovelCommands(crackFlash);
}

function bowlCommands(crackFlash: number): DrawCmd[] {
  const flash = Math.max(0, Math.min(1, crackFlash));
  const clay = "#D2B48A";
  const clayDark = "#8A6A42";
  const cavity = "#3A2718";
  const cmds: DrawCmd[] = [
    { kind: "fillRoundRect", x: -22, y: -52, w: 44, h: 16, r: 7, color: clayDark },
    { kind: "fillRoundRect", x: -14, y: -48, w: 28, h: 7, r: 3, color: "#2A2118" },
    { kind: "fillEllipse", x: 0, y: 4, rx: 64, ry: 46, color: clayDark },
    { kind: "fillEllipse", x: 0, y: 8, rx: 60, ry: 42, color: clay },
    { kind: "fillEllipse", x: 0, y: 18, rx: 44, ry: 28, color: cavity },
    { kind: "fillEllipse", x: -12, y: 26, rx: 14, ry: 8, color: "#F3E6D0", alpha: 50 },
    { kind: "fillPoly", points: [{ x: 36, y: 34 }, { x: 62, y: 22 }, { x: 54, y: 48 }], color: cavity },
    { kind: "fillPoly", points: [{ x: 38, y: 36 }, { x: 56, y: 26 }, { x: 50, y: 44 }], color: "#5A4030" },
  ];
  const crackColor = flash > 0.15 ? "#F3E6D0" : "#2A1810";
  cmds.push({
    kind: "stroke",
    points: [
      { x: 46, y: 32 },
      { x: 24, y: 12 },
      { x: 30, y: -6 },
      { x: 16, y: -22 },
    ],
    color: crackColor,
    width: 2.4 + flash * 2.2,
    alpha: 220,
  });
  if (flash > 0) {
    cmds.push({
      kind: "stroke",
      points: [
        { x: 44, y: 30 },
        { x: 20, y: 8 },
        { x: 26, y: -10 },
      ],
      color: "#E07A2F",
      width: 1.6,
      alpha: Math.floor(200 * flash),
    });
  }
  cmds.push({
    kind: "stroke",
    points: [
      { x: -48, y: 18 },
      { x: -20, y: 38 },
      { x: 18, y: 40 },
      { x: 34, y: 32 },
    ],
    color: "#E8D4B0",
    width: 2,
    alpha: 120,
  });
  return cmds;
}

function shovelCommands(crackFlash: number): DrawCmd[] {
  const flash = Math.max(0, Math.min(1, crackFlash));
  const iron = flash > 0.2 ? "#C4A574" : "#7D8794";
  return [
    { kind: "fillRoundRect", x: -8, y: -8, w: 16, h: 118, r: 6, color: "#6B4423" },
    { kind: "fillRoundRect", x: -6, y: 40, w: 12, h: 50, r: 4, color: "#8B5A2B" },
    { kind: "fillRoundRect", x: -13, y: -26, w: 26, h: 18, r: 4, color: "#C46824" },
    { kind: "fillPoly", points: [{ x: -34, y: -24 }, { x: 34, y: -24 }, { x: 42, y: -92 }, { x: -42, y: -92 }], color: iron },
    {
      kind: "fillPoly",
      points: [
        { x: -26, y: -30 },
        { x: 26, y: -30 },
        { x: 32, y: -82 },
        { x: -32, y: -82 },
      ],
      color: "#9AA3AD",
    },
    { kind: "fillRoundRect", x: -3, y: -80, w: 6, h: 52, r: 2, color: "#4A5560" },
    {
      kind: "stroke",
      points: [
        { x: -30, y: -70 },
        { x: 0, y: -84 },
        { x: 30, y: -70 },
      ],
      color: "#F3E6D0",
      width: 2,
      alpha: 80 + Math.floor(100 * flash),
    },
  ];
}

export function hasBowlCavity(cmds: readonly DrawCmd[]): boolean {
  return cmds.some((cmd) => cmd.kind === "fillEllipse" && cmd.rx >= 40 && cmd.ry >= 24 && cmd.color === "#3A2718");
}

export function hasBowlCrack(cmds: readonly DrawCmd[]): boolean {
  return cmds.some((cmd) => cmd.kind === "stroke" && cmd.points.length >= 3 && cmd.points[0]!.x > 20);
}

export function hasShovelBlade(cmds: readonly DrawCmd[]): boolean {
  return cmds.some((cmd) => cmd.kind === "fillPoly" && cmd.points.length >= 4);
}
