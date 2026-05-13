export type ElementType = "image" | "rect" | "text" | "arrow" | "group";

export type ImageMaskShape = "rect" | "roundRect" | "circle";

export type MaskTool = "brush" | "eraser";

export type MaskStroke = {
  id: string;
  tool: MaskTool;
  points: number[];
  color: string;
  size: number;
  opacity: number;
  hardness: number;
};

export type ImageMaskData = {
  version: string;
  width: number;
  height: number;
  strokes: MaskStroke[];
};

export type BaseElement = {
  id: string;
  name: string;
  type: ElementType;

  x: number;
  y: number;
  width: number;
  height: number;

  rotation: number;
  opacity: number;

  visible: boolean;
  locked: boolean;

  parentId?: string | null;
};

export type ImageElement = BaseElement & {
  type: "image";
  src: string;

  cropOffsetX: number;
  cropOffsetY: number;
  cropScale: number;
  cropRotation: number;

  flipX?: boolean;
  flipY?: boolean;

  cornerRadius: number;
  maskShape: ImageMaskShape;

  filter: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
  };

  /** AI 图像编辑蒙版 */
  aiMask?: ImageMaskData | null;
};

export type RectElement = BaseElement & {
  type: "rect";
  fill: string;
  radius: number;
  stroke?: string;
  strokeWidth?: number;
};

export type TextElement = BaseElement & {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  align: "left" | "center" | "right";
};

export type ArrowElement = BaseElement & {
  type: "arrow";
  stroke: string;
  strokeWidth: number;
};

export type GroupElement = BaseElement & {
  type: "group";
  children: string[];
};

export type CanvasElement =
  | ImageElement
  | RectElement
  | TextElement
  | ArrowElement
  | GroupElement;

export type Page = {
  id: string;
  name: string;
  elements: CanvasElement[];
};

export type ToolType = "select" | "rect" | "text" | "image" | "arrow" | "hand";

export type EditorState = {
  pages: Page[];
  activePageId: string;

  selectedIds: string[];

  zoom: number;
  pan: {
    x: number;
    y: number;
  };

  tool: ToolType;

  editingTextId: string | null;
};

export type ProjectJSON = {
  version: string;
  savedAt: string;
  pages: Page[];
  activePageId: string;
};
