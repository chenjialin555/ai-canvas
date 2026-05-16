/** 生成随机哈希文件名，如 `a3f8c2…e1.jpg` */
export function randomImageFilename(ext = "png"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hash = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const safeExt = ext.replace(/^\./, "").toLowerCase() || "png";
  return `${hash}.${safeExt}`;
}

/** 从 URL 推断扩展名，失败则默认 png */
export function extFromImageUrl(url: string): string {
  const m = url.split("?")[0]?.match(/\.(png|jpe?g|webp|gif)$/i);
  if (!m) return "png";
  const raw = m[1]!.toLowerCase();
  return raw === "jpeg" ? "jpg" : raw;
}
