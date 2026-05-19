/**
 * 将高频回调合并为每帧最多一次（用于 pan/zoom、工作流连线指针等）。
 */
export function createRafBatcher<T>(fn: (value: T) => void) {
  let frameId: number | null = null;
  let pending: T | null = null;

  const schedule = (value: T) => {
    pending = value;
    if (frameId !== null) return;
    frameId = requestAnimationFrame(() => {
      frameId = null;
      const next = pending;
      pending = null;
      if (next !== null) fn(next);
    });
  };

  schedule.cancel = () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    pending = null;
  };

  return schedule;
}
