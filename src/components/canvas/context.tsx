"use client";
import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { MapState, MapStore } from "./store";

export interface MapActions {
  /** Path to goal and structures are available (paid plans). */
  proTools: boolean;
  toggleTask: (nodeId: string) => void;
  toggleHabitToday: (nodeId: string) => void;
  focus: (nodeId: string) => void;
  path: (nodeId: string) => void;
  toggleCollapse: (nodeId: string) => void;
  addChild: (nodeId: string) => void;
  finishEdit: (nodeId: string, title: string | null) => void;
  /** Starts editing a card's text on the canvas. */
  editText: (nodeId: string) => void;
  finishText: (nodeId: string, text: string | null) => void;
}

export const MapCtx = createContext<{ store: MapStore; mapId: string; actions: MapActions; readOnly: boolean } | null>(null);

export function useMapCtx() {
  const c = useContext(MapCtx);
  if (!c) throw new Error("MapCtx missing");
  return c;
}

export function useMap<T>(selector: (s: MapState) => T) {
  return useStore(useMapCtx().store, selector);
}
