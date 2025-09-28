"use client";

import type { Doc, Id } from "@/convex/_generated/dataModel";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/app/_components/ui/alert-dialog";

export type RowActionsHandle = {
  openDialog: () => void;
};

const RowActions = forwardRef<RowActionsHandle, { order: Doc<"orders"> }>(
  ({ order }, ref) => {
    const remove = useMutation(api.orders.mutations.remove);
    const [open, setOpen] = useState(false);

    useImperativeHandle(ref, () => ({ openDialog: () => setOpen(true) }));

    const handleConfirm = async () => {
      setOpen(false);
      await remove({ id: order._id as Id<"orders"> });
    };

    return (
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              order and its line items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-red-600 hover:bg-red-500"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  },
);

RowActions.displayName = "RowActions";

export default RowActions;
