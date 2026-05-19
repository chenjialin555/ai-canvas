/** 让出主线程一帧，避免长任务完全卡住 UI（加载动画、点击反馈） */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
