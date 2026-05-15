import type { ReactNode } from "react";

type AppShellProps = {
  onRootMouseDown: () => void;
  topBar: ReactNode;
  leftSidebar: ReactNode;
  canvasArea: ReactNode;
  rightSidebar: ReactNode;
  overlays: ReactNode;
};

export function AppShell(props: AppShellProps) {
  return (
    <div className="figma-app" onMouseDown={props.onRootMouseDown}>
      {props.topBar}
      <main className="figma-main">
        {props.leftSidebar}
        {props.canvasArea}
        {props.rightSidebar}
      </main>
      {props.overlays}
    </div>
  );
}
