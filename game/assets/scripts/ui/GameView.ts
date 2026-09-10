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
import { OVERHEAT_NAME_ZH } from "../gameplay/breakthrough";
import { relicProgressLabel } from "../gameplay/relics";
import { nodeStatus } from "../gameplay/skillTree";
import { crewStatusLabel } from "../gameplay/workers";
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
  private shopNode: Node | null = null;
  private goldLabel: Label | null = null;
  private depthLabel: Label | null = null;
  private resultLabel: Label | null = null;
  private dirtGfx: Graphics | null = null;
  private dirtLabel: Label | null = null;
  private toolLabel: Label | null = null;
  private hintLabel: Label | null = null;
  private dropLabel: Label | null = null;
  private toastLabel: Label | null = null;
  private burstLabel: Label | null = null;
  private shopBody: Label | null = null;
  private statsBody: Label | null = null;
  private workerLabels: Label[] = [];
  private treeLabels: Label[] = [];
  private treeGfx: Graphics[] = [];
  private treeIds: string[] = [];

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

    this.makeLabel(this.homeNode, "CrewTitle", "雇工编制（点席雇佣）", 22, -360, 70).color =
      hexColor(ThemeConfig.muted);
    this.workerLabels = [];
    for (let i = 0; i < 3; i += 1) {
      const hire = this.makeButton(this.homeNode, `WorkerSlot${i}`, "空席", -360, 30 - i * 48, 280, 40);
      const label = hire.node.getChildByName("Label")?.getComponent(Label) ?? hire.node.addComponent(Label);
      label.fontSize = 18;
      this.workerLabels.push(label);
      const slotIndex = i;
      hire.node.on(
        Button.EventType.CLICK,
        () => {
          const slot = this.app?.workerSlots[slotIndex];
          if (slot?.worker && !slot.hired) this.app?.hire(slot.worker.id);
        },
        this,
      );
    }

    const shop = this.makeButton(this.homeNode, "OpenShop", "灶间铺", -320, -220, 180, 64);
    shop.node.on(Button.EventType.CLICK, () => this.app?.setHomePanel("shop"), this);
    const tree = this.makeButton(this.homeNode, "OpenTree", "根系图谱", 0, -220, 180, 64);
    tree.node.on(Button.EventType.CLICK, () => this.app?.setHomePanel("tree"), this);
    const stats = this.makeButton(this.homeNode, "OpenStats", "帝国账册", 320, -220, 180, 64);
    stats.node.on(Button.EventType.CLICK, () => this.app?.setHomePanel("stats"), this);
    this.makeLabel(this.homeNode, "Version", `v${GAME_VERSION}`, 20, -560, -320).color =
      hexColor(ThemeConfig.muted);

    this.digNode = addLayer(root, "DigLayer", W, H);
    this.toolLabel = this.makeLabel(this.digNode, "ToolHud", "当前工具：碗", 28, 0, 300);
    const dirtHost = addLayer(this.digNode, "DirtField", 520, 280);
    dirtHost.setPosition(0, 20, 0);
    this.dirtGfx = dirtHost.addComponent(Graphics);
    const dirtHit = this.makeButton(this.digNode, "DirtHit", "", 0, 20, 520, 280);
    dirtHit.node.on(Node.EventType.TOUCH_START, () => this.app?.setDirtHeld(true), this);
    dirtHit.node.on(Node.EventType.TOUCH_END, () => this.app?.setDirtHeld(false), this);
    dirtHit.node.on(Node.EventType.TOUCH_CANCEL, () => this.app?.setDirtHeld(false), this);
    this.dirtLabel = this.makeLabel(this.digNode, "DirtRemain", "剩余土量 0", 26, 0, -160);
    this.hintLabel = this.makeLabel(this.digNode, "Hint", "", 22, 0, 250);
    this.dropLabel = this.makeLabel(this.digNode, "DropLog", "", 20, 0, -200);
    const burst = this.makeButton(this.digNode, "Overheat", OVERHEAT_NAME_ZH, 420, 280, 180, 56);
    burst.node.on(Button.EventType.CLICK, () => this.app?.useBreakthrough(), this);
    this.burstLabel = burst.node.getChildByName("Label")?.getComponent(Label) ?? null;
    const gate = this.makeButton(this.digNode, "OpenGate", "层末抉择", -160, -280, 180, 56);
    gate.node.on(Button.EventType.CLICK, () => this.app?.enterLayerChoice(), this);
    const home = this.makeButton(this.digNode, "ReturnHome", "回 Home", 160, -280, 180, 56);
    home.node.on(Button.EventType.CLICK, () => this.app?.leaveDigForHome(), this);

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
    this.makeLabel(this.treeNode, "TreeTitle", "根系图谱（点可选节点）", 32, 0, 320).isBold = true;
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
    this.statsBody = this.makeLabel(this.statsNode, "StatsBody", "", 22, 0, 20);
    const statsBack = this.makeButton(this.statsNode, "StatsBack", "返回中枢", 0, -280, 200, 56);
    statsBack.node.on(Button.EventType.CLICK, () => this.app?.setHomePanel("hub"), this);

    this.shopNode = addLayer(root, "ShopLayer", W, H);
    const shopVeil = addLayer(this.shopNode, "ShopVeil", W, H);
    const qv = shopVeil.addComponent(Graphics);
    qv.fillColor = new Color(8, 6, 4, 220);
    qv.rect(-W / 2, -H / 2, W, H);
    qv.fill();
    this.makeLabel(this.shopNode, "ShopTitle", "灶间铺", 36, 0, 220).isBold = true;
    this.shopBody = this.makeLabel(this.shopNode, "ShopBody", "", 24, 0, 40);
    const buyTool = this.makeButton(this.shopNode, "BuyShovel", "购置下一把铲", 0, -120, 260, 64);
    buyTool.node.on(Button.EventType.CLICK, () => this.app?.buy("tool"), this);
    const shopBack = this.makeButton(this.shopNode, "ShopBack", "返回中枢", 0, -220, 200, 56);
    shopBack.node.on(Button.EventType.CLICK, () => this.app?.setHomePanel("hub"), this);

    this.toastLabel = this.makeLabel(root, "Toast", "", 22, 0, -330);
  }

  private buildTreeGrid(parent: Node): void {
    this.treeLabels = [];
    this.treeGfx = [];
    this.treeIds = [];
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
      const index = i;
      node.on(Node.EventType.TOUCH_END, () => this.unlockTreeAt(index), this);
      parent.addChild(node);
      this.treeLabels.push(label);
    }
  }

  private unlockTreeAt(index: number): void {
    const id = this.treeIds[index];
    if (id) this.app?.unlockSkill(id);
  }

  private sync(): void {
    if (!this.app) return;
    const home = this.app.state === GameStates.Home;
    const overlay = this.app.homePanel;
    if (this.homeNode) this.homeNode.active = home && overlay !== "tree" && overlay !== "stats" && overlay !== "shop";
    if (this.treeNode) this.treeNode.active = home && overlay === "tree";
    if (this.statsNode) this.statsNode.active = home && overlay === "stats";
    if (this.shopNode) this.shopNode.active = home && overlay === "shop";
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
    if (this.dropLabel) this.dropLabel.string = this.app.lastScoopLog ?? "";
    if (this.toastLabel) this.toastLabel.string = this.app.toast ?? "";
    this.syncWorkers();
    this.syncTree();
    this.syncStats();
    this.syncShop();
    this.syncBurst();
    if (this.app.state === GameStates.Digging) this.drawDirt();
  }

  private syncWorkers(): void {
    if (!this.app) return;
    const app = this.app;
    const slots = app.workerSlots;
    this.workerLabels.forEach((label, i) => {
      const slot = slots[i];
      if (!slot?.worker) {
        label.string = `席 ${i + 1}  ·  空`;
        return;
      }
      const hired = slot.hired;
      const mark = crewStatusLabel(app.crewWorking && hired, app.crewIdle && hired, hired);
      label.string = `席 ${slot.slot + 1}  ·  ${slot.worker.nameZh}（${mark}）`;
    });
  }

  private syncTree(): void {
    if (!this.app) return;
    const nodes = this.app.configs.skillNodes;
    const unlocked = this.app.save.unlockedSkillNodeIds;
    this.treeIds = nodes.map((node) => node.id);
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
    const first = this.app.hiredCrew[0];
    const crewMark = crewStatusLabel(this.app.crewWorking, this.app.crewIdle, this.app.hiredCrew.length > 0);
    this.statsBody.string = [
      `金币 ${save.gold}`,
      `当前层 ${this.app.currentLayer.nameZh}`,
      `深度 ${Math.floor(this.app.currentDepthMeters)} 米`,
      `工具 ${tool.nameZh}（${formLabel(tool.form)}）  力${this.app.scoopPowerNow} / ${this.app.scoopIntervalNow.toFixed(2)}s`,
      `搜刮度 ${Math.round(save.scrapeProgress * 100)}%`,
      `编制 ${save.workerRoster.length}/${this.app.configs.workers.length} · ${first?.nameZh ?? "无人"}（${crewMark}）`,
      `本期编制产出 土${save.workerPeriodDirt} · 金${save.workerPeriodGold}`,
      `已点根系 ${save.unlockedSkillNodeIds.length}/${this.app.configs.skillNodes.length} · 技能点 ${save.skillPoints}`,
      relicProgressLabel(save),
    ].join("\n");
  }

  private syncShop(): void {
    if (!this.app || !this.shopBody) return;
    const current = this.app.tool;
    const next = this.app.nextTool;
    this.shopBody.string = [
      `当前：${current.nameZh}（${formLabel(current.form)}）`,
      `力 ${current.power} · 间隔 ${current.attackInterval.toFixed(2)}s`,
      next
        ? `下一把：${next.nameZh}（${formLabel(next.form)}） ${next.price}金`
        : "已经是最深的铲。",
      "灶间铲 / 工地铁铲在铺里按序购置。",
    ].join("\n");
  }

  private syncBurst(): void {
    if (!this.app || !this.burstLabel) return;
    if (!this.app.breakthroughUnlocked) {
      this.burstLabel.string = "过热铲（锁）";
      return;
    }
    if (this.app.breakthrough.surgeRemaining > 0) {
      this.burstLabel.string = `过热中 ${this.app.breakthrough.surgeRemaining.toFixed(1)}s`;
      return;
    }
    if (this.app.breakthrough.cooldownRemaining > 0) {
      this.burstLabel.string = `过热CD ${Math.ceil(this.app.breakthrough.cooldownRemaining)}s`;
      return;
    }
    this.burstLabel.string = OVERHEAT_NAME_ZH;
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
