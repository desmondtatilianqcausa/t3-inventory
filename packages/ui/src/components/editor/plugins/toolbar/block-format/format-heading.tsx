import { $createHeadingNode } from "@lexical/rich-text";
import { $getSelection } from "lexical";
import { $setBlocksType } from "@lexical/selection";
import type { HeadingTagType } from "@lexical/rich-text";
import { SelectItem } from "../../../../select";
import { blockTypeToBlockName } from "./block-format-data";
import { useToolbarContext } from "../../../context/toolbar-context";

export function FormatHeading({ levels = [] }: { levels: HeadingTagType[] }) {
  const { activeEditor, blockType } = useToolbarContext();

  const formatHeading = (headingSize: HeadingTagType) => {
    if (blockType !== headingSize) {
      activeEditor.update(() => {
        const selection = $getSelection();
        $setBlocksType(selection, () => $createHeadingNode(headingSize));
      });
    }
  };

  return levels.map((level) => (
    <SelectItem
      key={level}
      value={level}
      onPointerDown={() => formatHeading(level)}
    >
      <div className="flex items-center gap-1 font-normal">
        {blockTypeToBlockName[level].icon}
        {blockTypeToBlockName[level].label}
      </div>
    </SelectItem>
  ));
}
