"use client";

import * as React from "react";

import { useMemo, useState } from "react";

import { Button } from "../../../_components/ui/button";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../../../_components/Table";
import type { Id } from "@/convex/_generated/dataModel";
import { Input } from "../../../_components/ui/input";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export type SelectableProduct = {
  _id: string;
  name: string;
  price: number;
  quantity: number;
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
          const qty = selected[id] ?? 0;
          return (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={qty > 0}
                onChange={(e) =>
                  setSelected((prev) => ({
                    ...prev,
                    [id]: e.target.checked ? (prev[id] ?? 1) : 0,
                  }))
                }
              />
              <Input
                type="number"
                className="w-20"
                value={qty || 0}
                min={0}
                onChange={(e) =>
                  setSelected((prev) => ({
                    ...prev,
                    [id]: Math.max(0, parseInt(e.target.value || "0")),
                  }))
                }
              />
            </div>
          );
        },
      },
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => <>${row.original.price}</>,
      },
      { accessorKey: "quantity", header: "In Stock" },
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
    <div className="space-y-3">
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
      <DataTable data={filtered} columns={columns} postType="Product" />
    </div>
  );
}
