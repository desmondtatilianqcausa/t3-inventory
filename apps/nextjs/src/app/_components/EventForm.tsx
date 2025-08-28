"use client";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@acme/ui/form";
import { useMutation, useQuery } from "convex/react";

import { AddressSearch } from "./AddressSearch";
import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { api } from "../../../convex/_generated/api";
import { toast } from "@acme/ui/toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().max(500).optional(),
  address: z.string().optional(),
  lat: z
    .number({ invalid_type_error: "Latitude must be a number." })
    .min(-90)
    .max(90),
  lng: z
    .number({ invalid_type_error: "Longitude must be a number." })
    .min(-180)
    .max(180),
  color: z.string().optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  categoryIds: z.array(z.string()).optional(),
});

export function EventForm(props: { onCreated?: () => void }) {
  const createEvent = useMutation(api.events.create);
  const categoriesRaw = useQuery(api.categories.list, { postType: "event" });
  const categories = (categoriesRaw ?? []) as Doc<"categories">[];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      address: "",
      lat: 30.4383,
      lng: -84.2807,
      color: "#ef4444",
      startAt: undefined,
      endAt: undefined,
      categoryIds: [],
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const catIds = (values.categoryIds ?? []) as Id<"categories">[];
      await createEvent({
        title: values.title,
        description: values.description,
        lat: values.lat,
        lng: values.lng,
        color: values.color,
        startAt: values.startAt ? values.startAt.getTime() : undefined,
        endAt: values.endAt ? values.endAt.getTime() : undefined,
        categoryIds: catIds,
      });
      toast.success("Event created");
      props.onCreated?.();
      form.reset();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create event");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Event title" {...field} />
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
                <Input placeholder="Optional description" {...field} />
              </FormControl>
              <FormDescription>Describe the event (optional)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <AddressSearch
                  value={field.value}
                  onChange={field.onChange}
                  onSelect={({ lat, lng, displayName }) => {
                    form.setValue("lat", lat, { shouldValidate: true });
                    form.setValue("lng", lng, { shouldValidate: true });
                    form.setValue("address", displayName, {
                      shouldValidate: true,
                    });
                  }}
                />
              </FormControl>
              <FormDescription>
                Search to auto-fill latitude and longitude.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="lat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lng"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    {...field}
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value ? formatLocal(field.value) : ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : undefined,
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
                <FormLabel>End</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={field.value ? formatLocal(field.value) : ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : undefined,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <Input type="color" {...field} />
              </FormControl>
              <FormDescription>Marker color (optional)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Categories */}
        <FormField
          control={form.control}
          name="categoryIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categories</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((c) => {
                  const checked = (field.value ?? []).includes(c._id);
                  return (
                    <label
                      key={c._id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const curr = new Set(field.value ?? []);
                          if (e.target.checked) curr.add(c._id);
                          else curr.delete(c._id);
                          field.onChange(Array.from(curr));
                        }}
                      />
                      <span>{c.name}</span>
                    </label>
                  );
                })}
              </div>
              <FormDescription>Select one or more categories.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit">Create Event</Button>
        </div>
      </form>
    </Form>
  );
}

function formatLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
