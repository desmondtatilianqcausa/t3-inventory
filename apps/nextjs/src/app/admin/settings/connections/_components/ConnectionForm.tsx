"use client";

import type { Id } from "@/convex/_generated/dataModel";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction, useMutation, useQuery } from "convex/react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { cn } from "src/lib/utils";
import { z } from "zod";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/app/_components/ui/accordion";
import { Button } from "~/app/_components/ui/button";
import { Checkbox } from "~/app/_components/ui/checkbox";
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
import { Input } from "~/app/_components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/app/_components/ui/popover";
import { useToast } from "~/app/_components/ui/use-toast";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  apiToken: z.string().min(1, "API token is required"),
  boardId: z.coerce.number().int().positive(),
  groupId: z.string().optional(),
  isDefault: z.boolean().optional(),
  ordersBoardId: z.coerce.number().int().positive().optional(),
  inventoryBoardId: z.coerce.number().int().positive().optional(),
  eventsBoardId: z.coerce.number().int().positive().optional(),
  // Column ids
  orderSubitemCheckoutQuantityColumnId: z.string().optional(),
  orderSubitemCheckinQuantityColumnId: z.string().optional(),
  orderSubitemSkuColumnId: z.string().optional(),
  inventoryStockColumnId: z.string().optional(),
  inventoryCheckedOutColumnId: z.string().optional(),
  inventoryRestockTriggerColumnId: z.string().optional(),
  inventoryStatusColumnId: z.string().optional(),
  ordersStatusColumnId: z.string().optional(),
  ordersEventColumnId: z.string().optional(),
  enableOrdersSync: z.boolean().optional(),
  enableInventorySync: z.boolean().optional(),
  enableEventsSync: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

type Column = { id: string; title?: string; type?: string };

