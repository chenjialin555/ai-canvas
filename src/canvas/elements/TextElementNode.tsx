import { Group, Rect, Text } from "react-konva";
import { useEditorStore } from "../../editor/store";
import type { CanvasElement, TextElement } from "../../editor/types";
import { commonProps } from "./commonProps";

export type TextElementNodeProps = {
  element: TextElement;
};

export function TextElementNode(props: TextElementNodeProps) {
  const el = props.element;
  const editingTextId = useEditorStore((s) => s.editingTextId);
  const setEditingTextId = useEditorStore((s) => s.setEditingTextId);
  const updateElement = useEditorStore((s) => s.updateElement);

  if (editingTextId === el.id) {
    return (
      <Group {...commonProps(el)} draggable={false}>
        <Rect
          x={0}
          y={0}
          width={el.width}
          height={el.height}
          fill="rgba(255,255,255,0.92)"
          stroke="#2f7cff"
          strokeWidth={2}
        />
        <Text
          x={8}
          y={8}
          width={el.width - 16}
          height={el.height - 16}
          text={el.text}
          fontSize={el.fontSize}
          fontFamily={el.fontFamily}
          fontStyle={el.fontWeight}
          fill={el.color}
          verticalAlign="middle"
        />
      </Group>
    );
  }

  return (
    <Text
      {...commonProps(el)}
      text={el.text}
      fontSize={el.fontSize}
      fontFamily={el.fontFamily}
      fontStyle={el.fontWeight}
      fill={el.color}
      align={el.align}
      verticalAlign="middle"
      onDblClick={(e) => {
        e.cancelBubble = true;
        e.evt.stopPropagation();
        const stage = e.target.getStage();
        if (!stage) return;

        setEditingTextId(el.id);

        const textarea = document.createElement("textarea");
        document.body.appendChild(textarea);

        const stageBox = stage.container().getBoundingClientRect();
        const pos = e.target.absolutePosition();

        textarea.value = el.text;
        textarea.className = "konva-textarea";

        textarea.style.left = `${stageBox.left + pos.x}px`;
        textarea.style.top = `${stageBox.top + pos.y}px`;
        textarea.style.width = `${el.width * stage.scaleX()}px`;
        textarea.style.height = `${el.height * stage.scaleY()}px`;
        textarea.style.fontSize = `${el.fontSize * stage.scaleX()}px`;
        textarea.style.fontFamily = el.fontFamily;
        textarea.style.fontWeight = el.fontWeight;
        textarea.style.color = el.color;

        textarea.focus();
        textarea.select();

        function finish(save: boolean) {
          if (save) {
            updateElement(el.id, {
              text: textarea.value,
            } as Partial<CanvasElement>);
          }

          setEditingTextId(null);
          textarea.remove();
        }

        textarea.addEventListener("keydown", (ev) => {
          if (ev.key === "Escape") finish(false);
          if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) finish(true);
        });

        textarea.addEventListener("blur", () => finish(true));
      }}
    />
  );
}
