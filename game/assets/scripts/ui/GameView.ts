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
import { nodeStatus } from "../gameplay/skillTree";
import { ThemeConfig } from "./ThemeConfig";

const { ccclass } = _decorator;

function hexColor(hex: string, alpha = 255): Color {
  const h = hex.replace("#", "");
  return new Color(
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
    alpha,
  );
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
  private choiceNode: Node | null = null;
  private resultNode: Node | null = null;
  private treeNode: Node | null = null;
  private statsNode: Node | null = null;
  private goldLabel: Label | null = null;
  private depthLabel: Label | null = null;
  private resultLabel: Label | null = null;
  private dirtGfx: Graphics | null = null;
  private dirtLabel: Label | null = null;
  private toolLabel: Label | null = null;
  private hintLabel: Label | null = null;
  private statsBody: Label | null = null;
  private workerLabels: Label[] = [];
  private treeLabels: Label[] = [];
  private treeGfx: Graphics[] = [];

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
    if (this.app?.state === GameStates.Digging) this.drawDirt();
  }

  private build(): void {
    const root = this.node;
    const W = ThemeConfig.designWidth;
    const H = ThemeConfig.designHeight;

    this.homeNode = addLayer(root, "HomeLayer", W, H);
    this.makeLabel(this.homeNode, "Title", GAME_TITLE_ZH, 56, 0, 300).isBold = true;
    this.goldLabel = this.makeLabel(this.homeNode, "Gold", "金币 0", 26, -220, 230);
    this.depthLabel = this.makeLabel(this.homeNode, "Depth", "深度 0 米", 26, 220, 230);
    const start = this.makeButton(this.homeNode, "StartDig", "开始挖土", 0, 150, 240, 76);
    start.node.on(Button.EventType.CLICK, () => this.app?.startDigging(), this);

    this.makeLabel(this.homeNode, "CrewTitle", "雇工编制", 22, -360, 70).color = hexColor(ThemeConfig.muted);
    this.workerLabels = [];
    for (let i = 0; i < 3; i += 1) {
      const label = this.makeLabel(this.homeNode, `WorkerSlot${i}`, "空席", 20, -360, 30 - i * 40);
      this.workerLabels.push(label);
    }

    const tree = this.makeButton(this.homeNode, "OpenTree", "根系图谱", -160, -220, 200, 64);
    tree.node.on(Button.EventType.CLICK, () => this.app?.setHomePanel("tree"), this);
    const stats = this.makeButton(this.homeNode, "OpenStats", "帝国账册", 160, -220, 200, 64);
    stats.node.on(Button.EventType.CLICK, () => this.app?.setHomePanel("stats"), this);
    this.makeLabel(this.homeNode, "Version", `v${GAME_VERSION}`, 20, -560, -320).color =
      hexColor(ThemeConfig.muted);

    this.digNode = addLayer(root, "DigLayer", W, H);
    this.toolLabel = this.makeLabel(this.digNode, "ToolHud", "当前工具：碗", 28, 0, 300);
    const dirtHost = addLayer(this.digNode, "DirtField", 520, 280);
    dirtHost.setPosition(0, 20, 0);
    this.dirtGfx = dirtHost.addComponent(Graphics);
    const dirtHit = this.makeButton(this.digNode, "DirtHit", "", 0, 20, 520, 280);
    dirtHit.node.on(Button.EventType.CLICK, () => this.app?.clickDirtPatch(), this);
    this.dirtLabel = this.makeLabel(this.digNode, "DirtRemain", "剩余土量 0", 26, 0, -160);
    this.hintLabel = this.makeLabel(this.digNode, "Hint", "", 22, 0, 250);
    const gate = this.makeButton(this.digNode, "OpenGate", "层末抉择", -160, -280, 180, 56);
    gate.node.on(Button.EventType.CLICK, () => this.app?.enterLayerChoice(), this);
    const home = this.makeButton(this.digNode, "ReturnHome", "回 Home", 160, -280, 180, 56);
    home.node.on(Button.EventType.CLICK, () => this.app?.returnFromDig(), this);

    this.choiceNode = addLayer(root, "LayerChoiceLayer", W, H);
    this.makeLabel(this.choiceNode, "ChoiceTitle", "这一层挖完了", 40, 0, 160).isBold = true;
    const linger = this.makeButton(this.choiceNode, "Linger", "继续搜刮", -240, 0, 200, 64);
    linger.node.on(Button.EventType.CLICK, () => this.app?.continueScavenge(), this);
    const plunge = this.makeButton(this.choiceNode, "Plunge", "下潜", 0, 0, 200, 64);
    plunge.node.on(Button.EventType.CLICK, () => this.app?.descendLayer(), this);
    const nest = this.makeButton(this.choiceNode, "Nest", "回 Home", 240, 0, 200, 64);
    nest.node.on(Button.EventType.CLICK, () => this.app?.returnHomeFromLayer(), this);

    this.resultNode = addLayer(root, "ResultLayer", W, H);
    this.resultLabel = this.makeLabel(this.resultNode, "ResultGold", "结算", 40, 0, 80);
    const cont = this.makeButton(this.resultNode, "Continue", "出售并返回", 0, -80, 240, 64);
    cont.node.on(Button.EventType.CLICK, () => this.app?.acknowledgeResult(), this);

    this.treeNode = addLayer(root, "TreeLayer", W, H);
    const treeVeil = addLayer(this.treeNode, "TreeVeil", W, H);
    const tv = treeVeil.addComponent(Graphics);
    tv.fillColor = new Color(8, 6, 4, 220);
    tv.rect(-W / 2, -H / 2, W, H);
    tv.fill();
    this.makeLabel(this.treeNode, "TreeTitle", "根系图谱", 36, 0, 320).isBold = true;
    this.buildTreeGrid(this.treeNode);
    const treeBack = this.makeButton(this.treeNode, "TreeBack", "返回中枢", 0, -320, 200, 56);
    treeBack.node.on(Button.EventType.CLICK, () => this.app?.setHomePanel("hub"), this);

    this.statsNode = addLayer(root, "StatsLayer", W, H);
    const statsVeil = addLayer(this.statsNode, "StatsVeil", W, H);
    const sv = statsVeil.addComponent(Graphics);
    sv.fillColor = new Color(8, 6, 4, 220);
    sv.rect(-W / 2, -H / 2, W, H);
    sv.fill();
    this.makeLabel(this.statsNode, "StatsTitle", "帝国账册", 36, 0, 220).isBold = true;
    this.statsBody = this.makeLabel(this.statsNode, "StatsBody", "", 24, 0, 40);
    const statsBack = this.makeButton(this.statsNode, "StatsBack", "返回中枢", 0, -220, 200, 56);
    statsBack.node.on(Button.EventType.CLICK, () => this.app?.setHomePanel("hub"), this);
  }

  private buildTreeGrid(parent: Node): void {
    this.treeLabels = [];
    this.treeGfx = [];
    const cols = 8;
    const cellW = 140;
    const cellH = 52;
    const originX = -((cols - 1) * cellW) / 2;
    const originY = 250;
    for (let i = 0; i < 48; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = originX + col * cellW;
      const y = originY - row * cellH;
      const node = new Node(`SkillNode${i}`);
      node.setPosition(x, y, 0);
      const transform = node.addComponent(UITransform);
      transform.setContentSize(128, 44);
      const g = node.addComponent(Graphics);
      this.treeGfx.push(g);
      const labelNode = new Node("Label");
      const lt = labelNode.addComponent(UITransform);
      lt.setContentSize(124, 40);
      const label = labelNode.addComponent(Label);
      label.string = "";
      label.fontSize = 14;
      label.color = hexColor(ThemeConfig.fg);
      node.addChild(labelNode);
      parent.addChild(node);
      this.treeLabels.push(label);
    }
  }

  private sync(): void {
    if (!this.app) return;
    const home = this.app.state === GameStates.Home;
    const overlay = this.app.homePanel;
    if (this.homeNode) this.homeNode.active = home && overlay !== "tree" && overlay !== "stats";
    if (this.treeNode) this.treeNode.active = home && overlay === "tree";
    if (this.statsNode) this.statsNode.active = home && overlay === "stats";
    if (this.digNode) this.digNode.active = this.app.state === GameStates.Digging;
    if (this.choiceNode) this.choiceNode.active = this.app.state === GameStates.LayerChoice;
    if (this.resultNode) this.resultNode.active = this.app.state === GameStates.Result;
    if (this.goldLabel) this.goldLabel.string = `金币 ${this.app.save.gold}`;
    if (this.depthLabel) {
      this.depthLabel.string = `深度 ${Math.floor(this.app.currentDepthMeters)} 米 · ${this.app.currentLayer.nameZh}`;
    }
    if (this.hintLabel) this.hintLabel.string = this.app.tutorialHint ?? "";
    if (this.resultLabel) this.resultLabel.string = `本局 +${this.app.lastSettlement?.gold ?? 0} 金`;
    if (this.toolLabel) {
      const tool = this.app.tool;
      this.toolLabel.string = `当前工具：${tool.nameZh} · ${formLabel(tool.form)}`;
    }
    this.syncWorkers();
    this.syncTree();
    this.syncStats();
    if (this.app.state === GameStates.Digging) this.drawDirt();
  }

  private syncWorkers(): void {
    if (!this.app) return;
    const slots = this.app.workerSlots;
    this.workerLabels.forEach((label, i) => {
      const slot = slots[i];
      if (!slot?.worker) {
        label.string = `席 ${i + 1}  ·  空`;
        return;
      }
      const mark = slot.hired ? "在编" : "待雇";
      label.string = `席 ${slot.slot + 1}  ·  ${slot.worker.nameZh}（${mark}）`;
    });
  }

  private syncTree(): void {
    if (!this.app) return;
    const nodes = this.app.configs.skillNodes;
    const unlocked = this.app.save.unlockedSkillNodeIds;
    this.treeLabels.forEach((label, i) => {
      const node = nodes[i];
      const gfx = this.treeGfx[i];
      if (!node || !gfx) {
        label.string = "";
        gfx?.clear();
        return;
      }
      const status = nodeStatus(node, unlocked);
      label.string = node.nameZh;
      gfx.clear();
      const fill =
        status === "unlocked" ? ThemeConfig.orange : status === "available" ? "#6B4F32" : "#2A2118";
      gfx.fillColor = hexColor(fill);
      gfx.roundRect(-64, -20, 128, 40, 8);
      gfx.fill();
      label.color = hexColor(status === "locked" ? ThemeConfig.muted : ThemeConfig.fg);
    });
  }

  private syncStats(): void {
    if (!this.app || !this.statsBody) return;
    const save = this.app.save;
    const tool = this.app.tool;
    this.statsBody.string = [
      `金币 ${save.gold}`,
      `当前层 ${this.app.currentLayer.nameZh}`,
      `深度 ${Math.floor(this.app.currentDepthMeters)} 米`,
      `工具 ${tool.nameZh}（${formLabel(tool.form)}）`,
      `搜刮度 ${Math.round(save.scrapeProgress * 100)}%`,
      `编制 ${save.workerRoster.length}/${this.app.configs.workers.length}`,
      `已点根系 ${save.unlockedSkillNodeIds.length}/${this.app.configs.skillNodes.length}`,
    ].join("\n");
  }

  private drawDirt(): void {
    if (!this.dirtGfx || !this.app?.dirtField) return;
    const field = this.app.dirtField;
    const g = this.dirtGfx;
    g.clear();
    g.fillColor = hexColor(ThemeConfig.soil3);
    g.roundRect(-260, -140, 520, 280, 18);
    g.fill();
    const ratio = field.max <= 0 ? 0 : field.remaining / field.max;
    const h = Math.max(8, 260 * ratio);
    g.fillColor = hexColor(field.color);
    g.roundRect(-250, -130, 500, h, 14);
    g.fill();
    if (this.dirtLabel) {
      this.dirtLabel.string = `剩余土量 ${field.remaining} / ${field.max} · 搜刮 ${Math.round(field.scrape * 100)}%`;
    }
  }

  private makeLabel(parent: Node, name: string, text: string, size: number, x: number, y: number): Label {
    const node = new Node(name);
    node.setPosition(x, y, 0);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(900, size + 16);
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
    g.fillColor = text ? hexColor(ThemeConfig.orange) : new Color(0, 0, 0, 1);
    g.roundRect(-w / 2, -h / 2, w, h, 12);
    g.fill();
    if (text) {
      const labelNode = new Node("Label");
      const lt = labelNode.addComponent(UITransform);
      lt.setContentSize(w, h);
      const label = labelNode.addComponent(Label);
      label.string = text;
      label.fontSize = 24;
      label.color = hexColor(ThemeConfig.bg);
      node.addChild(labelNode);
    }
    const button = node.addComponent(Button);
    parent.addChild(node);
    return button;
  }
}

function formLabel(form: string): string {
  if (form === "bowl") return "碗";
  if (form === "shovel") return "铲";
  if (form === "auger") return "钻铲";
  if (form === "scoop") return "舀铲";
  return form;
}
