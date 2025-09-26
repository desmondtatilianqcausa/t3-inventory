"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/convex/_generated/api";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useMutation, useQuery } from "convex/react";
import mondaySdk from "monday-sdk-js";

import { SidebarProvider } from "./_components/ui/sidebar";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Monday context
export type MondayContextValue = {
  isInMonday: boolean;
  context: unknown | null;
  sessionToken: string | null;
};

const MondayContext = createContext<MondayContextValue | undefined>(undefined);

export function useMonday() {
  const ctx = useContext(MondayContext);
  if (!ctx)
    return {
      isInMonday: false,
      context: null,
      sessionToken: null,
    } satisfies MondayContextValue;
  return ctx;
}

function MondayProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<MondayContextValue>({
    isInMonday: false,
    context: null,
    sessionToken: null,
  });
  // Centralized mutations
  const createEvent = useMutation(api.events.mutations.create);
  const removeEventByMondayId = useMutation(
    api.events.mutations.removeByMondayItemId,
  );
  const createOrder = useMutation(api.orders.mutations.create);
  const removeOrder = useMutation(api.orders.mutations.remove);
  const createProduct = useMutation(api.products.mutations.create);
  const removeProduct = useMutation(api.products.mutations.remove);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const inIframe =
          typeof window !== "undefined" && window.self !== window.top;
        if (!inIframe) {
          if (mounted)
            setValue({ isInMonday: false, context: null, sessionToken: null });
          return;
        }
        const monday = mondaySdk();
        const ctx = await monday.get("context");
        const data = (ctx as any)?.data ?? null;
        const hasKnownIds = !!(
          data &&
          (data.boardId || data.itemId || data.instanceId || data.viewId)
        );
        if (!hasKnownIds) {
          if (mounted)
            setValue({ isInMonday: false, context: data, sessionToken: null });
          return;
        }
        const tokenResp = await monday.get("sessionToken").catch(() => null);
        const token = (tokenResp as any)?.data ?? null;
        if (mounted) {
          setValue({ isInMonday: true, context: data, sessionToken: token });
        }

        // Subscribe to monday events and route by boardId
        monday.listen("events", async (res: any) => {
          if (!mounted) return;
          try {
            if (!res?.type) return;
            const ids: string[] = (res?.data?.itemIds ?? []).map((x: number) =>
              String(x),
            );
            if (!ids.length) return;
            const q = `query ($ids: [ID!]!) { items(ids: $ids) { id name board { id } } }`;
            const r = await monday.api(q, { variables: { ids } });
            const items = r?.data?.items ?? [];
            for (const it of items) {
              const boardId = Number(it?.board?.id);
              const name = (it?.name ?? "").trim();
              if (res.type === "new_items") {
                // Events: create
                if (
                  value.context &&
                  (value.context as any).eventsBoardId &&
                  Number((value.context as any).eventsBoardId) === boardId
                ) {
                  if (name)
                    await createEvent({
                      title: name,
                      createdById: "monday-user",
                      mondayItemId: String(it.id),
                    });
                }
                // Orders: create as Draft
                // if (
                //   value.context &&
                //   (value.context as any).ordersBoardId &&
                //   Number((value.context as any).ordersBoardId) === boardId
                // ) {
                //   await createOrder({
                //     createdById: "monday-user",
                //     status: "Draft",
                //     totalQuantity: 0,
                //     totalPrice: 0,
                //     formResponseId: undefined,
                //     eventId: undefined,
                //   });
                // }
                // Products: create with minimal fields
                if (
                  value.context &&
                  (value.context as any).inventoryBoardId &&
                  Number((value.context as any).inventoryBoardId) === boardId
                ) {
                  if (name)
                    await createProduct({
                      name,
                      description: undefined,
                      stock: 0,
                      price: 0,
                      status: "Draft" as any,
                      category: undefined,
                      productCategoryId: undefined,
                    });
                }
              } else if (res.type === "delete_items") {
                if (
                  value.context &&
                  (value.context as any).eventsBoardId &&
                  Number((value.context as any).eventsBoardId) === boardId
                ) {
                  await removeEventByMondayId({ mondayItemId: String(it.id) });
                }
                if (
                  value.context &&
                  (value.context as any).ordersBoardId &&
                  Number((value.context as any).ordersBoardId) === boardId
                ) {
                  // If we had a mondayItemId mapping for orders, we'd remove by mapping. Fallback: no-op.
                }
                if (
                  value.context &&
                  (value.context as any).inventoryBoardId &&
                  Number((value.context as any).inventoryBoardId) === boardId
                ) {
                  // Similarly, remove product by monday item id if stored.
                }
              }
            }
          } catch (e) {
            console.error("monday events error", e);
          }
        });
      } catch {
        if (mounted)
          setValue({ isInMonday: false, context: null, sessionToken: null });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [createEvent, createOrder, createProduct]);

  const memo = useMemo(() => value, [value]);
  return (
    <MondayContext.Provider value={memo}>{children}</MondayContext.Provider>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      <MondayProvider>
        <SidebarProvider>{children}</SidebarProvider>
      </MondayProvider>
    </ConvexAuthProvider>
  );
}

export default Providers;
