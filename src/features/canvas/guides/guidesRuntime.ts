import type { GuideLine } from "../types";

type Listener = () => void;

/** 稳定空数组，避免 useSyncExternalStore 因每次 [] 新引用而死循环 */
const EMPTY_GUIDES: GuideLine[] = [];

let guidesSnapshot: GuideLine[] = EMPTY_GUIDES;
const listeners = new Set<Listener>();

function guidesEqual(a: GuideLine[], b: GuideLine[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x.type !== y.type || x.position !== y.position) return false;
  }
  return true;
}

export function getGuidesSnapshot(): GuideLine[] {
  return guidesSnapshot;
}

export function setGuidesRuntime(next: GuideLine[]): void {
  const normalized = next.length === 0 ? EMPTY_GUIDES : next;
  if (guidesEqual(guidesSnapshot, normalized)) return;
  guidesSnapshot = normalized;
  for (const l of listeners) l();
}

export function subscribeGuides(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
