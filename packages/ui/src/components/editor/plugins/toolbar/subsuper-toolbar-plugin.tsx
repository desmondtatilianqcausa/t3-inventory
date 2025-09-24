"use client";

import type { BaseSelection} from "lexical";
import { $isRangeSelection, FORMAT_TEXT_COMMAND } from "lexical";
import { SubscriptIcon, SuperscriptIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "../../../../toggle-group";

import { $isTableSelection } from "@lexical/table";
import { useState } from "react";
import { useToolbarContext } from "../../context/toolbar-context";
import { useUpdateToolbarHandler } from "../../editor-hooks/use-update-toolbar";

export function SubSuperToolbarPlugin() {
  const { activeEditor } = useToolbarContext();
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);

  const $updateToolbar = (selection: BaseSelection) => {
    if ($isRangeSelection(selection) || $isTableSelection(selection)) {
      // @ts-ignore
      setIsSubscript(selection.hasFormat("subscript"));
      // @ts-ignore
      setIsSuperscript(selection.hasFormat("superscript"));
    }
  };

  useUpdateToolbarHandler($updateToolbar);

  return (
    <ToggleGroup
      type="single"
      defaultValue={
        isSubscript ? "subscript" : isSuperscript ? "superscript" : ""
      }
    >
      <ToggleGroupItem
        value="subscript"
        aria-label="Toggle subscript"
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "subscript");
        }}
        size="sm"
        variant={"outline"}
      >
        <SubscriptIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="superscript"
        aria-label="Toggle superscript"
        onClick={() => {
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "superscript");
        }}
        size="sm"
        variant={"outline"}
      >
        <SuperscriptIcon className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
