/** 异步编码 Canvas，减轻 toDataURL 同步阻塞（仍受像素量影响，需配合分辨率上限） */
export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  mime: "image/png" | "image/jpeg" = "image/png",
  quality?: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === "function") {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            try {
              resolve(canvas.toDataURL(mime, quality));
            } catch (e) {
              reject(e);
            }
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error ?? new Error("read blob failed"));
          reader.readAsDataURL(blob);
        },
        mime,
        quality,
      );
      return;
    }
    try {
      resolve(canvas.toDataURL(mime, quality));
    } catch (e) {
      reject(e);
    }
  });
}
