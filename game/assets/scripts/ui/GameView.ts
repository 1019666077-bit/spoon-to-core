import {
  _decorator,
  Button,
  Color,
  Component,
  Graphics,
  Label,
  Node,
  UITransform,
} from "cc";
import { GameApp } from "../bootstrap/GameApp";
import { GameStates } from "../domain/GameState";
import { GAME_TITLE_ZH, GAME_VERSION } from "../domain/version";
import { getCell, hasFlag, CellFlag } from "../gameplay/MapTypes";
import { ThemeConfig } from "./ThemeConfig";

const { ccclass } = _decorator;

function hexColor(hex: string): Color {
  const h = hex.replace("#", "");
  return new Color(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255);
}

function addLayer(parent: Node, name: string, w: number, h: number): Node {
  const node = new Node(name);
  const transform = node.addComponent(UITransform);
  transform.setContentSize(w, h);
  parent.addChild(node);
  return node;
}

@ccclass("GameView")
export class GameView extends Component {
  private app: GameApp | null = null;
  private unsub: (() => void) | null = null;
  private homeNode: Node | null = null;
  private digNode: Node | null = null;
  private resultNode: Node | null = null;
  private goldLabel: Label | null = null;
  private resultLabel: Label | null = null;
  private grid: Graphics | null = null;
  private hintLabel: Label | null = null;

  bind(app: GameApp): void {
    this.app = app;
    this.build();
    this.unsub = app.subscribe(() => this.sync());
    this.sync();
  }

  onDestroy(): void {
    this.unsub?.();
    this.unsub = null;
  }

  update(dt: number): void {
    this.app?.tick(dt);
    if (this.app?.state === GameStates.Digging) this.drawGrid();
  }

  private build(): void {
    const root = this.node;
    const W = ThemeConfig.designWidth;
    const H = ThemeConfig.designHeight;
    this.homeNode = addLayer(root, "HomeLayer", W, H);
    this.makeLabel(this.homeNode, "Title", GAME_TITLE_ZH, 64, 0, 220).isBold = true;
    this.goldLabel = this.makeLabel(this.homeNode, "Gold", "金币 0", 28, 0, 140);
    const start = this.makeButton(this.homeNode, "StartDig", "开始挖掘", 0, 40, 240, 76);
    start.node.on(Button.EventType.CLICK, () => this.app?.startDigging(), this);
    const shop = this.makeButton(this.homeNode, "BuyBag", "升级背包", -160, -80, 180, 56);
    shop.node.on(Button.EventType.CLICK, () => this.app?.buy("backpack"), this);
    const catalog = this.makeButton(this.homeNode, "Catalog", "图鉴", 160, -80, 180, 56);
    catalog.node.on(Button.EventType.CLICK, () => this.app?.setHomePanel("catalog"), this);
    this.makeLabel(this.homeNode, "Version", `v${GAME_VERSION}`, 20, -560, -320).color = hexColor(ThemeConfig.muted);

    this.digNode = addLayer(root, "DigLayer", W, H);
    const gridHost = addLayer(this.digNode, "Grid", 720, 540);
    gridHost.setPosition(0, 20, 0);
    this.grid = gridHost.addComponent(Graphics);
    this.hintLabel = this.makeLabel(this.digNode, "Hint", "", 24, 0, 320);
    const left = this.makeButton(this.digNode, "Left", "左", -420, -280, 80, 56);
    left.node.on(Button.EventType.CLICK, () => this.app?.digSelect(-1, 0), this);
    const right = this.makeButton(this.digNode, "Right", "右", -240, -280, 80, 56);
    right.node.on(Button.EventType.CLICK, () => this.app?.digSelect(1, 0), this);
    const up = this.makeButton(this.digNode, "Up", "上", -330, -220, 80, 56);
    up.node.on(Button.EventType.CLICK, () => this.app?.digSelect(0, -1), this);
    const down = this.makeButton(this.digNode, "Down", "下", -330, -340, 80, 56);
    down.node.on(Button.EventType.CLICK, () => this.app?.digSelect(0, 1), this);
    const dig = this.makeButton(this.digNode, "Dig", "挖掘", 80, -280, 160, 64);
    dig.node.on(Button.EventType.CLICK, () => this.app?.digSelected(), this);
    const bag = this.makeButton(this.digNode, "Bag", "背包", 280, -220, 140, 56);
    bag.node.on(Button.EventType.CLICK, () => this.app?.openBackpack(true), this);
    const ret = this.makeButton(this.digNode, "Return", "返程", 280, -300, 140, 56);
    ret.node.on(Button.EventType.CLICK, () => this.app?.returnFromDig(), this);

    this.resultNode = addLayer(root, "ResultLayer", W, H);
    this.resultLabel = this.makeLabel(this.resultNode, "ResultGold", "结算", 40, 0, 80);
    const cont = this.makeButton(this.resultNode, "Continue", "出售并返回", 0, -80, 240, 64);
    cont.node.on(Button.EventType.CLICK, () => this.app?.acknowledgeResult(), this);
  }

