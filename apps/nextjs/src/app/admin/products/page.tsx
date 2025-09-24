"use client";

import React, { useMemo, useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "~/app/_components/ui/toggle-group";
import { useMutation, useQuery } from "convex/react";

import { DataTable } from "~/app/_components/Table";
import { Spinner } from "~/app/_components/ui/loading-spinner";
import { api } from "@/convex/_generated/api";
import { getColumns } from "./columns";
import { useRouter } from "next/navigation";

function ProductsPage() {
  const router = useRouter();
  const products = useQuery(api.products.queries.getAll);
  const categories = useQuery(api.products.queries.getAllCategories, {});
  const createProduct = useMutation(api.products.mutations.create);

  const productsLoading = products === undefined || categories === undefined;

  const categoryIdToName: Record<string, string> = {};
  for (const c of categories ?? []) {
    categoryIdToName[c._id as unknown as string] = c.name as unknown as string;
  }

  const categoryOptions = useMemo(() => {
    const opts: Array<{ id: string; label: string }> = [];
    for (const c of categories ?? []) {
      const id = c._id as unknown as string;
      const label = c.name as unknown as string;
      opts.push({ id, label });
    }
    // fallback: infer from product data if categories query empty
    if (opts.length === 0) {
      const seen = new Map<string, string>();
      for (const p of products ?? []) {
        const cid = p.productCategoryId as unknown as string | undefined | null;
        if (!cid) continue;
        if (!seen.has(cid)) seen.set(cid, cid);
      }
      for (const [id, label] of seen.entries()) opts.push({ id, label });
    }
    // sort alphabetically by label
    opts.sort((a, b) => a.label.localeCompare(b.label));
    return opts;
  }, [categories, products]);

  const [activeCategoryId, setActiveCategoryId] = useState<string>("");

  const filterUi = (
    <div className="flex w-full flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">Filter by category:</span>
      <ToggleGroup
        type="single"
        value={activeCategoryId}
        onValueChange={(v) => setActiveCategoryId(v)}
        className="flex flex-wrap justify-start gap-2"
      >
        <ToggleGroupItem value="" aria-label="All">
          All
        </ToggleGroupItem>
        {categoryOptions.map((c) => (
          <ToggleGroupItem
            key={c.id}
            value={c.id}
            aria-label={c.label}
            className="bg-muted/40 data-[state=on]:bg-primary/40"
          >
            {c.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );

  const handleAddProduct = async () => {
    const id = await createProduct({
      name: "Untitled Product",
      description: "",
      stock: 0,
      price: 0,
      category: undefined,
      productCategoryId: undefined,
    });
    router.push(`/admin/products/${String(id)}`);
  };

  if (productsLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <DataTable
      title="Products"
      titleSize="3xl"
      data={(products ?? []).filter((p) =>
        activeCategoryId
          ? (p.productCategoryId as unknown as string) === activeCategoryId
          : true,
      )}
      columns={getColumns(categoryIdToName)}
      postType="Product"
      filterComponent={filterUi}
      onAddNew={handleAddProduct}
    />
  );
}

export default ProductsPage;
