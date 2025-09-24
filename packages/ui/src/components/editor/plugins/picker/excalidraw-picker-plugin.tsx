import { ComponentPickerOption } from "../../plugins/picker/component-picker-option";
import { FrameIcon } from "lucide-react";
import { INSERT_EXCALIDRAW_COMMAND } from "../../plugins/excalidraw-plugin";

export function ExcalidrawPickerPlugin() {
  return new ComponentPickerOption("Excalidraw", {
    icon: <FrameIcon className="size-4" />,
    keywords: ["excalidraw", "diagram", "drawing"],
    onSelect: (_, editor) =>
      editor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND, undefined),
  });
}