export default function ConnectionForm({
  integrationId,
  connectionId,
  onSuccess,
}: {
  integrationId: Id<"integrations">;
  connectionId?: Id<"integrationConnections">;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const createConnection = useMutation(
    api.integrations.mutations.createConnection,
  );
  const updateConnection = useMutation(
    api.integrations.mutations.updateConnection,
  );
  const existing = useQuery(
    api.integrations.queries.getConnectionById,
    connectionId ? { id: connectionId } : "skip",
  );

  const testConnection = useAction(api.monday.actions.testConnection);
  const fetchColumns = useAction(api.monday.actions.listBoardColumns);
  const getSubitemsBoardId = useAction(api.monday.actions.getSubitemsBoardId);
  const createNumbersColumn = useAction(api.monday.actions.createNumbersColumn);
  const pullInventory = useAction(api.monday.inventorySync.pullInventoryBoard);

  const [testing, setTesting] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [step, setStep] = useState<number>(1);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      apiToken: "",
      boardId: 0,
      groupId: "",
      isDefault: true,
      ordersBoardId: undefined,
      inventoryBoardId: undefined,
      eventsBoardId: undefined,
      enableOrdersSync: true,
      enableInventorySync: true,
      enableEventsSync: false,
      orderSubitemCheckoutQuantityColumnId: "",
      orderSubitemCheckinQuantityColumnId: "",
      orderSubitemSkuColumnId: "",
      inventoryStockColumnId: "",
      inventoryCheckedOutColumnId: "",
      inventoryRestockTriggerColumnId: "",
      inventoryStatusColumnId: "",
      ordersStatusColumnId: "",
      ordersEventColumnId: "",
    },
  });

  // Persist to localStorage (per-connection draft)
  const STORAGE_KEY = useMemo(
    () => `monday-connection-draft-${connectionId ?? "new"}`,
    [connectionId],
  );
  const hasHydratedFromStorage = useRef(false);
  const hasPrefilledExisting = useRef(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (hasHydratedFromStorage.current) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Partial<FormValues> & {
          step?: number;
        };
        form.reset({
          ...form.getValues(),
          ...data,
        });
        if (typeof data.step === "number" && data.step >= 1 && data.step <= 4) {
          setStep(data.step);
        }
      }
    } catch {}
    hasHydratedFromStorage.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STORAGE_KEY]);

  // Prefill from existing (only once to avoid overwriting in-progress edits)
  useEffect(() => {
    if (!existing) return;
    if (hasPrefilledExisting.current) return;
    form.reset((prev) => {
      const cfg = (existing.config ?? {}) as {
        apiToken?: string;
        boardId?: number;
        groupId?: string;
        isDefault?: boolean;
        ordersBoardId?: number;
        inventoryBoardId?: number;
        eventsBoardId?: number;
        columnMap?: Record<string, unknown>;
        enableOrdersSync?: boolean;
        enableInventorySync?: boolean;
        enableEventsSync?: boolean;
      };
      return {
        ...prev,
        name: String(existing.name),
        apiToken: cfg.apiToken ?? prev.apiToken,
        boardId: typeof cfg.boardId === "number" ? cfg.boardId : prev.boardId,
        groupId: cfg.groupId ?? prev.groupId,
        isDefault: cfg.isDefault ?? prev.isDefault,
        ordersBoardId: cfg.ordersBoardId ?? prev.ordersBoardId,
        inventoryBoardId: cfg.inventoryBoardId ?? prev.inventoryBoardId,
        eventsBoardId: cfg.eventsBoardId ?? prev.eventsBoardId,
        enableOrdersSync:
          (cfg.enableOrdersSync as boolean | undefined) ??
          (cfg.columnMap?.enableOrdersSync as boolean | undefined) ??
          prev.enableOrdersSync ??
          true,
        enableInventorySync:
          (cfg.enableInventorySync as boolean | undefined) ??
          (cfg.columnMap?.enableInventorySync as boolean | undefined) ??
          prev.enableInventorySync ??
          true,
        enableEventsSync:
          (cfg.enableEventsSync as boolean | undefined) ??
          (cfg.columnMap?.enableEventsSync as boolean | undefined) ??
          prev.enableEventsSync ??
          false,
        orderSubitemCheckoutQuantityColumnId: String(
          (cfg.columnMap?.orderSubitemCheckoutQuantityColumnId as
            | string
            | undefined) ??
            prev.orderSubitemCheckoutQuantityColumnId ??
            "",
        ),
        orderSubitemCheckinQuantityColumnId: String(
          (cfg.columnMap?.orderSubitemCheckinQuantityColumnId as
            | string
            | undefined) ??
            prev.orderSubitemCheckinQuantityColumnId ??
            "",
        ),
        orderSubitemSkuColumnId: String(
          (cfg.columnMap?.orderSubitemSkuColumnId as string | undefined) ??
            prev.orderSubitemSkuColumnId ??
            "",
        ),
        inventoryStockColumnId: String(
          (cfg.columnMap?.inventoryStockColumnId as string | undefined) ??
            prev.inventoryStockColumnId ??
            "",
        ),
        inventoryCheckedOutColumnId: String(
          (cfg.columnMap?.inventoryCheckedOutColumnId as string | undefined) ??
            prev.inventoryCheckedOutColumnId ??
            "",
        ),
        inventoryRestockTriggerColumnId: String(
          (cfg.columnMap?.inventoryRestockTriggerColumnId as
            | string
            | undefined) ??
            prev.inventoryRestockTriggerColumnId ??
            "",
        ),
        inventoryStatusColumnId: String(
          (cfg.columnMap?.inventoryStatusColumnId as string | undefined) ??
            prev.inventoryStatusColumnId ??
            "",
        ),
        ordersStatusColumnId: String(
          (cfg.columnMap?.ordersStatusColumnId as string | undefined) ??
            prev.ordersStatusColumnId ??
            "",
        ),
        ordersEventColumnId: String(
          (cfg.columnMap?.ordersEventColumnId as string | undefined) ??
            prev.ordersEventColumnId ??
            "",
        ),
      };
    });
    hasPrefilledExisting.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  // Save to localStorage on changes (debounced)
  useEffect(() => {
    const sub = form.watch((values) => {
      const handle = setTimeout(() => {
        try {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...(values as FormValues), step }),
          );
        } catch {}
      }, 400);
      return () => clearTimeout(handle);
    });
    return () => sub.unsubscribe();
  }, [form, STORAGE_KEY, step]);

  const onSubmit = async (values: FormValues) => {
    try {
      const columnMap = {
        orderSubitemCheckoutQuantityColumnId:
          values.orderSubitemCheckoutQuantityColumnId || undefined,
        orderSubitemCheckinQuantityColumnId:
          values.orderSubitemCheckinQuantityColumnId || undefined,
        orderSubitemSkuColumnId: values.orderSubitemSkuColumnId || undefined,
        inventoryStockColumnId: values.inventoryStockColumnId || undefined,
        inventoryCheckedOutColumnId:
          values.inventoryCheckedOutColumnId || undefined,
        inventoryRestockTriggerColumnId:
          values.inventoryRestockTriggerColumnId || undefined,
        inventoryStatusColumnId: values.inventoryStatusColumnId || undefined,
        ordersStatusColumnId: values.ordersStatusColumnId || undefined,
        ordersEventColumnId: values.ordersEventColumnId || undefined,
        // Store sync toggles inside columnMap to avoid strict config validators
        enableOrdersSync: !!values.enableOrdersSync,
        enableInventorySync: !!values.enableInventorySync,
        enableEventsSync: !!values.enableEventsSync,
      } as Record<string, unknown>;

      const configPayload = {
        apiToken: values.apiToken,
        boardId: values.boardId,
        groupId: values.groupId,
        isDefault: !!values.isDefault,
        ordersBoardId: values.ordersBoardId,
        inventoryBoardId: values.inventoryBoardId,
        eventsBoardId: values.eventsBoardId,
        columnMap,
      } as Record<string, unknown>;

      if (connectionId) {
        await updateConnection({
          id: connectionId,
          name: values.name,
          config: configPayload,
        });
        toast({ title: "Connection updated" });
      } else {
        await createConnection({
          integrationId,
          name: values.name,
          config: configPayload,
        });
        toast({ title: "Connection saved" });
      }
      // Clear draft after successful save
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      onSuccess?.();
    } catch (e) {
      toast({
        title: "Error",
        description:
          e instanceof Error ? e.message : "Failed to save connection",
        variant: "destructive",
      });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const v = form.getValues();
      const columnMap = {
        orderSubitemCheckoutQuantityColumnId:
          v.orderSubitemCheckoutQuantityColumnId || undefined,
        orderSubitemCheckinQuantityColumnId:
          v.orderSubitemCheckinQuantityColumnId || undefined,
        inventoryStockColumnId: v.inventoryStockColumnId || undefined,
        inventoryCheckedOutColumnId: v.inventoryCheckedOutColumnId || undefined,
        inventoryRestockTriggerColumnId:
          v.inventoryRestockTriggerColumnId || undefined,
        inventoryStatusColumnId: v.inventoryStatusColumnId || undefined,
        ordersStatusColumnId: v.ordersStatusColumnId || undefined,
      } as Record<string, unknown>;
      const res = await testConnection({
        apiToken: v.apiToken,
        ordersBoardId: v.ordersBoardId,
        inventoryBoardId: v.inventoryBoardId,
        eventsBoardId: v.eventsBoardId,
        columnMap,
      });
      if (res?.ok) {
        toast({ title: "Connection OK" });
      } else {
        toast({
          title: "Connection failed",
          description: JSON.stringify(res?.details ?? res),
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Connection error",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handlePullInventory = async () => {
    setPulling(true);
    try {
      await pullInventory({});
      toast({
        title: "Pulled Inventory Board",
        description: "Groups and items imported",
      });
    } catch (e) {
      toast({
        title: "Pull failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setPulling(false);
    }
  };

  const ordersBoardValue = form.watch("ordersBoardId");
  const inventoryBoardValue = form.watch("inventoryBoardId");
  const apiTokenValue = form.watch("apiToken");

  const [ordersCols, setOrdersCols] = useState<Array<Column>>([]);
  const [ordersAllSubCols, setOrdersAllSubCols] = useState<Array<Column>>([]);
  const [inventoryCols, setInventoryCols] = useState<Array<Column>>([]);
  const [ordersOpen, setOrdersOpen] = useState(false);
  // Additional state for status column selection
  const [ordersParentCols, setOrdersParentCols] = useState<Array<Column>>([]);
  const [ordersStatusOpen, setOrdersStatusOpen] = useState(false);
  const [ordersEventOpen, setOrdersEventOpen] = useState(false);
  const [ordersSkuOpen, setOrdersSkuOpen] = useState(false);
  const [inventoryAllCols, setInventoryAllCols] = useState<Array<Column>>([]);
  const [inventoryStatusOpen, setInventoryStatusOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Fetch Orders subitems board columns
  useEffect(() => {
    const load = async () => {
      try {
        setOrdersLoading(true);
        if (!apiTokenValue || !ordersBoardValue) {
          setOrdersCols([]);
          setOrdersAllSubCols([]);
          setOrdersLoading(false);
          return;
        }
        const subBoardId = await getSubitemsBoardId({
          config: { apiToken: apiTokenValue },
          parentBoardId: Number(ordersBoardValue),
        });
        const cols = await fetchColumns({
          apiToken: apiTokenValue,
          boardId: Number(subBoardId),
        });
        setOrdersCols((cols ?? []).filter((c) => c.type === "numbers"));
        setOrdersAllSubCols(cols ?? []);
      } catch (e) {
        setOrdersCols([]);
        setOrdersAllSubCols([]);
      } finally {
        setOrdersLoading(false);
      }
    };
    void load();
  }, [apiTokenValue, ordersBoardValue, getSubitemsBoardId, fetchColumns]);

  // Fetch Orders parent board columns (for status mapping)
  useEffect(() => {
    const load = async () => {
      try {
        setOrdersLoading(true);
        if (!apiTokenValue || !ordersBoardValue) {
          setOrdersParentCols([]);
          setOrdersLoading(false);
          return;
        }
        const cols = await fetchColumns({
          apiToken: apiTokenValue,
          boardId: Number(ordersBoardValue),
        });
        setOrdersParentCols(cols ?? []);
      } catch (e) {
        setOrdersParentCols([]);
      } finally {
        setOrdersLoading(false);
      }
    };
    void load();
  }, [apiTokenValue, ordersBoardValue, fetchColumns]);

  // Fetch Inventory board columns
  useEffect(() => {
    const load = async () => {
      try {
        setInventoryLoading(true);
        if (!apiTokenValue || !inventoryBoardValue) {
          setInventoryCols([]);
          setInventoryAllCols([]);
          setInventoryLoading(false);
          return;
        }
        const cols = await fetchColumns({
          apiToken: apiTokenValue,
          boardId: Number(inventoryBoardValue),
        });
        setInventoryAllCols(cols ?? []);
        setInventoryCols((cols ?? []).filter((c) => c.type === "numbers"));
      } catch (e) {
        setInventoryAllCols([]);
        setInventoryCols([]);
      } finally {
        setInventoryLoading(false);
      }
    };
    void load();
  }, [apiTokenValue, inventoryBoardValue, fetchColumns]);

  // Clear mapped columns when Orders board changes to avoid stale ids
  useEffect(() => {
    form.setValue("orderSubitemCheckoutQuantityColumnId", "");
    form.setValue("orderSubitemCheckinQuantityColumnId", "");
    form.setValue("orderSubitemSkuColumnId", "");
    form.setValue("ordersStatusColumnId", "");
    form.setValue("ordersEventColumnId", "");
  }, [ordersBoardValue]);

  // Clear mapped columns when Inventory board changes to avoid stale ids
  useEffect(() => {
    form.setValue("inventoryStockColumnId", "");
    form.setValue("inventoryCheckedOutColumnId", "");
    form.setValue("inventoryRestockTriggerColumnId", "");
    form.setValue("inventoryStatusColumnId", "");
  }, [inventoryBoardValue]);

  // Auto-suggest defaults by title
  useEffect(() => {
    const v = form.getValues();
    if (ordersCols.length > 0) {
      const findBy = (kw: string) =>
        ordersCols.find((c) => (c.title ?? "").toLowerCase().includes(kw));
      if (!v.orderSubitemCheckoutQuantityColumnId) {
        const m = findBy("checkout") ?? findBy("quantity") ?? ordersCols[0];
        if (m) form.setValue("orderSubitemCheckoutQuantityColumnId", m.id);
      }
      if (!v.orderSubitemCheckinQuantityColumnId) {
        const m = findBy("check-in") ?? findBy("checkin") ?? ordersCols[1];
        if (m) form.setValue("orderSubitemCheckinQuantityColumnId", m.id);
      }
    }
    if (inventoryCols.length > 0) {
      const findBy = (kw: string) =>
        inventoryCols.find((c) => (c.title ?? "").toLowerCase().includes(kw));
      if (!v.inventoryStockColumnId) {
        const m = findBy("stock") ?? inventoryCols[0];
        if (m) form.setValue("inventoryStockColumnId", m.id);
      }
      if (!v.inventoryCheckedOutColumnId) {
        const m = findBy("checked out") ?? inventoryCols[1];
        if (m) form.setValue("inventoryCheckedOutColumnId", m.id);
      }
    }
    // No auto-suggest for status columns (usually 'status' type), user picks
  }, [ordersCols.length, inventoryCols.length]);

  const getLabelFor = (
    id: string | undefined,
    cols: Array<{ id: string; title?: string }>,
  ): string | undefined => {
    if (!id) return undefined;
    const c = cols.find((x) => String(x.id) === String(id));
    if (!c) return id;
    return c.title ? `${id} — ${c.title}` : id;
  };

  // Create missing columns helpers
  const handleCreateOrdersColumn = async (
    label: string,
    targetField:
      | "orderSubitemCheckoutQuantityColumnId"
      | "orderSubitemCheckinQuantityColumnId",
  ) => {
    try {
      const token = form.getValues("apiToken");
      const parentId = form.getValues("ordersBoardId");
      if (!token || !parentId) return;
      const subBoardId = await getSubitemsBoardId({
        config: { apiToken: token },
        parentBoardId: Number(parentId),
      });
      const colId = await createNumbersColumn({
        config: { apiToken: token, boardId: Number(subBoardId) },
        title: label,
      });
      form.setValue(targetField, String(colId));
      const cols = await fetchColumns({
        apiToken: token,
        boardId: Number(subBoardId),
      });
      setOrdersCols((cols ?? []).filter((c) => c.type === "numbers"));
      toast({ title: `Created column ${label}` });
    } catch (e) {
      toast({
        title: "Failed to create column",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const handleCreateInventoryColumn = async (
    label: string,
    targetField:
      | "inventoryStockColumnId"
      | "inventoryCheckedOutColumnId"
      | "inventoryRestockTriggerColumnId",
  ) => {
    try {
      const token = form.getValues("apiToken");
      const boardId = form.getValues("inventoryBoardId");
      if (!token || !boardId) return;
      const colId = await createNumbersColumn({
        config: { apiToken: token, boardId: Number(boardId) },
        title: label,
      });
      form.setValue(targetField, String(colId));
      const cols = await fetchColumns({
        apiToken: token,
        boardId: Number(boardId),
      });
      setInventoryCols((cols ?? []).filter((c) => c.type === "numbers"));
      toast({ title: `Created column ${label}` });
    } catch (e) {
      toast({
        title: "Failed to create column",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  // Step guards
  const canNextFrom1 = !!form.watch("name") && !!form.watch("apiToken");
  const canNextFrom2 = !!form.watch("ordersBoardId");

  const StepsHeader = (
    <div className="sticky top-0 z-10 rounded border bg-white p-3">
      <div className="flex items-center justify-between text-sm">
        <div
          className={cn(
            "font-medium",
            step === 1 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          1. Token
        </div>
        <div
          className={cn(
            "font-medium",
            step === 2 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          2. Boards
        </div>
        <div
          className={cn(
            "font-medium",
            step === 3 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          3. Columns
        </div>
        <div
          className={cn(
            "font-medium",
            step === 4 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          4. Review
        </div>
      </div>
    </div>
  );

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        {StepsHeader}

        {step === 1 && (
          <div className="rounded border p-4">
            <div className="mb-2 text-lg font-semibold">
              Step 1: Token & Name
            </div>
            <div className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Main Monday Connection"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apiToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Token</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="monday api token"
                          type={showToken ? "text" : "password"}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowToken((s) => !s)}
                      >
                        {showToken ? "Hide" : "Reveal"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleTest}
                        disabled={testing}
                      >
                        {testing ? "Testing..." : "Test Connection"}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(v) => field.onChange(!!v)}
                      />
                    </FormControl>
                    <FormLabel className="!m-0">Make default</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="enableOrdersSync"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={(v) => field.onChange(!!v)}
                        />
                      </FormControl>
                      <FormLabel className="!m-0">Enable Orders Sync</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enableInventorySync"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={(v) => field.onChange(!!v)}
                        />
                      </FormControl>
                      <FormLabel className="!m-0">
                        Enable Inventory Sync
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enableEventsSync"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={(v) => field.onChange(!!v)}
                        />
                      </FormControl>
                      <FormLabel className="!m-0">Enable Events Sync</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded border p-4">
            <div className="mb-2 text-lg font-semibold">Step 2: Boards</div>
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="ordersBoardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orders Board ID (required)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
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
                name="inventoryBoardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inventory Board ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
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
                name="eventsBoardId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Events Board ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded border p-4">
            <div className="mb-2 text-lg font-semibold">Step 3: Columns</div>
            <Accordion type="single" collapsible className="rounded border">
              <AccordionItem value="orders" className="px-4">
                <AccordionTrigger>
                  <div className="flex w-full items-end gap-4">
                    <div className="flex-1 text-left text-base font-medium">
                      Orders Subitems Columns
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mb-2 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!ordersBoardValue}
                      onClick={() =>
                        handleCreateOrdersColumn(
                          "Checkout Quantity",
                          "orderSubitemCheckoutQuantityColumnId",
                        )
                      }
                    >
                      Create Checkout Column
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!ordersBoardValue}
                      onClick={() =>
                        handleCreateOrdersColumn(
                          "Check-in Quantity",
                          "orderSubitemCheckinQuantityColumnId",
                        )
                      }
                    >
                      Create Check-in Column
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="orderSubitemCheckoutQuantityColumnId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Subitem Checkout Quantity Column
                          </FormLabel>
                          {ordersLoading && (
                            <div className="text-xs text-muted-foreground">
                              Loading columns…
                            </div>
                          )}
                          <Popover
                            open={ordersOpen}
                            onOpenChange={setOrdersOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                                disabled={!ordersBoardValue || ordersLoading}
                              >
                                {getLabelFor(field.value, ordersCols) ||
                                  "Select column"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[400px] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder="Search columns..." />
                                <CommandEmpty>No columns found.</CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {(ordersCols ?? []).map((c) => (
                                      <CommandItem
                                        key={c.id}
                                        value={`${c.id} ${c.title ?? ""}`}
                                        onSelect={() => {
                                          field.onChange(c.id);
                                          setOrdersOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            String(field.value ?? "") === c.id
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {c.id}
                                        {c.title ? ` — ${c.title}` : ""}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="orderSubitemCheckinQuantityColumnId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Subitem Check-in Quantity Column
                          </FormLabel>
                          {ordersLoading && (
                            <div className="text-xs text-muted-foreground">
                              Loading columns…
                            </div>
                          )}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                                disabled={!ordersBoardValue || ordersLoading}
                              >
                                {getLabelFor(field.value, ordersCols) ||
                                  "Select column"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[400px] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder="Search columns..." />
                                <CommandEmpty>No columns found.</CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {(ordersCols ?? []).map((c) => (
                                      <CommandItem
                                        key={c.id}
                                        value={`${c.id} ${c.title ?? ""}`}
                                        onSelect={() => field.onChange(c.id)}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            String(field.value ?? "") === c.id
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {c.id}
                                        {c.title ? ` — ${c.title}` : ""}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="orderSubitemSkuColumnId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subitem SKU Column</FormLabel>
                          {ordersLoading && (
                            <div className="text-xs text-muted-foreground">
                              Loading columns…
                            </div>
                          )}
                          <Popover
                            open={ordersSkuOpen}
                            onOpenChange={setOrdersSkuOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                                disabled={!ordersBoardValue || ordersLoading}
                              >
                                {getLabelFor(field.value, ordersAllSubCols) ||
                                  "Select column"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[400px] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder="Search columns..." />
                                <CommandEmpty>No columns found.</CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {(ordersAllSubCols ?? []).map((c) => (
                                      <CommandItem
                                        key={c.id}
                                        value={`${c.id} ${c.title ?? ""}`}
                                        onSelect={() => {
                                          field.onChange(c.id);
                                          setOrdersSkuOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            String(field.value ?? "") === c.id
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {c.id}
                                        {c.title ? ` — ${c.title}` : ""}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ordersEventColumnId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Orders Event Column (parent)</FormLabel>
                          {ordersLoading && (
                            <div className="text-xs text-muted-foreground">
                              Loading columns…
                            </div>
                          )}
                          <Popover
                            open={ordersEventOpen}
                            onOpenChange={setOrdersEventOpen}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                                disabled={!ordersBoardValue || ordersLoading}
                              >
                                {getLabelFor(field.value, ordersParentCols) ||
                                  "Select column"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[400px] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder="Search columns..." />
                                <CommandEmpty>No columns found.</CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {(ordersParentCols ?? []).map((c) => (
                                      <CommandItem
                                        key={c.id}
                                        value={`${c.id} ${c.title ?? ""}`}
                                        onSelect={() => {
                                          field.onChange(c.id);
                                          setOrdersEventOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            String(field.value ?? "") === c.id
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {c.id}
                                        {c.title ? ` — ${c.title}` : ""}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ordersStatusColumnId"
                      render={({ field }) => {
                        const statusCols = (ordersParentCols ?? []).filter(
                          (c) => (c.type ?? "").toLowerCase() === "status",
                        );
                        const options = statusCols.length
                          ? statusCols
                          : ordersParentCols;
                        return (
                          <FormItem>
                            <FormLabel>Orders Status Column (parent)</FormLabel>
                            {ordersLoading && (
                              <div className="text-xs text-muted-foreground">
                                Loading columns…
                              </div>
                            )}
                            <Popover
                              open={ordersStatusOpen}
                              onOpenChange={setOrdersStatusOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between"
                                  disabled={!ordersBoardValue || ordersLoading}
                                >
                                  {getLabelFor(field.value, options) ||
                                    "Select status column"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-[400px] p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput placeholder="Search columns..." />
                                  <CommandEmpty>No columns found.</CommandEmpty>
                                  <CommandList>
                                    <CommandGroup>
                                      {(options ?? []).map((c) => (
                                        <CommandItem
                                          key={c.id}
                                          value={`${c.id} ${c.title ?? ""}`}
                                          onSelect={() => {
                                            field.onChange(c.id);
                                            setOrdersStatusOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              String(field.value ?? "") === c.id
                                                ? "opacity-100"
                                                : "opacity-0",
                                            )}
                                          />
                                          {c.id}
                                          {c.title ? ` — ${c.title}` : ""}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="inventory" className="px-4">
                <AccordionTrigger>
                  <div className="flex w-full items-end gap-4">
                    <div className="flex-1 text-left text-base font-medium">
                      Inventory Columns
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mb-2 flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!inventoryBoardValue}
                      onClick={() =>
                        handleCreateInventoryColumn(
                          "Stock",
                          "inventoryStockColumnId",
                        )
                      }
                    >
                      Create Stock Column
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!inventoryBoardValue}
                      onClick={() =>
                        handleCreateInventoryColumn(
                          "Checked Out",
                          "inventoryCheckedOutColumnId",
                        )
                      }
                    >
                      Create Checked Out Column
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!inventoryBoardValue}
                      onClick={() =>
                        handleCreateInventoryColumn(
                          "Restock Trigger",
                          "inventoryRestockTriggerColumnId",
                        )
                      }
                    >
                      Create Restock Trigger Column
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="inventoryStockColumnId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Column</FormLabel>
                          {inventoryLoading && (
                            <div className="text-xs text-muted-foreground">
                              Loading columns…
                            </div>
                          )}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                                disabled={
                                  !inventoryBoardValue || inventoryLoading
                                }
                              >
                                {getLabelFor(field.value, inventoryCols) ||
                                  "Select column"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[400px] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder="Search columns..." />
                                <CommandEmpty>No columns found.</CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {(inventoryCols ?? []).map((c) => (
                                      <CommandItem
                                        key={c.id}
                                        value={`${c.id} ${c.title ?? ""}`}
                                        onSelect={() => field.onChange(c.id)}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            String(field.value ?? "") === c.id
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {c.id}
                                        {c.title ? ` — ${c.title}` : ""}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="inventoryCheckedOutColumnId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Checked Out Column</FormLabel>
                          {inventoryLoading && (
                            <div className="text-xs text-muted-foreground">
                              Loading columns…
                            </div>
                          )}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                                disabled={
                                  !inventoryBoardValue || inventoryLoading
                                }
                              >
                                {getLabelFor(field.value, inventoryCols) ||
                                  "Select column"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[400px] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder="Search columns..." />
                                <CommandEmpty>No columns found.</CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {(inventoryCols ?? []).map((c) => (
                                      <CommandItem
                                        key={c.id}
                                        value={`${c.id} ${c.title ?? ""}`}
                                        onSelect={() => field.onChange(c.id)}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            String(field.value ?? "") === c.id
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {c.id}
                                        {c.title ? ` — ${c.title}` : ""}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="inventoryRestockTriggerColumnId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Restock Trigger Column</FormLabel>
                          {inventoryLoading && (
                            <div className="text-xs text-muted-foreground">
                              Loading columns…
                            </div>
                          )}
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                                disabled={
                                  !inventoryBoardValue || inventoryLoading
                                }
                              >
                                {getLabelFor(field.value, inventoryCols) ||
                                  "Select column"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[400px] p-0"
                              align="start"
                            >
                              <Command>
                                <CommandInput placeholder="Search columns..." />
                                <CommandEmpty>No columns found.</CommandEmpty>
                                <CommandList>
                                  <CommandGroup>
                                    {(inventoryCols ?? []).map((c) => (
                                      <CommandItem
                                        key={c.id}
                                        value={`${c.id} ${c.title ?? ""}`}
                                        onSelect={() => field.onChange(c.id)}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            String(field.value ?? "") === c.id
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {c.id}
                                        {c.title ? ` — ${c.title}` : ""}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="inventoryStatusColumnId"
                      render={({ field }) => {
                        const statusCols = (inventoryAllCols ?? []).filter(
                          (c) => (c.type ?? "").toLowerCase() === "status",
                        );
                        const options = statusCols.length
                          ? statusCols
                          : inventoryAllCols;
                        return (
                          <FormItem>
                            <FormLabel>Inventory Status Column</FormLabel>
                            {inventoryLoading && (
                              <div className="text-xs text-muted-foreground">
                                Loading columns…
                              </div>
                            )}
                            <Popover
                              open={inventoryStatusOpen}
                              onOpenChange={setInventoryStatusOpen}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  role="combobox"
                                  className="w-full justify-between"
                                  disabled={
                                    !inventoryBoardValue || inventoryLoading
                                  }
                                >
                                  {getLabelFor(field.value, options) ||
                                    "Select status column"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-[400px] p-0"
                                align="start"
                              >
                                <Command>
                                  <CommandInput placeholder="Search columns..." />
                                  <CommandEmpty>No columns found.</CommandEmpty>
                                  <CommandList>
                                    <CommandGroup>
                                      {(options ?? []).map((c) => (
                                        <CommandItem
                                          key={c.id}
                                          value={`${c.id} ${c.title ?? ""}`}
                                          onSelect={() => {
                                            field.onChange(c.id);
                                            setInventoryStatusOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              String(field.value ?? "") === c.id
                                                ? "opacity-100"
                                                : "opacity-0",
                                            )}
                                          />
                                          {c.id}
                                          {c.title ? ` — ${c.title}` : ""}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {step === 4 && (
          <div className="rounded border p-4">
            <div className="mb-2 text-lg font-semibold">
              Step 4: Review & Save
            </div>
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Name:</span>{" "}
                {form.getValues("name")}
              </div>
              <div>
                <span className="font-medium">Orders Board:</span>{" "}
                {String(form.getValues("ordersBoardId") ?? "—")}
              </div>
              <div>
                <span className="font-medium">Inventory Board:</span>{" "}
                {String(form.getValues("inventoryBoardId") ?? "—")}
              </div>
              <div>
                <span className="font-medium">Events Board:</span>{" "}
                {String(form.getValues("eventsBoardId") ?? "—")}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleTest}
                disabled={testing}
              >
                {testing ? "Testing..." : "Run Final Test"}
              </Button>
              <Button type="submit" className="bg-green-700 hover:bg-green-600">
                {connectionId ? "Update" : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePullInventory}
                disabled={pulling || !form.getValues("inventoryBoardId")}
              >
                {pulling ? "Pulling..." : "Pull Inventory Board"}
              </Button>
              {/* Placeholders for future pulls */}
              <Button type="button" variant="outline" disabled>
                Pull Orders Board (coming soon)
              </Button>
              <Button type="button" variant="outline" disabled>
                Pull Events Board (coming soon)
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as typeof s) : s))}
            disabled={step === 1}
          >
            Back
          </Button>
          {step < 4 ? (
            <Button
              type="button"
              onClick={() =>
                setStep((s) => {
                  if (s === 1 && !canNextFrom1) return s;
                  if (s === 2 && !canNextFrom2) return s;
                  return s + 1;
                })
              }
              disabled={
                (step === 1 && !canNextFrom1) || (step === 2 && !canNextFrom2)
              }
            >
              Next
            </Button>
          ) : (
            <div />
          )}
        </div>
      </form>
    </Form>
  );
}
