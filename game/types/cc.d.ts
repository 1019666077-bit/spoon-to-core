declare module "cc" {
  export const _decorator: {
    ccclass: (name?: string) => ClassDecorator;
    property: (...args: never[]) => PropertyDecorator;
  };

  export class Node {
    name: string;
    active: boolean;
    parent: Node | null;
    layer: number;
    constructor(name?: string);
    addChild(node: Node): void;
    getChildByName(name: string): Node | null;
    addComponent<T>(ctor: new () => T): T;
    getComponent<T>(ctor: new () => T): T | null;
    setPosition(x: number, y: number, z?: number): void;
    on(type: string, callback: (...args: unknown[]) => void, target?: unknown): void;
    removeAllChildren(): void;
    static EventType: {
      TOUCH_START: string;
      TOUCH_MOVE: string;
      TOUCH_END: string;
      TOUCH_CANCEL: string;
    };
  }

  export class Component {
    node: Node;
    start?(): void;
    update?(dt: number): void;
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
    strokeColor: Color;
    lineWidth: number;
    rect(x: number, y: number, w: number, h: number): void;
    roundRect(x: number, y: number, w: number, h: number, r: number): void;
    circle(x: number, y: number, r: number): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    fill(): void;
    stroke(): void;
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

  export class Canvas extends Component {
    cameraComponent: Camera | null;
    alignCanvasWithScreen: boolean;
  }

  export class Camera extends Component {
    priority: number;
    clearColor: Color;
    orthoHeight: number;
    projection: number;
    visibility: number;
    clearFlags: number;
    near: number;
    far: number;
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
