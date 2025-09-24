import { type Doc } from "@/convex/_generated/dataModel";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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

type Integration = Doc<"integrations">;

export const columns: ColumnDef<Integration>[] = [
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
    accessorKey: "name",
    header: "Integration",
    cell: ({ row }) => {
      const p = row.original as Integration & {
        featuredImageUrl?: string;
      };
      const url: string | undefined =
        typeof p.featuredImageUrl === "string" ? p.featuredImageUrl : undefined;
      return (
        <Link
          href={`/admin/settings/integrations/${p._id as unknown as string}`}
          className="flex items-center gap-3"
        >
          {url ? (
            <Image
              src={url}
              alt=""
              className="h-10 w-10 rounded border object-cover"
              width={40}
              height={40}
            />
          ) : (
            <div className="h-10 w-10 rounded border bg-muted" />
          )}
          <span className="font-medium">{p.name}</span>
        </Link>
      );
    },
    meta: {
      headerClassName: "w-full",
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const payment = row.original;
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
                navigator.clipboard.writeText(payment._id as unknown as string)
              }
            >
              Copy product ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    meta: {
      headerClassName: "min-w-20",
    },
  },
];
