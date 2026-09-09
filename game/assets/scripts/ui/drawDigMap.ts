import type { GameConfigs } from "../data/types";
import type { DigSession } from "../gameplay/DigSession";
import { CellFlag, getCell, hasFlag, isAdjacent } from "../gameplay/MapTypes";

export type DigLayout = {
  cell: number;
  originX: number;
  originY: number;
  cols: number;
  visRows: number;
  cameraY: number;
};

function hex(color: string, alpha = 1): string {
  if (alpha >= 1) return color;
  const h = color.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function shade(color: string, amount: number): string {
  const h = color.replace("#", "");
  const n = (i: number) => Math.max(0, Math.min(255, parseInt(h.slice(i, i + 2), 16) + amount));
  return `#${n(0).toString(16).padStart(2, "0")}${n(2).toString(16).padStart(2, "0")}${n(4).toString(16).padStart(2, "0")}`;
}

export function layoutDig(session: DigSession, width: number, height: number): DigLayout {
  const cols = session.map.width;
  const visRows = session.configs.rules.visibleRows;
  const cell = Math.max(16, Math.floor(Math.min(width / cols, height / visRows)));
  const originX = Math.floor((width - cell * cols) / 2);
  const originY = Math.floor((height - cell * visRows) / 2);
  return { cell, originX, originY, cols, visRows, cameraY: session.cameraY };
}

export function cellAt(layout: DigLayout, px: number, py: number): { x: number; y: number } | null {
  const x = Math.floor((px - layout.originX) / layout.cell);
  const localY = Math.floor((py - layout.originY) / layout.cell);
  if (x < 0 || x >= layout.cols || localY < 0 || localY >= layout.visRows) return null;
  return { x, y: layout.cameraY + localY };
}

export function drawDigMap(
  ctx: CanvasRenderingContext2D,
  session: DigSession,
  configs: GameConfigs,
  width: number,
  height: number,
): DigLayout {
  const layout = layoutDig(session, width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0B0806";
  ctx.fillRect(0, 0, width, height);

  const blockColor = new Map(configs.blocks.map((b) => [b.id, b.color]));
  const { cell, originX, originY, visRows, cameraY } = layout;

  for (let row = 0; row < visRows; row += 1) {
    const y = cameraY + row;
    for (let x = 0; x < layout.cols; x += 1) {
      const px = originX + x * cell;
      const py = originY + row * cell;
      const cellState = getCell(session.map, x, y);
      if (!cellState) continue;
      drawCell(ctx, px, py, cell, cellState, blockColor.get(cellState.blockId ?? "") ?? "#2A2118", session, x, y);
    }
  }

  const playerRow = session.playerY - cameraY;
  if (playerRow >= 0 && playerRow < visRows) {
    const px = originX + session.playerX * cell + cell / 2;
    const py = originY + playerRow * cell + cell / 2;
    drawSpoon(ctx, px, py, cell);
  }

  return layout;
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  cell: NonNullable<ReturnType<typeof getCell>>,
  color: string,
  session: DigSession,
  x: number,
  y: number,
): void {
  const pad = Math.max(1, Math.floor(size * 0.04));
  const inner = size - pad * 2;
  if (!cell.blockId) {
    ctx.fillStyle = hasFlag(cell, CellFlag.EndRoom) ? "#3A2414" : "#120C08";
    ctx.fillRect(px + pad, py + pad, inner, inner);
    if (hasFlag(cell, CellFlag.Flooded)) {
      ctx.fillStyle = "rgba(40,90,140,0.28)";
      ctx.fillRect(px + pad, py + pad, inner, inner);
    }
    if (hasFlag(cell, CellFlag.Cool)) {
      ctx.fillStyle = "rgba(80,160,200,0.2)";
      ctx.fillRect(px + pad, py + pad, inner, inner);
    }
    return;
  }

  ctx.fillStyle = shade(color, -28);
  ctx.fillRect(px + pad, py + pad, inner, inner);
  ctx.fillStyle = color;
  ctx.fillRect(px + pad, py + pad, inner - 2, inner - 3);
  ctx.fillStyle = shade(color, 28);
  ctx.fillRect(px + pad, py + pad, inner - 2, Math.max(2, inner * 0.18));

  if (hasFlag(cell, CellFlag.Indestructible)) {
    ctx.strokeStyle = "#1A1220";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + pad + 4, py + pad + 4);
    ctx.lineTo(px + size - pad - 4, py + size - pad - 4);
    ctx.moveTo(px + size - pad - 4, py + pad + 4);
    ctx.lineTo(px + pad + 4, py + size - pad - 4);
    ctx.stroke();
  }
  if (hasFlag(cell, CellFlag.Gate)) {
    ctx.strokeStyle = "#E8B84A";
    ctx.lineWidth = 2;
    ctx.strokeRect(px + pad + 1, py + pad + 1, inner - 2, inner - 2);
  }
  if (hasFlag(cell, CellFlag.Flooded)) {
    ctx.fillStyle = "rgba(40,90,140,0.25)";
    ctx.fillRect(px + pad, py + pad, inner, inner);
  }
  if (hasFlag(cell, CellFlag.Fossil)) {
    ctx.fillStyle = "rgba(196,163,90,0.35)";
    ctx.beginPath();
    ctx.arc(px + size / 2, py + size / 2, inner * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  if (hasFlag(cell, CellFlag.Pipe)) {
    ctx.fillStyle = "#6E7B80";
    ctx.fillRect(px + size * 0.35, py + pad, size * 0.3, inner);
  }

  const crack = session.crackAt(x, y);
  if (crack > 0) {
    ctx.strokeStyle = hex("#120C08", 0.55 + crack * 0.12);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px + size * 0.25, py + size * 0.2);
    ctx.lineTo(px + size * 0.45, py + size * (0.4 + crack * 0.08));
    ctx.lineTo(px + size * 0.3, py + size * 0.78);
    if (crack >= 2) {
      ctx.moveTo(px + size * 0.7, py + size * 0.22);
      ctx.lineTo(px + size * 0.55, py + size * 0.55);
    }
    if (crack >= 3) {
      ctx.lineTo(px + size * 0.72, py + size * 0.8);
    }
    ctx.stroke();
  }

  if (cell.hint === "treasure" || cell.hint === "item") {
    ctx.fillStyle = cell.hint === "treasure" ? "#E8B84A" : "#C4A574";
    ctx.beginPath();
    ctx.arc(px + size * 0.78, py + size * 0.24, Math.max(2, size * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }

  if (isAdjacent(session.playerX, session.playerY, x, y)) {
    ctx.strokeStyle = session.selectedX === x && session.selectedY === y ? "#E07A2F" : "rgba(243,230,208,0.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);
  }
}

function drawSpoon(ctx: CanvasRenderingContext2D, cx: number, cy: number, cell: number): void {
  const r = cell * 0.22;
  ctx.fillStyle = "#C4A574";
  ctx.beginPath();
  ctx.ellipse(cx, cy - cell * 0.12, r, r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2A2118";
  ctx.beginPath();
  ctx.ellipse(cx, cy - cell * 0.12, r * 0.55, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#C4A574";
  ctx.fillRect(cx - cell * 0.05, cy - cell * 0.02, cell * 0.1, cell * 0.32);
  ctx.fillStyle = "#E07A2F";
  ctx.fillRect(cx - cell * 0.07, cy + cell * 0.26, cell * 0.14, cell * 0.08);
}
