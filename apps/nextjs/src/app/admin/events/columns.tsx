import Link from "next/link";
import { type Doc } from "@/convex/_generated/dataModel";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

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

type Event = Doc<"events">;

export const columns: ColumnDef<Event>[] = [
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
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full!"
      >
        Event
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const event = row.original;
      const title = event.title;
      const id = event._id;
      return (
        <Link
          href={`/admin/events/${id as string}`}
          className="w-full flex-1 capitalize"
        >
          {title}
        </Link>
      );
    },
    meta: {
      headerClassName: "w-full",
    },
  },
  {
    accessorKey: "startAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full!"
      >
        Start Date/Time
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const event = row.original;
      return <div>{event.startAt}</div>;
    },
    meta: {
      headerClassName: "min-w-40",
    },
  },
  {
    accessorKey: "endAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full!"
      >
        End Date/Time
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const event = row.original;
      return <div>{event.endAt}</div>;
    },
    meta: {
      headerClassName: "min-w-40",
    },
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full!"
      >
        Location
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const loc = row.original.location as unknown;
      let text = "";
      if (typeof loc === "string") {
        text = loc;
      } else if (loc && typeof loc === "object") {
        const obj = loc as { name?: string; city?: string; state?: string };
        text =
          obj.name || [obj.city, obj.state].filter(Boolean).join(", ") || "";
      }
      return <div>{text || "—"}</div>;
    },
    meta: {
      headerClassName: "min-w-40",
    },
  },

  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const event = row.original;
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
              onClick={() => navigator.clipboard.writeText(event._id)}
            >
              Copy event ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/admin/events/${event._id}`}>View event</Link>
            </DropdownMenuItem>
            <RowActions event={event} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    meta: {
      headerClassName: "min-w-20",
    },
  },
];
