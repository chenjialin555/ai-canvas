import type { StoreApi } from "zustand";
import type { Store } from "./types";

export type StoreSet = StoreApi<Store>["setState"];
export type StoreGet = StoreApi<Store>["getState"];
