"use client";

import { DiffIcon } from "lucide-react";
import { InsertEquationDialog } from "../../../plugins/equations-plugin";
import { SelectItem } from "../../../../select";
import { useToolbarContext } from "../../../context/toolbar-context";

export function InsertEquation() {
  const { activeEditor, showModal } = useToolbarContext();

  return (
    <SelectItem
      value="equation"
      onPointerUp={() =>
        showModal("Insert Equation", (onClose) => (
          <InsertEquationDialog activeEditor={activeEditor} onClose={onClose} />
        ))
      }
      className=""
    >
      <div className="flex items-center gap-1">
        <DiffIcon className="size-4" />
        <span>Equation</span>
      </div>
    </SelectItem>
  );
}