  private sync(): void {
    if (!this.app) return;
    if (this.homeNode) this.homeNode.active = this.app.state === GameStates.Home;
    if (this.digNode) this.digNode.active = this.app.state === GameStates.Digging;
    if (this.resultNode) this.resultNode.active = this.app.state === GameStates.Result;
    if (this.goldLabel) this.goldLabel.string = `金币 ${this.app.save.gold}`;
    if (this.hintLabel) this.hintLabel.string = this.app.tutorialHint ?? "";
    if (this.resultLabel) this.resultLabel.string = `本局 +${this.app.lastSettlement?.gold ?? 0} 金`;
    if (this.app.state === GameStates.Digging) this.drawGrid();
  }

  private drawGrid(): void {
    if (!this.grid || !this.app?.session) return;
    const session = this.app.session;
    const g = this.grid;
    g.clear();
    const cell = 44;
    const vis = session.configs.rules.visibleRows;
    const ox = -((session.map.width * cell) / 2);
    const oy = (vis * cell) / 2;
    for (let row = 0; row < vis; row += 1) {
      const y = session.cameraY + row;
      for (let x = 0; x < session.map.width; x += 1) {
        const cellState = getCell(session.map, x, y);
        if (!cellState) continue;
        const px = ox + x * cell;
        const py = oy - (row + 1) * cell;
        const block = cellState.blockId
          ? this.app.configs.blocks.find((b) => b.id === cellState.blockId)
          : null;
        g.fillColor = hexColor(block?.color ?? "#120C08");
        if (!cellState.blockId) g.fillColor = hexColor(hasFlag(cellState, CellFlag.EndRoom) ? "#3A2414" : "#120C08");
        g.rect(px, py, cell - 2, cell - 2);
        g.fill();
        if (x === session.playerX && y === session.playerY) {
          g.fillColor = hexColor(ThemeConfig.orange);
          g.circle(px + cell / 2, py + cell / 2, 10);
          g.fill();
        }
      }
    }
  }

  private makeLabel(parent: Node, name: string, text: string, size: number, x: number, y: number): Label {
    const node = new Node(name);
    node.setPosition(x, y, 0);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(800, size + 16);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = size;
    label.color = hexColor(ThemeConfig.fg);
    parent.addChild(node);
    return label;
  }

  private makeButton(parent: Node, name: string, text: string, x: number, y: number, w: number, h: number): Button {
    const node = new Node(name);
    node.setPosition(x, y, 0);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(w, h);
    const g = node.addComponent(Graphics);
    g.fillColor = hexColor(ThemeConfig.orange);
    g.roundRect(-w / 2, -h / 2, w, h, 12);
    g.fill();
    const labelNode = new Node("Label");
    const lt = labelNode.addComponent(UITransform);
    lt.setContentSize(w, h);
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 24;
    label.color = hexColor(ThemeConfig.bg);
    node.addChild(labelNode);
    const button = node.addComponent(Button);
    parent.addChild(node);
    return button;
  }
}
