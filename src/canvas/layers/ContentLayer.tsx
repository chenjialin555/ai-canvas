import type { ReactNode } from "react";
import { Layer } from "react-konva";

export type ContentLayerProps = {
  children: ReactNode;
};

export function ContentLayer({ children }: ContentLayerProps) {
  return <Layer>{children}</Layer>;
}
