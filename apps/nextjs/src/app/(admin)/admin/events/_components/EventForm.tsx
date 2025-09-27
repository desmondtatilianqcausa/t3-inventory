"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useForm } from "react-hook-form";

import { Button } from "~/app/_components/ui/button";
import { Checkbox } from "~/app/_components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/app/_components/ui/form";
import { Input } from "~/app/_components/ui/input";

type EventFormValues = {
  title: string;
  description?: string;
  startAt?: number;
  endAt?: number;
  isFree?: boolean;
  price?: number;
  location?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
};

export default function EventForm({ eventId }: { eventId?: string }) {
  const existing = useQuery(
    api.events.queries.getById,
    eventId ? { id: eventId as Id<"events"> } : "skip",
  );
  const create = useMutation(api.events.mutations.create);
  const update = useMutation(api.events.mutations.update);
  const generateUploadUrl = useMutation(api.events.mutations.generateUploadUrl);
  const setFeaturedImage = useMutation(api.events.mutations.setFeaturedImage);

  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<EventFormValues>({
    defaultValues: {
      title: "",
      description: "",
      startAt: undefined,
      endAt: undefined,
      isFree: false,
      price: undefined,
      location: {
        name: "",
        address: "",
        city: "",
        state: "",
        country: "",
        lat: undefined,
        lng: undefined,
      },
    },
  });

  useEffect(() => {
    if (existing) {
      setPreviewUrl(
        typeof (existing as { featuredImageUrl?: unknown })
          ?.featuredImageUrl === "string"
          ? ((existing as { featuredImageUrl?: unknown })
              .featuredImageUrl as string)
          : undefined,
      );
      form.reset({
        title: existing.title,
        description: existing.description ?? "",
        startAt: existing.startAt,
        endAt: existing.endAt,
        isFree: existing.isFree,
        price: existing.price,
        location: existing.location ?? {},
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, existing?._id]);

  const uploadFeaturedImage = async (targetEventId: Id<"events">) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    const postUrl = await generateUploadUrl({});
    const res = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
    await setFeaturedImage({ eventId: targetEventId, storageId });
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const onSubmit = async (values: EventFormValues) => {
    if (eventId) {
      await update({
        id: eventId as Id<"events">,
        createdById: existing?.createdById ?? "seed-user@gmail.com",
        ...values,
      });
      if (fileInputRef.current?.files?.[0]) {
        await uploadFeaturedImage(eventId as Id<"events">);
      }
    } else {
      const newId = await create({
        createdById: "seed-user@gmail.com",
        ...values,
      });
      if (fileInputRef.current?.files?.[0]) {
        await uploadFeaturedImage(newId);
      }
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
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
            <Button type="submit" variant="outline">
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const id = (existing?._id ?? null) as Id<"events"> | null;
                if (id) await uploadFeaturedImage(id);
              }}
              disabled={!existing?._id}
            >
              Upload Featured
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start (ms)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End (ms)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseInt(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="isFree"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormLabel>Is Free</FormLabel>
                <FormControl>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    className="m-0!"
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
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="location.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location.address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location.city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location.state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location.country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location.lat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lat</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location.lng"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lng</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}
