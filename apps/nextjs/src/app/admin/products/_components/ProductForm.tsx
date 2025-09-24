"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { cn } from "src/lib/utils";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/app/_components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/app/_components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/app/_components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/app/_components/ui/select";
import { Button } from "../../../_components/ui/button";
import { Input } from "../../../_components/ui/input";
import { useToast } from "../../../_components/ui/use-toast";

// Define product status type aligned with backend expectations
type ProductStatus = "Draft" | "Published" | "Removed";

type ProductFormValues = {
  name: string;
  description?: string;
  stock: number;
  price: number;
  category?: string;
  productCategoryId?: string;
  status?: ProductStatus;
};

export default function ProductForm({ productId }: { productId?: string }) {
  const product = useQuery(
    api.products.queries.getById,
    productId ? { id: productId as Id<"products"> } : "skip",
  );
  const categories = useQuery(api.products.queries.getAllCategories, {});
  const createProduct = useMutation(api.products.mutations.create);
  const updateProduct = useMutation(api.products.mutations.update);
  const generateUploadUrl = useMutation(
    api.products.mutations.generateUploadUrl,
  );
  const setFeaturedImage = useMutation(api.products.mutations.setFeaturedImage);

  const { toast } = useToast();

  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<ProductFormValues>({
    defaultValues: {
      name: "",
      description: "",
      stock: 0,
      price: 0,
      category: "",
      productCategoryId: undefined,
      status: "Draft",
    },
  });

  useEffect(() => {
    if (product) {
      setPreviewUrl(
        typeof product?.featuredImageUrl === "string"
          ? (product.featuredImageUrl as string)
          : undefined,
      );
      form.reset({
        name: product.name,
        description: product.description ?? "",
        stock: product.stock ?? 0,
        price: product.price ?? 0,
        category: product.category ?? "",
        productCategoryId:
          (product.productCategoryId as string | undefined | null) ?? undefined,
        status: (product.status as ProductStatus | undefined) ?? "Draft",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, product?._id]);

  const onSubmit = async (values: ProductFormValues) => {
    try {
      const categoryIdConvex = values.productCategoryId
        ? (values.productCategoryId as unknown as Id<"productCategories">)
        : undefined;
      if (productId) {
        await updateProduct({
          id: productId as Id<"products">,
          name: values.name,
          description: values.description ?? undefined,
          stock: values.stock,
          price: values.price,
          category: values.category ?? undefined,
          productCategoryId: categoryIdConvex,
          status: values.status ?? "Draft",
        });
        toast({ title: "Product updated", description: "Saved successfully" });
      } else {
        const newId = await createProduct({
          name: values.name,
          description: values.description ?? undefined,
          stock: values.stock,
          price: values.price,
          category: values.category ?? undefined,
          productCategoryId: categoryIdConvex,
          // Enforce products start in Draft on creation
          status: "Draft",
        });
        if (fileInputRef.current?.files?.[0]) {
          await uploadFeaturedImage(newId);
        }
        toast({ title: "Product created", description: "Saved successfully" });
      }
    } catch (e) {
      toast({
        title: "Failed to save product",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const uploadFeaturedImage = async (targetProductId: Id<"products">) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const postUrl = await generateUploadUrl({});
    const res = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    await setFeaturedImage({ productId: targetProductId, storageId });
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUploadClick = async () => {
    if (!product?._id) return; // only allow immediate upload in edit mode
    await uploadFeaturedImage(product._id as Id<"products">);
  };

  // Command-based category selector state
  const [catOpen, setCatOpen] = useState(false);
  const catTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [catWidth, setCatWidth] = useState<number | null>(null);

  const selectedCategoryLabel = (() => {
    const value = form.getValues("productCategoryId");
    if (!value) return undefined;
    const found = (categories ?? []).find(
      (c) => String(c._id as unknown as string) === String(value),
    );
    return (found?.name as unknown as string) || undefined;
  })();

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Name</FormLabel>
              <FormControl>
                <Input {...field} className="md:text-lg!" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value || "0"))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  value={field.value}
                  onChange={(e) =>
                    field.onChange(parseFloat(e.target.value || "0"))
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status selector: visible always, disabled during creation to ensure Draft start */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!productId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                  <SelectItem value="Removed">Removed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Featured Image</FormLabel>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Featured"
              className="h-32 w-32 rounded border object-cover"
            />
          ) : (
            <div className="h-32 w-32 rounded border bg-muted" />
          )}
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" />
            <Button
              type="button"
              variant="outline"
              onClick={handleUploadClick}
              disabled={!product?._id}
            >
              Upload
            </Button>
          </div>
        </div>

        <FormField
          control={form.control}
          name="productCategoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Category</FormLabel>
              <Popover
                open={catOpen}
                onOpenChange={(open) => {
                  setCatOpen(open);
                  if (open && catTriggerRef.current) {
                    setCatWidth(catTriggerRef.current.offsetWidth);
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    ref={catTriggerRef}
                    variant="outline"
                    role="combobox"
                    aria-expanded={catOpen}
                    className="w-full justify-between"
                  >
                    {selectedCategoryLabel ?? "Uncategorized"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="p-0"
                  style={{ width: catWidth ?? undefined }}
                >
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandEmpty>No categories found.</CommandEmpty>
                    <CommandList className="w-full">
                      <CommandGroup heading="All Categories">
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            field.onChange(undefined);
                            setCatOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !field.value ? "opacity-100" : "opacity-0",
                            )}
                          />
                          Uncategorized
                        </CommandItem>
                        {[...(categories ?? [])]
                          .sort((a, b) =>
                            String(a.name ?? "").localeCompare(
                              String(b.name ?? ""),
                            ),
                          )
                          .map((c) => {
                            const value = String(c._id as unknown as string);
                            const label = c.name as unknown as string;
                            return (
                              <CommandItem
                                key={value}
                                value={label}
                                onSelect={() => {
                                  field.onChange(value);
                                  setCatOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    String(field.value ?? "") === value
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {label}
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}
