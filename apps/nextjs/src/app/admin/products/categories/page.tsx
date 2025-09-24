"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/app/_components/ui/dialog";

import { Button } from "~/app/_components/ui/button";
import { DataTable } from "~/app/_components/Table";
import ProductCategoriesForm from "~/app/admin/products/categories/_components/ProductCategoriesForm";
import { api } from "@/convex/_generated/api";
import { columns } from "./columns";
import { useQuery } from "convex/react";
import { useState } from "react";
import { useToast } from "~/app/_components/ui/use-toast";

export default function AdminProductCategoriesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const categories = useQuery(api.products.queries.getAllCategories, {});
  const handleAdd = () => {
    setOpen(true);
  };

  return (
    <div className="container flex flex-1 flex-col p-4">
      <h1 className="text-3xl font-bold">Product Categories</h1>
      <DataTable
        data={categories ?? []}
        columns={columns}
        postType="Category"
        onAddNew={handleAdd}
        // handleDelete={handleDelete}
        // handleDuplicate={handleDuplicate}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product Category</DialogTitle>
          </DialogHeader>
          <ProductCategoriesForm
            onSuccess={() => {
              setOpen(false);
              toast({ title: "Category created" });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
