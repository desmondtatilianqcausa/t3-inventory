import { type Doc } from "@/convex/_generated/dataModel";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import Link from "next/link";
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
import RowActions from "./RowActions";

type Order = Doc<"orders">;

type EventNameMap = Record<string, string>;

export const createColumns = (eventNames: EventNameMap): ColumnDef<Order>[] => [
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
    header: "Order ID",
    cell: ({ row }) => (
      <Link
        href={`/admin/orders/${String(row.getValue("_id"))}`}
        className="capitalize hover:underline"
      >
        {String(row.getValue("_id"))}
      </Link>
    ),
    meta: {
      headerClassName: "w-full",
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge>{row.original.status}</Badge>,
    meta: {
      headerClassName: "min-w-28",
    },
  },
  {
    accessorKey: "customerId",
    header: "Created By",
    cell: ({ row }) => {
      const order = row.original;
      return <div>{order.createdById}</div>;
    },
    meta: {
      headerClassName: "min-w-28",
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
          <Link href={`/admin/events/${id}`} className="underline">
            {name ?? id}
          </Link>
        </div>
      );
    },
    meta: {
      headerClassName: "min-w-44",
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const order = row.original;
      return (
        <DropdownMenu>
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
                navigator.clipboard.writeText(order._id as unknown as string)
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
            <RowActions order={order} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    meta: {
      headerClassName: "min-w-20",
    },
  },
];
