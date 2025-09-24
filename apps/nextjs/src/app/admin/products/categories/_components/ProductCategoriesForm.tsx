"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { slugify } from "@/convex/events/helpers";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "react-hook-form";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/app/_components/ui/form";
import { Button } from "../../../../_components/ui/button";
import { Input } from "../../../../_components/ui/input";

type CategoryFormValues = {
  name: string;
  slug: string;
  description?: string;
  mondayGroupId?: string;
};

export default function ProductCategoriesForm({
  categoryId,
  onSuccess,
}: {
  categoryId?: string;
  onSuccess?: () => void;
}) {
  const category = useQuery(
    api.products.queries.getCategoryById,
    categoryId
      ? { id: categoryId as unknown as Id<"productCategories"> }
      : "skip",
  );
  const allCategories = useQuery(api.products.queries.getAllCategories, {});
  const create = useMutation(api.products.mutations.createCategory);
  const update = useMutation(api.products.mutations.updateCategory);
  const setCategoryMondayGroupId = useMutation(
    api.products.mutations.setCategoryMondayGroupId,
  );

  const form = useForm<CategoryFormValues>({
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      mondayGroupId: "",
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        slug: category.slug,
        description: category.description,
        mondayGroupId:
          (category.mondayGroupId as string | undefined | null) ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, category?._id]);

  const watchSlug = form.watch("slug");
  const duplicateSlug = useMemo(() => {
    const s = (watchSlug || "").trim();
    if (!s) return false;
    const normalized = slugify(s);
    const currentId = categoryId;
    return (
      (allCategories ?? []).some(
        (c) =>
          c.slug === normalized && String(c._id) !== String(currentId ?? ""),
      ) || false
    );
  }, [watchSlug, allCategories, categoryId]);

  const [touchedName, setTouchedName] = useState(false);

  const onSubmit = async (values: CategoryFormValues) => {
    const normalizedSlug = slugify(values.slug);
    if (!normalizedSlug) {
      form.setError("slug", { message: "Slug is required" });
      return;
    }
    if (duplicateSlug) {
      form.setError("slug", { message: "Slug already exists" });
      return;
    }

    if (categoryId) {
      await update({
        id: categoryId as unknown as Id<"productCategories">,
        name: values.name,
        slug: normalizedSlug,
        description: values.description,
      });
      if ((values.mondayGroupId || "").trim()) {
        await setCategoryMondayGroupId({
          id: categoryId as unknown as Id<"productCategories">,
          mondayGroupId: String(values.mondayGroupId).trim(),
        });
      }
    } else {
      const newId = await create({
        name: values.name,
        slug: normalizedSlug,
        description: values.description,
      });
      if ((values.mondayGroupId || "").trim()) {
        await setCategoryMondayGroupId({
          id: newId as unknown as Id<"productCategories">,
          mondayGroupId: String(values.mondayGroupId).trim(),
        });
      }
    }
    form.reset({ name: "", slug: "", description: "", mondayGroupId: "" });
    onSuccess?.();
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onBlur={(e) => {
                    field.onBlur();
                    setTouchedName(true);
                    const currentSlug = form.getValues("slug");
                    if (!currentSlug) {
                      form.setValue("slug", slugify(e.target.value));
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value}
                  onChange={(e) => field.onChange(slugify(e.target.value))}
                />
              </FormControl>
              <FormMessage />
              {duplicateSlug && (
                <div className="text-sm text-red-600">Slug already exists</div>
              )}
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
          name="mondayGroupId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monday Group ID</FormLabel>
              <FormControl>
                <Input {...field} placeholder="grp_..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={duplicateSlug}>
          Save
        </Button>
      </form>
    </Form>
  );
}
