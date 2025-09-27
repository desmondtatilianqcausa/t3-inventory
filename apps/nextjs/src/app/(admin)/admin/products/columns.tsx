import Image from "next/image";
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

export type Product = Doc<"products">;

export function getColumns(
  categoryIdToName: Record<string, string>,
): ColumnDef<Product>[] {
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
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Product
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => {
        const p = row.original as Product & {
          featuredImageUrl?: string;
        };
        const url: string | undefined =
          typeof p.featuredImageUrl === "string"
            ? p.featuredImageUrl
            : undefined;
        return (
          <Link
            href={`/admin/products/${p._id as unknown as string}`}
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
      accessorKey: "mondayItemId",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Monday Item ID
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => {
        const p = row.original as Product;
        return <div className="text-right">{p.mondayItemId}</div>;
      },
      meta: {
        headerClassName: "min-w-20",
      },
    },
    {
      accessorKey: "stock",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Stock
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="mr-10 text-right">{row.getValue("stock")}</div>
      ),
      meta: {
        headerClassName: "min-w-20",
      },
    },
    {
      accessorKey: "productCategoryId",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Category
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => {
        const p = row.original as Product;
        const id = p.productCategoryId as unknown as string | null | undefined;
        const name = id ? (categoryIdToName[id] ?? id) : "";
        return <div className="text-right">{name}</div>;
      },
      meta: {
        headerClassName: "min-w-48",
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original;
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
                  navigator.clipboard.writeText(
                    product._id as unknown as string,
                  )
                }
              >
                Copy product ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/admin/products/${String(product._id)}`}>
                  View details
                </Link>
              </DropdownMenuItem>
              <RowActions product={product} />
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      meta: {
        headerClassName: "min-w-20",
      },
    },
  ];
}
