import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "./ui/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  name: z.string().min(1, { message: "Product title is required." }),
  description: z.string().optional(),
  image: z.string().optional(),
  category: z.string().optional(),
  quantity: z
    .number()
    .int()
    .min(0, { message: "Quantity must be a non-negative integer." })
    .default(0),
  price: z
    .number()
    .min(0, { message: "Price must be a non-negative number." })
    .default(0),
  importance: z.enum(["low", "medium", "high"]).optional(),
});

type AddProductFormValues = z.infer<typeof formSchema>;

export function AddProductForm({
  onSubmitSuccess,
}: {
  onSubmitSuccess?: () => void;
}) {
  const form = useForm<AddProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      image: "",
      category: "",
      quantity: 0,
      price: 0,
      importance: "low",
    },
  });

  const [selectedImage, setSelectedImage] = React.useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(
    null,
  );

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedImage(null);
      setImagePreviewUrl(null);
    }
  };

  const handleSubmit = async (values: AddProductFormValues) => {
    // Stubbed: remove tRPC + Supabase; treat as success
    toast({
      title: "Product Added!",
      description: "Stub: product creation disabled (tRPC removed)",
    });
    form.reset();
    setSelectedImage(null);
    setImagePreviewUrl(null);
    onSubmitSuccess?.();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Add Product</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details for the new product.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="grid gap-4 py-4"
        >
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Title
            </Label>
            <Input
              id="name"
              {...form.register("name")}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              {...form.register("description")}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image" className="text-right">
              Image
            </Label>
            <div className="col-span-3">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mb-2"
              />
              {imagePreviewUrl && (
                <img
                  src={imagePreviewUrl}
                  alt="Image Preview"
                  className="mt-2 h-24 w-24 object-cover"
                />
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Input
              id="category"
              {...form.register("category")}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              {...form.register("quantity", { valueAsNumber: true })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Price
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...form.register("price", { valueAsNumber: true })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="importance" className="text-right">
              Importance
            </Label>
            <Select
              onValueChange={(value) =>
                form.setValue(
                  "importance",
                  value as AddProductFormValues["importance"],
                )
              }
              defaultValue={form.getValues("importance")}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select importance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">Add Product</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
