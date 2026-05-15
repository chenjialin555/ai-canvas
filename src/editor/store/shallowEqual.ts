import type { CanvasElement } from "../types";

/** 稳定空数组，供 Zustand selector 在无数据时返回同一引用 */
export const EMPTY_STRING_ARRAY: string[] = [];

export const EMPTY_ELEMENTS: CanvasElement[] = [];

export function shallowArrayEqual<T>(a: T[], b: T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
