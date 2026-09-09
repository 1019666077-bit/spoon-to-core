declare module "cc" {
  export const _decorator: {
    ccclass: (name?: string) => ClassDecorator;
    property: (...args: never[]) => PropertyDecorator;
  };

  export class Node {
    name: string;
    active: boolean;
    constructor(name?: string);
    addChild(node: Node): void;
    getChildByName(name: string): Node | null;
    addComponent<T>(ctor: new () => T): T;
    getComponent<T>(ctor: new () => T): T | null;
    setPosition(x: number, y: number, z?: number): void;
    on(type: string, callback: (...args: unknown[]) => void, target?: unknown): void;
  }

  export class Component {
    node: Node;
    start?(): void;
    onDestroy?(): void;
    addComponent<T>(ctor: new () => T): T;
    getComponent<T>(ctor: new () => T): T | null;
  }

  export class Color {
    static WHITE: Color;
    constructor(r: number, g: number, b: number, a?: number);
  }

  export class UITransform extends Component {
    width: number;
    height: number;
    setContentSize(w: number, h: number): void;
    setAnchorPoint(x: number, y: number): void;
  }

  export class Widget extends Component {
    isAlignTop: boolean;
    isAlignBottom: boolean;
    isAlignLeft: boolean;
    isAlignRight: boolean;
    top: number;
    bottom: number;
    left: number;
    right: number;
    updateAlignment(): void;
  }

  export class Graphics extends Component {
    fillColor: Color;
    rect(x: number, y: number, w: number, h: number): void;
    roundRect(x: number, y: number, w: number, h: number, r: number): void;
    fill(): void;
    clear(): void;
  }

  export class Label extends Component {
    static Overflow: { NONE: number; CLAMP: number; SHRINK: number; RESIZE_HEIGHT: number };
    string: string;
    fontSize: number;
    color: Color;
    isBold: boolean;
    overflow: number;
  }

  export class Button extends Component {
    static EventType: { CLICK: string };
    on(type: string, callback: (...args: unknown[]) => void, target?: unknown): void;
  }

  export class Canvas extends Component {}

  export class Camera extends Component {
    priority: number;
    clearColor: Color;
    orthoHeight: number;
  }

  export const view: {
    setDesignResolutionSize(w: number, h: number, policy: number): void;
  };

  export const ResolutionPolicy: {
    SHOW_ALL: number;
    FIXED_HEIGHT: number;
    FIXED_WIDTH: number;
  };
}
