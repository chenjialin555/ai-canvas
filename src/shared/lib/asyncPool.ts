/** 限制并发的 Promise 池 */
export async function asyncPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (!items.length) return;
  let next = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i]!, i);
      }
    },
  );
  await Promise.all(workers);
}
