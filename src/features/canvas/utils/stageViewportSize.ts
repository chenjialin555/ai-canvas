/** 与 `StageCanvas` 中 Stage 尺寸计算保持一致，供视口居中、小地图等复用 */
export function getDefaultStageContentSize() {
  const width = Math.max(400, window.innerWidth - 260 - 294);
  const height = Math.max(300, window.innerHeight - 48 - 34);
  return { width, height };
}
