"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { type Doc } from "@/convex/_generated/dataModel";
import { type ColumnDef } from "@tanstack/react-table";
import { useQuery } from "convex/react";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import { Badge } from "~/app/_components/ui/badge";
import { Button } from "~/app/_components/ui/button";
import { Checkbox } from "~/app/_components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/app/_components/ui/dropdown-menu";
import { useMonday } from "~/app/providers";
import RowActions, { RowActionsHandle } from "./RowActions";

type Order = Doc<"orders">;

type EventNameMap = Record<string, string>;

export const createColumns = (eventNames: EventNameMap): ColumnDef<Order>[] => {
  const { isInMonday } = useMonday();
  const users = useQuery(api.users.queries.listAll, {});
  const idToEmail = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const u of (users as any[]) ?? []) {
      if (u?._id) m.set(String(u._id), String(u.email ?? ""));
    }
    return m;
  }, [users]);

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: {
        headerClassName: "min-w-20",
      },
    },
    {
      accessorKey: "_id",
      header: "Order",
      cell: ({ row }) => (
        <Link
          href={`/admin/orders/${String(row.getValue("_id"))}`}
          className="capitalize hover:underline"
        >
          {typeof row.original.orderNumber === "number"
            ? `#${row.original.orderNumber}`
            : String(row.getValue("_id"))}
        </Link>
      ),
      meta: {
        headerClassName: "w-full",
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className="px-1.5 text-muted-foreground">
          {row.original.status}
        </Badge>
      ),
      meta: {
        headerClassName: "min-w-28",
      },
    },
    {
      accessorKey: "createdById",
      header: "Created By",
      cell: ({ row }) => {
        const id = String(row.original.createdById ?? "");
        const email = idToEmail.get(id);
        return <div>{email ?? id}</div>;
      },
      meta: {
        headerClassName: "min-w-48",
      },
    },
    {
      accessorKey: "totalQuantity",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total Items
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="mr-10 text-right">{row.getValue("totalQuantity")}</div>
      ),
      meta: {
        headerClassName: "min-w-20",
      },
    },
    {
      accessorKey: "eventId",
      header: () => <div className="text-right">Event</div>,
      cell: ({ row }) => {
        const idRaw = row.getValue("eventId");
        const id = typeof idRaw === "string" ? idRaw : undefined;
        const name = id ? eventNames[id] : undefined;
        if (!id) return <div className="text-right">—</div>;
        return (
          <div className="text-right">
            {isInMonday ? (
              <div>{name ?? id}</div>
            ) : (
              <Link href={`/admin/events/${id}`} className="underline">
                {name ?? id}
              </Link>
            )}
          </div>
        );
      },
      meta: {
        headerClassName: "min-w-96",
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const order = row.original;
        const [menuOpen, setMenuOpen] = React.useState(false);
        const dialogRef = useRef<RowActionsHandle>(null);
        return (
          <>
            <RowActions ref={dialogRef} order={order} />
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    navigator.clipboard.writeText(
                      order._id as unknown as string,
                    )
                  }
                >
                  Copy order ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/admin/orders/${String(order._id)}`}>
                    View details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setMenuOpen(false);
                    // delay opening dialog until menu closes to avoid focus conflicts
                    setTimeout(() => dialogRef.current?.openDialog(), 0);
                  }}
                  className="text-red-600"
                >
                  Delete order
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        );
      },
      meta: {
        headerClassName: "min-w-20",
      },
    },
  ];
};
