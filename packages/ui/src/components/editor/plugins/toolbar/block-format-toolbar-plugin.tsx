"use client";

import { $findMatchingParent, $getNearestNodeOfType } from "@lexical/utils";
import { $isListNode, ListNode } from "@lexical/list";
import { $isRangeSelection, $isRootOrShadowRoot } from "lexical";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectTrigger,
} from "../../../select";

import { $isHeadingNode } from "@lexical/rich-text";
import type { BaseSelection } from "lexical";
import { blockTypeToBlockName } from "../../plugins/toolbar/block-format/block-format-data";
import { useToolbarContext } from "../../context/toolbar-context";
import { useUpdateToolbarHandler } from "../../editor-hooks/use-update-toolbar";

export function BlockFormatDropDown({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeEditor, blockType, setBlockType } = useToolbarContext();

  function $updateToolbar(selection: BaseSelection) {
    if ($isRangeSelection(selection)) {
      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && $isRootOrShadowRoot(parent);
            });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        // setSelectedElementKey(elementKey);
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(
            anchorNode,
            ListNode,
          );
          const type = parentList
            ? parentList.getListType()
            : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type);
          }
        }
      }
    }
  }

  useUpdateToolbarHandler($updateToolbar);

  return (
    <Select
      value={blockType}
      onValueChange={(value) => {
        setBlockType(value);
      }}
    >
      <SelectTrigger className="h-8 w-min gap-1">
        {blockTypeToBlockName[blockType].icon}
        <span>{blockTypeToBlockName[blockType].label}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>{children}</SelectGroup>
      </SelectContent>
    </Select>
  );
}
