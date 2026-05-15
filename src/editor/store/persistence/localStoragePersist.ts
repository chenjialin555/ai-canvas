import type { EditorState, Page } from "../../types";
import { STORAGE_KEY, TINY_PERSIST_PNG } from "../constants";
import { clone } from "../helpers/clone";

type LocalPersistPayload = Pick<
  EditorState,
  "pages" | "activePageId" | "zoom" | "pan" | "quickToolbarConfig" | "editorMode"
>;

function shrinkLargeDataUrlsInPages(
  pages: Page[],
  maxDataUrlLength: number,
): void {
  for (const page of pages) {
    for (const el of page.elements) {
      if (
        el.type === "image" &&
        typeof el.src === "string" &&
        el.src.startsWith("data:") &&
        el.src.length > maxDataUrlLength
      ) {
        el.src = TINY_PERSIST_PNG;
      }
    }
    for (const node of page.aiNodes) {
      const outs = node.outputs;
      for (const key of Object.keys(outs)) {
        const v = outs[key];
        if (!v || typeof v !== "object" || !("type" in v)) continue;
        if (
          (v.type === "image" || v.type === "mask") &&
          "url" in v &&
          typeof (v as { url?: unknown }).url === "string"
        ) {
          const url = (v as { url: string }).url;
          if (url.startsWith("data:") && url.length > maxDataUrlLength) {
            (outs as Record<string, Record<string, unknown>>)[key] = {
              ...(v as Record<string, unknown>),
              url: TINY_PERSIST_PNG,
            };
          }
        }
      }
    }
  }
}

function stringifyPersistPayloadWithDataUrlCap(
  payload: LocalPersistPayload,
  maxDataUrlLength: number,
): string {
  const copy = clone(payload);
  shrinkLargeDataUrlsInPages(copy.pages, maxDataUrlLength);
  return JSON.stringify(copy);
}

export function tryWriteProjectToLocalStorage(
  payload: LocalPersistPayload,
): void {
  let json: string;
  try {
    json = JSON.stringify(payload);
  } catch (e) {
    console.warn("[store] JSON.stringify for persist failed:", e);
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, json);
    return;
  } catch (e) {
    const isQuota =
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.code === 22);
    if (!isQuota) {
      console.warn("[store] localStorage.setItem failed:", e);
      return;
    }
  }

  for (const maxLen of [120_000, 24_000, 4_000]) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        stringifyPersistPayloadWithDataUrlCap(payload, maxLen),
      );
      return;
    } catch {
      // stricter cap on next iteration
    }
  }
  console.warn(
    "[store] localStorage quota: project too large even after stripping long data URLs",
  );
}
