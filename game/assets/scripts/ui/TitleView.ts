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
import { ThemeConfig } from "./ThemeConfig";

const { ccclass } = _decorator;

function hexColor(hex: string): Color {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return new Color(r, g, b, 255);
}

function addLayer(parent: Node, name: string, w: number, h: number): Node {
  const node = new Node(name);
  const transform = node.addComponent(UITransform);
  transform.setContentSize(w, h);
  parent.addChild(node);
  return node;
}

@ccclass("TitleView")
export class TitleView extends Component {
  private app: GameApp | null = null;
  private unsub: (() => void) | null = null;
  private titleNode: Node | null = null;
  private digNode: Node | null = null;
  private settingsNode: Node | null = null;

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

  private build(): void {
    const root = this.node;
    const W = ThemeConfig.designWidth;
    const H = ThemeConfig.designHeight;

    const bg = addLayer(root, "Background", W, H);
    const g = bg.addComponent(Graphics);
    g.fillColor = hexColor(ThemeConfig.bg);
    g.rect(-W / 2, -H / 2, W, H);
    g.fill();
    g.fillColor = hexColor(ThemeConfig.soil1);
    g.rect(-W / 2, -H / 2, W, H * 0.62);
    g.fill();
    g.fillColor = hexColor(ThemeConfig.soil2);
    g.rect(-W / 2, -H / 2, W, H * 0.42);
    g.fill();
    g.fillColor = hexColor(ThemeConfig.pit);
    g.roundRect(-90, -220, 180, 260, 90);
    g.fill();

    this.titleNode = addLayer(root, "TitleLayer", W, H);
    const title = this.makeLabel(this.titleNode, "Title", GAME_TITLE_ZH, 72, 0, 180);
    title.isBold = true;

    const start = this.makeButton(
      this.titleNode,
      "StartDig",
      "开始挖掘",
      0,
      -40,
      ThemeConfig.mainButtonWidth,
      ThemeConfig.mainButtonHeight,
    );
    start.node.on(Button.EventType.CLICK, () => this.app?.startDigging(), this);

    this.makeLabel(this.titleNode, "Version", `v${GAME_VERSION}`, 22, -560, -320).color =
      hexColor(ThemeConfig.muted);

    const settings = this.makeButton(this.titleNode, "Settings", "设置", 560, 300, 96, 64);
    settings.node.on(Button.EventType.CLICK, () => this.app?.toggleSettings(true), this);

    this.digNode = addLayer(root, "DigLayer", W, H);
    this.makeLabel(this.digNode, "DigTitle", "挖掘井（空）", 48, 0, 80);
    this.makeLabel(this.digNode, "DigHint", "阶段 0：尚未生成地图", 24, 0, 20).color =
      hexColor(ThemeConfig.muted);
    const back = this.makeButton(this.digNode, "ReturnHome", "返回基地", 0, -80, 200, 64);
    back.node.on(Button.EventType.CLICK, () => this.app?.returnHomeFromDig(), this);

    this.settingsNode = addLayer(root, "SettingsLayer", W, H);
    const veil = addLayer(this.settingsNode, "Veil", W, H);
    const vg = veil.addComponent(Graphics);
    vg.fillColor = new Color(0, 0, 0, 150);
    vg.rect(-W / 2, -H / 2, W, H);
    vg.fill();
    this.makeLabel(this.settingsNode, "SettingsCopy", "设置（占位）", 36, 0, 40);
    const close = this.makeButton(this.settingsNode, "CloseSettings", "关闭", 0, -80, 160, 64);
    close.node.on(Button.EventType.CLICK, () => this.app?.toggleSettings(false), this);
  }

  private sync(): void {
    if (!this.app) return;
    const home = this.app.state === GameStates.Home;
    const digging = this.app.state === GameStates.Digging;
    if (this.titleNode) this.titleNode.active = home;
    if (this.digNode) this.digNode.active = digging;
    if (this.settingsNode) this.settingsNode.active = this.app.settingsOpen;
  }

  private makeLabel(
    parent: Node,
    name: string,
    text: string,
    size: number,
    x: number,
    y: number,
  ): Label {
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

  private makeButton(
    parent: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ): Button {
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
    label.fontSize = 28;
    label.color = hexColor(ThemeConfig.bg);
    node.addChild(labelNode);
    const button = node.addComponent(Button);
    parent.addChild(node);
    return button;
  }
}
