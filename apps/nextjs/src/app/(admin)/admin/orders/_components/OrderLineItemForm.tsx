"use client";

import * as React from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/app/_components/ui/card";
import { useMemo, useState } from "react";

import { Button } from "~/app/_components/ui/button";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "~/app/_components/Table";
import type { Id } from "@/convex/_generated/dataModel";
import { Input } from "~/app/_components/ui/input";
import { LazyMondayImage } from "~/app/_components/LazyMondayImage";
import { Separator } from "~/app/_components/ui/separator";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export type SelectableProduct = {
  _id: string;
  name: string;
  price: number;
  stock: number;
  productCategoryId?: string;
};

export default function OrderLineItemForm({
  onAdd,
}: {
  onAdd: (
    items: Array<{ productId: Id<"products">; quantity: number }>,
  ) => void;
}) {
  const products = useQuery(api.products.queries.getAll, {}) as
    | Array<SelectableProduct>
    | undefined;
  const categories = useQuery(api.products.queries.getAllCategories, {});

  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [selected, setSelected] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    let rows = products ?? [];
    if (categoryFilter)
      rows = rows.filter(
        (p) =>
          (p.productCategoryId as unknown as string | undefined) ===
          categoryFilter,
      );
    if (search.trim())
      rows = rows.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      );
    return rows;
  }, [products, categoryFilter, search]);

  const columns: ColumnDef<SelectableProduct>[] = useMemo(
    () => [
      {
        id: "select",
        header: () => <span>Select</span>,
        cell: ({ row }) => {
          const id = row.original._id;
          const stock = Number(row.original.stock ?? 0);
          const qty = selected[id] ?? 0;
          const disabled = stock <= 0;
          return (
            <div className="flex items-center gap-2">
              {disabled ? (
                <span className="text-xs font-medium text-red-600">
                  Out of stock
                </span>
              ) : (
                <>
                  <input
                    type="checkbox"
                    checked={qty > 0}
                    disabled={disabled}
                    aria-disabled={disabled}
                    title={disabled ? "Out of stock" : undefined}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [id]: e.target.checked
                          ? Math.max(1, Math.min(prev[id] ?? 1, stock))
                          : 0,
                      }))
                    }
                  />
                  <div className="flex flex-col items-center">
                    <Input
                      type="number"
                      className="mb-32! w-24"
                      value={qty || 0}
                      min={qty > 0 ? 1 : 0}
                      max={stock}
                      disabled={disabled}
                      aria-disabled={disabled}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value || "0");
                        const clamped = Math.max(
                          0,
                          Math.min(isNaN(raw) ? 0 : raw, stock),
                        );
                        setSelected((prev) => ({ ...prev, [id]: clamped }));
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      max {stock}
                    </span>
                  </div>
                </>
              )}
              {/* {disabled ? (
                <span className="text-xs font-medium text-red-600">
                  Out of stock
                </span>
              ) : null} */}
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <LazyMondayImage productId={row.original._id as string} />
            <span>{row.original.name}</span>
          </div>
        ),
        meta: { headerClassName: "w-full" },
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => <>${row.original.price}</>,
        meta: { headerClassName: "min-w-24" },
      },
      {
        accessorKey: "stock",
        header: "Stock",
        meta: { headerClassName: "min-w-24" },
      },
    ],
    [selected],
  );

  const handleAdd = () => {
    const items = Object.entries(selected)
      .filter(([, q]) => (q ?? 0) > 0)
      .map(([key, q]) => ({
        productId: key as unknown as Id<"products">,
        quantity: Number(q),
      }));
    if (items.length === 0) return;
    onAdd(items);
  };

  return (
    <Card className="space-y-3 border-none shadow-none">
      <CardHeader className="sticky top-0 z-10 gap-2 bg-white">
        <CardTitle className="text-xl font-bold">Add Products</CardTitle>
        <div className="grid grid-cols-3 gap-2">
          <select
            className="rounded border p-2"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories?.map((c) => (
              <option
                key={c._id as unknown as string}
                value={c._id as unknown as string}
              >
                {c.name}
              </option>
            ))}
          </select>
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="text-right">
            <Button type="button" onClick={handleAdd}>
              Add Selected
            </Button>
          </div>
        </div>
        <Separator />
      </CardHeader>

      <CardContent>
        <DataTable
          data={filtered}
          columns={columns}
          postType="Product"
          showAddButton={false}
          showCustomizeColumns={true}
          initialColumnVisibility={{
            price: false,
          }}
          getRowId={(row) => row._id}
        />
      </CardContent>
    </Card>
  );
}
