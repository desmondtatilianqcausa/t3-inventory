import { ComponentPickerOption } from "../../plugins/picker/component-picker-option";
import { InsertPollDialog } from "../../plugins/poll-plugin";
import { ListChecksIcon } from "lucide-react";

export function PollPickerPlugin() {
  return new ComponentPickerOption("Poll", {
    icon: <ListChecksIcon className="size-4" />,
    keywords: ["poll", "vote"],
    onSelect: (_, editor, showModal) =>
      showModal("Insert Poll", (onClose) => (
        <InsertPollDialog activeEditor={editor} onClose={onClose} />
      )),
  });
}
