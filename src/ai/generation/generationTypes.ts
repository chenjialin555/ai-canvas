export type ImageProvider =
  | "banana"
  | "doubao"
  | "gemini"
  | "flux"
  | "qwen"
  | "gpt-image"
  | "ksyun";

export const PROVIDERS: { id: ImageProvider; label: string }[] = [
  { id: "banana", label: "Banana / Nano Banana" },
  { id: "gemini", label: "Gemini (图)" },
  { id: "doubao", label: "豆包 Doubao" },
  { id: "flux", label: "Flux" },
  { id: "qwen", label: "通义 Qwen" },
  { id: "gpt-image", label: "GPT Image" },
  { id: "ksyun", label: "金山云 KSYUN（预留）" },
];

/** 与 `backend/app/providers/` 各文件中的 `models`、Comfly 网关文档一致 */
export const MODEL_CHOICES: Record<
  ImageProvider,
  { value: string; label: string }[]
> = {
  banana: [
    { value: "nano-banana-2-2k", label: "nano-banana-2-2k" },
    {
      value: "gemini-3.1-flash-image-preview-2k",
      label: "gemini-3.1-flash-image-preview-2k",
    },
    {
      value: "gemini-3.1-flash-image-preview-4k",
      label: "gemini-3.1-flash-image-preview-4k",
    },
    { value: "nano-banana-pro", label: "nano-banana-pro" },
    { value: "nano-banana-pro-2k", label: "nano-banana-pro-2k" },
  ],
  gemini: [
    {
      value: "gemini-3.1-flash-image-preview-2k",
      label: "gemini-3.1-flash-image-preview-2k",
    },
    {
      value: "gemini-3.1-flash-image-preview-4k",
      label: "gemini-3.1-flash-image-preview-4k",
    },
  ],
  doubao: [
    {
      value: "doubao-seedream-5-0-260128",
      label: "doubao-seedream-5-0-260128",
    },
    {
      value: "doubao-seedream-4-5-251128",
      label: "doubao-seedream-4-5-251128",
    },
    {
      value: "doubao-seededit-3-0-i2i-250628",
      label: "doubao-seededit-3-0-i2i-250628",
    },
  ],
  flux: [
    { value: "flux-kontext-pro", label: "flux-kontext-pro" },
    { value: "flux-kontext-max", label: "flux-kontext-max" },
    { value: "flux-1.1-pro", label: "flux-1.1-pro" },
    { value: "flux-dev", label: "flux-dev" },
  ],
  qwen: [
    { value: "qwen-image-edit-max", label: "qwen-image-edit-max" },
    { value: "qwen-image-edit", label: "qwen-image-edit" },
    { value: "qwen-image", label: "qwen-image" },
    { value: "qwen-vl-max", label: "qwen-vl-max" },
    { value: "qwen-vl-plus", label: "qwen-vl-plus" },
  ],
  "gpt-image": [{ value: "gpt-image-2", label: "gpt-image-2（仅此一项）" }],
  ksyun: [
    { value: "ksyun-image", label: "ksyun-image（预留）" },
    { value: "ksyun-image-edit", label: "ksyun-image-edit（预留）" },
  ],
};
