"use client";

import type { Id } from "@/convex/_generated/dataModel";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/app/_components/ui/dialog";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/app/_components/ui/select";
import { DataTable } from "../../../_components/Table";
import { Button } from "../../../_components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../_components/ui/card";
import { Input } from "../../../_components/ui/input";
import { Spinner } from "../../../_components/ui/loading-spinner";
import { Separator } from "../../../_components/ui/separator";
import { useToast } from "../../../_components/ui/use-toast";
import OrderLineItemForm from "./OrderLineItemForm";

// helper formatters for events (group by month only)
const monthKeyOf = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabelOf = (d: Date) =>
  `${d.toLocaleString(undefined, { month: "long" })} Events`;
const dayLabelOf = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;

// parse "YYYY-MM-DD" as LOCAL date to avoid UTC shifting into previous month
const parseEventDate = (s?: string): Date | null => {
  if (!s) return null;
  if (s.includes("T")) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const parts = s.split("-");
  if (parts.length === 3) {
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
      const local = new Date(y, m - 1, d);
      return isNaN(local.getTime()) ? null : local;
    }
  }
  const n = Number(s);
  if (!Number.isNaN(n)) {
    const d = new Date(n);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

type OrderStatus =
  | "Draft"
  | "Awaiting Payment"
  | "Processing"
  | "Complete"
  | "Check-Out"
  | "Check-In";

type OrderFormValues = {
  status?: OrderStatus;
  eventId?: string;
  createdById?: string;
  items: Array<{ productId?: Id<"products">; quantity: number }>;
  mondayItemId?: string;
};

export default function OrderForm({ orderId }: { orderId?: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const order = useQuery(
    api.orders.queries.getById,
    orderId ? { id: orderId as Id<"orders"> } : "skip",
  );
  console.log("order", order);
  const events = useQuery(api.events.queries.getAll, { limit: 500 });
  const products = useQuery(api.products.queries.getAll, {});
  const lineItems = useQuery(
    api.orders.queries.listLineItems,
    order?._id ? { orderId: order._id as Id<"orders"> } : "skip",
  );
  console.log("[OrderForm] lineItems", lineItems);
  const createOrder = useMutation(api.orders.mutations.create);
  const updateOrder = useMutation(api.orders.mutations.update);
  const setLineItems = useMutation(api.orders.mutations.setLineItems);
  const generateOrderUploadUrl = useMutation(
    api.orders.mutations.generateUploadUrl,
  );
  const setOrderFeaturedImage = useMutation(
    api.orders.mutations.setFeaturedImage,
  );
  const setOrderMondayItemId = useMutation(
    api.orders.mutations.setMondayItemId,
  );
  const kickoffRun = useMutation(api.workflows.runs.kickoff);

  const form = useForm<OrderFormValues>({
    defaultValues: {
      status: "Draft",
      eventId: undefined,
      createdById: "seed-user",
      mondayItemId: "",
    },
  });
  const { control, watch } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const [open, setOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const openImage = (url?: string) => {
    if (!url) return;
    setImageUrl(url);
    setImageOpen(true);
  };
  const getFeaturedImage = (p: unknown): string | undefined => {
    const obj = p as { featuredImageUrl?: unknown; featuredImage?: unknown };
    const url = obj?.featuredImageUrl ?? obj?.featuredImage;
    return typeof url === "string" ? url : undefined;
  };

  const [createdOrderId, setCreatedOrderId] = useState<Id<"orders"> | null>(
    null,
  );

  // group and sort events by month with formatted labels (month only, ignore year)
  const eventsGrouped = useMemo(() => {
    const rows = Array.isArray(events) ? events : [];
    const parsed = rows
      .map((e) => {
        const startStr = (e as { startAt?: string }).startAt;
        const d = parseEventDate(startStr);
        return {
          raw: e as { _id: unknown; title?: string; startAt?: string },
          date: d,
        };
      })
      .filter((x) => x.date instanceof Date && !isNaN(x.date!.getTime()))
      .sort((a, b) => a.date!.getTime() - b.date!.getTime());
    const byMonth = new Map<string, { month: Date; items: typeof parsed }>();
    for (const p of parsed) {
      const key = monthKeyOf(p.date!); // month only
      if (!byMonth.has(key)) byMonth.set(key, { month: p.date!, items: [] });
      byMonth.get(key)!.items.push(p);
    }
    // sort groups by month index (Jan..Dec)
    return Array.from(byMonth.values()).sort(
      (a, b) => a.month.getMonth() - b.month.getMonth(),
    );
  }, [events]);

  const [eventOpen, setEventOpen] = useState(false);
  const eventTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [eventPopoverWidth, setEventPopoverWidth] = useState<number | null>(
    null,
  );

  const ensureOrderId = async (): Promise<Id<"orders">> => {
    const existing =
      (order?._id as unknown as Id<"orders"> | undefined) || createdOrderId;
    if (existing) return existing as Id<"orders">;
    const vals = form.getValues();
    if (!vals.eventId) {
      form.setError("eventId", { message: "Event is required" });
      toast({ title: "Select an event", description: "Event is required" });
      throw new Error("Event is required");
    }
    const newId = await createOrder({
      createdById: vals.createdById ?? "seed-user",
      status: (vals.status as OrderStatus | undefined) ?? undefined,
      eventId: vals.eventId
        ? (vals.eventId as unknown as Id<"events">)
        : undefined,
    });
    setCreatedOrderId(newId);
    return newId;
  };

  const mergeItems = (
    arr: Array<{ productId?: Id<"products">; quantity: number }>,
  ): Array<{ productId: Id<"products">; quantity: number }> => {
    const totals = new Map<string, number>();
    for (const it of arr) {
      if (!it.productId) continue;
      const key = String(it.productId as unknown as string);
      const qty = Number(it.quantity ?? 0);
      totals.set(key, (totals.get(key) ?? 0) + qty);
    }
    return Array.from(totals.entries()).map(([key, qty]) => ({
      productId: key as unknown as Id<"products">,
      quantity: qty,
    }));
  };

  const persistLineItems = async (
    all: Array<{ productId: Id<"products">; quantity: number }>,
  ) => {
    const id = await ensureOrderId();
    const prepared = all
      .filter((it) => it.productId && it.quantity > 0)
      .map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
      }));
    await setLineItems({ orderId: id, items: prepared });
  };

  const currentStatus = watch("status");
  const isEditable =
    currentStatus === "Draft" || currentStatus === "Awaiting Payment";

  useEffect(() => {
    if (order) {
      form.reset({
        status: (order.status as OrderStatus | undefined) ?? "Draft",
        eventId: (order.eventId as unknown as string | undefined) ?? undefined,
        createdById: order.createdById ?? "seed-user",
        items: [], // load existing items separately if needed
        mondayItemId: (order.mondayItemId as string | undefined) ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, order?._id]);

  // Hydrate items from backend line items for existing order
  useEffect(() => {
    if (!order || !lineItems) return;
    const mapped = lineItems.map((li) => ({
      productId: li.productId as Id<"products">,
      quantity: li.quantity,
    }));
    form.setValue("items", mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?._id, Array.isArray(lineItems) ? lineItems.length : 0]);

  const totals = useMemo(() => {
    const items = watch("items") ?? [];
    let totalQty = 0;
    let totalPrice = 0;
    for (const it of items) {
      const p = products?.find(
        (pp) =>
          (pp._id as unknown as string) ===
          ((it.productId as unknown as string) ?? ""),
      );
      const price = typeof p?.price === "number" ? p.price : 0;
      const qty = Number(it.quantity ?? 0);
      totalQty += qty;
      totalPrice += qty * price;
    }
    return { totalQty, totalPrice };
  }, [watch, products]);

  // Build table rows for line items display
  type LineRow = {
    idx: number;
    productId: string;
    name: string;
    featuredImage?: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    productCategoryId?: string;
  };
  const currentItems = watch("items") ?? [];
  // Build helpful lookup maps for product data and line item snapshots
  const productById = new Map<string, unknown>();
  if (Array.isArray(products)) {
    for (const p of products)
      productById.set(String(p._id as unknown as string), p);
  }
  const lineItemByProductId = new Map<
    string,
    { productName?: string; unitPrice?: number }
  >();
  if (Array.isArray(lineItems)) {
    for (const li of lineItems) {
      lineItemByProductId.set(String(li.productId as unknown as string), {
        productName:
          typeof li.productName === "string" ? li.productName : undefined,
        unitPrice: typeof li.unitPrice === "number" ? li.unitPrice : undefined,
      });
    }
  }
  const tableRows: Array<LineRow> = (
    currentItems as Array<{ productId?: Id<"products">; quantity: number }>
  ).map((it, idx) => {
    const pid = String(it.productId ?? "");
    const prod = productById.get(pid) as
      | {
          name?: unknown;
          price?: unknown;
          featuredImageUrl?: unknown;
          productCategoryId?: unknown;
        }
      | undefined;
    const liSnap = lineItemByProductId.get(pid);
    const unit =
      typeof prod?.price === "number"
        ? prod.price
        : typeof liSnap?.unitPrice === "number"
          ? liSnap.unitPrice
          : 0;
    const qty = Number(it.quantity ?? 0);
    return {
      idx,
      productId: String(it.productId ?? ""),
      name:
        typeof prod?.name === "string"
          ? prod.name
          : typeof liSnap?.productName === "string"
            ? liSnap.productName
            : "(Unknown)",
      featuredImage: getFeaturedImage(prod),
      unitPrice: unit,
      quantity: qty,
      subtotal: unit * qty,
      productCategoryId: String(prod?.productCategoryId ?? ""),
    };
  });
  const columns: ColumnDef<LineRow>[] = [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => {
        const original = row.original;
        console.log("[OrderForm] original", original);
        return (
          <div className="flex items-center gap-3">
            {row.original.featuredImage ? (
              <button
                type="button"
                className="shrink-0"
                onClick={() => openImage(row.original.featuredImage)}
                aria-label="View image"
              >
                <Image
                  src={row.original.featuredImage}
                  alt=""
                  className="h-10 w-10 rounded border object-cover"
                  width={40}
                  height={40}
                />
              </button>
            ) : (
              <div className="h-10 w-10 rounded border bg-muted" />
            )}
            <div className="capitalize">{row.original.name}</div>
          </div>
        );
      },
      meta: {
        headerClassName: "w-full",
      },
    },
    {
      accessorKey: "productCategoryId",
      header: "Category",
      cell: ({ row }) => <span>{row.original.productCategoryId}</span>,
      meta: {
        headerClassName: "min-w-44",
      },
    },
    {
      accessorKey: "unitPrice",
      header: "Unit",
      cell: ({ row }) => <span>${row.original.unitPrice.toFixed(2)}</span>,
      meta: {
        headerClassName: "min-w-20",
      },
    },
    {
      accessorKey: "quantity",
      header: "Qty",
      cell: ({ row }) => (
        <Input
          type="number"
          className="w-20"
          value={row.original.quantity}
          onChange={(e) =>
            form.setValue(
              `items.${row.original.idx}.quantity` as const,
              parseInt(e.target.value || "0"),
            )
          }
          min={0}
          disabled={!isEditable}
        />
      ),
      meta: {
        headerClassName: "min-w-28",
      },
    },
    {
      id: "subtotal",
      header: "Subtotal",
      cell: ({ row }) => <span>${row.original.subtotal.toFixed(2)}</span>,
      meta: {
        headerClassName: "min-w-20",
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="outline"
          onClick={() => remove(row.original.idx)}
          disabled={!isEditable}
        >
          Remove
        </Button>
      ),
      meta: {
        headerClassName: "min-w-32",
      },
    },
  ];

  const onSubmit = async (values: OrderFormValues) => {
    if (!values.eventId) {
      form.setError("eventId", { message: "Event is required" });
      toast({ title: "Select an event", description: "Event is required" });
      return;
    }
    const eventIdConvex = values.eventId
      ? (values.eventId as unknown as Id<"events">)
      : undefined;
    const existingId = order?._id as Id<"orders"> | undefined;
    let targetId: Id<"orders">;
    if (existingId) {
      await updateOrder({
        id: existingId,
        status: values.status ?? undefined,
        eventId: eventIdConvex,
        createdById: values.createdById ?? undefined,
        totalQuantity: totals.totalQty,
        totalPrice: totals.totalPrice,
      });
      targetId = existingId;
      toast({
        title: "Order updated",
        description: "Order updated successfully",
      });
    } else {
      const newId = await createOrder({
        createdById: values.createdById ?? "seed-user",
        status: values.status ?? undefined,
        eventId: eventIdConvex,
        totalQuantity: totals.totalQty,
        totalPrice: totals.totalPrice,
      });
      targetId = newId;
      toast({
        title: "Order created",
        description: "Order created successfully",
      });
    }

    // Persist line items
    const prepared = (values.items ?? [])
      .filter((it) => it.productId && it.quantity > 0)
      .map((it) => ({
        productId: it.productId!,
        quantity: Number(it.quantity),
      }));
    await setLineItems({ orderId: targetId, items: prepared });
  };

  const handleAddFromDialog = async (
    items: Array<{ productId: Id<"products">; quantity: number }>,
  ) => {
    try {
      const existing = (form.getValues("items") ?? []) as Array<{
        productId?: Id<"products">;
        quantity: number;
      }>;
      const merged = mergeItems([
        ...existing,
        ...items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
        })),
      ]);
      form.setValue("items", merged);
      await persistLineItems(merged);
      setOpen(false);
      toast({ title: "Order saved", description: "Line items updated" });
    } catch (e) {
      toast({
        title: "Failed to save order",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <div className="sticky top-0 z-10 bg-white shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                Order # <span className="text-lg">{order?._id}</span>
              </CardTitle>
              <div className="flex flex-row items-center gap-2">
                <Button
                  type="submit"
                  className="bg-green-700 text-xl hover:bg-green-600"
                >
                  Save
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      if (!order?._id) return;
                      const runId = await kickoffRun({
                        workflowName: "order_to_monday",
                        context: { orderId: order._id as Id<"orders"> },
                      });
                      toast({
                        title: "Workflow started",
                        description: `Run ${String(runId).slice(-8)} started`,
                      });
                      router.push(
                        `/admin/settings/workflows/runs/${String(runId)}`,
                      );
                    } catch (e) {
                      toast({
                        title: "Failed to start workflow",
                        description: e instanceof Error ? e.message : String(e),
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={!order?._id}
                  className="bg-purple-700 text-xl hover:bg-purple-600"
                >
                  Run Workflow
                </Button>
                <Button
                  onClick={() => {
                    console.log("check-out");
                  }}
                  className="bg-blue-700 text-xl hover:bg-blue-600"
                >
                  Check-Out
                </Button>
              </div>
            </CardHeader>
            <Separator />
          </div>
          <CardContent className="space-y-10 p-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField<OrderFormValues>
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={String(field.value ?? "")}
                      onValueChange={(v) => field.onChange(v as OrderStatus)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Awaiting Payment">
                          Awaiting Payment
                        </SelectItem>
                        <SelectItem value="Check-Out">Check-Out</SelectItem>
                        <SelectItem value="Check-In">Check-In</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField<OrderFormValues>
                control={form.control}
                name="createdById"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked User (createdById)</FormLabel>
                    <FormControl>
                      <Input
                        value={String(field.value ?? "")}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Monday Item Id */}
              <FormField
                control={form.control}
                name="mondayItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monday Item ID</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input {...field} placeholder="e.g. 1234567890" />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!order?._id || !field.value}
                        onClick={async () => {
                          try {
                            await setOrderMondayItemId({
                              id: order?._id as Id<"orders">,
                              mondayItemId: String(field.value),
                            });
                            toast({ title: "Saved Monday Item ID" });
                          } catch (e) {
                            toast({
                              title: "Failed to save Monday Item ID",
                              description:
                                e instanceof Error ? e.message : String(e),
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Set
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField<OrderFormValues>
                control={form.control}
                name="eventId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event (required)</FormLabel>
                    <Popover
                      open={eventOpen}
                      onOpenChange={(open) => {
                        setEventOpen(open);
                        if (open && eventTriggerRef.current) {
                          setEventPopoverWidth(
                            eventTriggerRef.current.offsetWidth,
                          );
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={eventOpen}
                          className="w-full justify-between"
                          ref={eventTriggerRef}
                        >
                          {field.value
                            ? (() => {
                                const all = eventsGrouped.flatMap(
                                  (g) => g.items,
                                );
                                const found = all.find(
                                  (p) =>
                                    String(p.raw._id) === String(field.value),
                                );
                                return found
                                  ? `${dayLabelOf(found.date!)} - ${found.raw.title}`
                                  : "Select event";
                              })()
                            : "Select event"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="p-0"
                        style={{ width: eventPopoverWidth ?? undefined }}
                      >
                        <Command>
                          <CommandInput placeholder="Search events..." />
                          <CommandEmpty>No events found.</CommandEmpty>
                          <CommandList className="w-full">
                            {eventsGrouped.map((group) => (
                              <CommandGroup
                                key={monthKeyOf(group.month)}
                                heading={monthLabelOf(group.month)}
                              >
                                {group.items.map((p) => {
                                  const value = String(p.raw._id);
                                  const label = `${dayLabelOf(p.date!)} - ${p.raw.title}`;
                                  return (
                                    <CommandItem
                                      key={value}
                                      value={label}
                                      onSelect={() => {
                                        field.onChange(value);
                                        setEventOpen(false);
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
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* <div className="space-y-2">
              <FormLabel>Order Featured Image</FormLabel>
              {typeof (order as { featuredImageUrl?: unknown } | null)
                ?.featuredImageUrl === "string" ? (
                <Image
                  src={
                    (order as { featuredImageUrl?: unknown })
                      .featuredImageUrl as string
                  }
                  alt="Featured"
                  className="h-32 w-32 rounded border object-cover"
                  width={128}
                  height={128}
                />
              ) : (
                <div className="h-32 w-32 rounded border bg-muted" />
              )}
              <div className="flex items-center gap-2">
                <input id="order-image-input" type="file" accept="image/*" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const input = document.getElementById(
                      "order-image-input",
                    ) as HTMLInputElement | null;
                    const file = input?.files?.[0] ?? null;
                    if (!file || !order?._id) return;
                    const postUrl = await generateOrderUploadUrl({});
                    const res = await fetch(postUrl, {
                      method: "POST",
                      headers: { "Content-Type": file.type },
                      body: file,
                    });
                    const { storageId } = (await res.json()) as {
                      storageId: Id<"_storage">;
                    };
                    await setOrderFeaturedImage({
                      orderId: order._id as Id<"orders">,
                      storageId,
                    });
                  }}
                  disabled={!order?._id}
                >
                  Upload Featured
                </Button>
              </div>
            </div> */}

            <div className="space-y-2">
              <DataTable
                title="Line Items"
                titleSize="xl"
                data={tableRows}
                columns={columns}
                postType="Item"
                onAddNew={isEditable ? () => setOpen(true) : undefined}
                showAddButton={isEditable}
                showTextFilter={false}
                showCustomizeColumns={false}
                showTableFooter={false}
              />
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Select Products</DialogTitle>
                </DialogHeader>
                <OrderLineItemForm onAdd={handleAddFromDialog} />
              </DialogContent>
            </Dialog>

            <Dialog open={imageOpen} onOpenChange={setImageOpen}>
              <DialogContent className="max-w-3xl">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt=""
                    className="h-auto w-full rounded"
                    width={128}
                    height={128}
                  />
                ) : null}
              </DialogContent>
            </Dialog>

            {/* <div className="flex items-center justify-between rounded border p-3 text-sm">
              <div>Items: {totals.totalQty}</div>
              <div>Total: ${totals.totalPrice.toFixed(2)}</div>
            </div> */}

            <Button
              type="submit"
              className="bg-green-700 text-xl hover:bg-green-600"
            >
              Save
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
