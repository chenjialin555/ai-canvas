export type ImageEditorTool = "crop" | "mask" | "parse3d";

export const IMAGE_EDITOR_TABS: {
  id: ImageEditorTool;
  label: string;
}[] = [
  { id: "crop", label: "裁剪" },
  { id: "mask", label: "蒙版" },
  { id: "parse3d", label: "解析3D" },
];
