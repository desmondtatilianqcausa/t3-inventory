"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../dialog";
import { ScrollArea, ScrollBar } from "../../../../scroll-area";

import { Button } from "../../../blocks/button";
import type { JSX } from "react";
import { NotebookPenIcon } from "lucide-react";
import { TreeView } from "@lexical/react/LexicalTreeView";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export function TreeViewPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size={"sm"} variant={"ghost"} className="p-2">
          <NotebookPenIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tree View</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-96 overflow-hidden rounded-lg bg-foreground p-2 text-background">
          <TreeView
            viewClassName="tree-view-output"
            treeTypeButtonClassName="debug-treetype-button"
            timeTravelPanelClassName="debug-timetravel-panel"
            timeTravelButtonClassName="debug-timetravel-button"
            timeTravelPanelSliderClassName="debug-timetravel-panel-slider"
            timeTravelPanelButtonClassName="debug-timetravel-panel-button"
            editor={editor}
          />
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
