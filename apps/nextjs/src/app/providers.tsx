"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "@/convex/_generated/api";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import * as ConvexAuthReact from "@convex-dev/auth/react";
import {
  ConvexProviderWithAuth,
  ConvexReactClient,
  useAction,
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import mondaySdk from "monday-sdk-js";

import { SidebarProvider } from "./_components/ui/sidebar";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function useAuthFromMonday() {
  const { isInMonday, userEmail } = useMonday();
  // Always declare hooks in the same order; guard inside the handler instead of early-returning
  const tokenCacheRef = useRef<{
    token: string | null;
    expiresAt: number;
  } | null>(null);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!isInMonday || !userEmail) return null;
      const now = Date.now();
      const cached = tokenCacheRef.current;
      if (
        !forceRefreshToken &&
        cached &&
        cached.token &&
        now < cached.expiresAt
      ) {
        console.log("[MONDAY AUTH] using cached token");
        return cached.token;
      }
      try {
        const base = "https://beloved-pony-177.convex.site";
        console.log("[MONDAY AUTH] issuing token", { base });
        const res = await fetch(`${base}/api/auth/issue-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail }),
          credentials: "omit",
        });
        console.log("[MONDAY AUTH] issue-token response", res.status);
        if (!res.ok) return null;
        const json = await res.json();
        const token: string | null = json?.token ?? null;
        if (token) {
          // Cache for ~9 minutes to avoid tight loops (server TTL is 10m)
          tokenCacheRef.current = {
            token,
            expiresAt: Date.now() + 9 * 60 * 1000,
          };
        }
        return token;
      } catch (e) {
        console.error("[MONDAY AUTH] fetchAccessToken error", e);
        return null;
      }
    },
    [isInMonday, userEmail],
  );

  const isAuthed = !!userEmail && isInMonday;
  console.log("[MONDAY AUTH] isAuthed", isAuthed);
  return useMemo(
    () => ({ isLoading: false, isAuthenticated: isAuthed, fetchAccessToken }),
    [isAuthed, fetchAccessToken],
  );
}

// Password auth shim from @convex-dev/auth/react
function usePasswordAuth() {
  const hook = (ConvexAuthReact as any).useAuth as
    | (() => {
        isLoading: boolean;
        isAuthenticated: boolean;
        fetchAccessToken: (o: {
          forceRefreshToken: boolean;
        }) => Promise<string | null>;
      })
    | undefined;
  if (hook) return hook();
  return {
    isLoading: false,
    isAuthenticated: false,
    fetchAccessToken: async () => null,
  };
}

function useMergedAuth() {
  const mondayAuth = useAuthFromMonday();
  const passwordAuth = usePasswordAuth();
  const useWhich = mondayAuth.isAuthenticated ? mondayAuth : passwordAuth;
  return useMemo(
    () => ({
      isLoading: useWhich.isLoading,
      isAuthenticated: useWhich.isAuthenticated,
      fetchAccessToken: useWhich.fetchAccessToken,
    }),
    [useWhich.isLoading, useWhich.isAuthenticated, useWhich.fetchAccessToken],
  );
}

// Monday context
export type MondayContextValue = {
  isInMonday: boolean;
  context: unknown | null;
  sessionToken: string | null;
  userEmail?: string | null;
};

const MondayContext = createContext<MondayContextValue | undefined>(undefined);

export function useMonday() {
  const ctx = useContext(MondayContext);
  if (!ctx)
    return {
      isInMonday: false,
      context: null,
      sessionToken: null,
      userEmail: null,
    } satisfies MondayContextValue;
  return ctx;
}

function MondayContextProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<MondayContextValue>({
    isInMonday: false,
    context: null,
    sessionToken: null,
    userEmail: null,
  });

  useLayoutEffect(() => {
    try {
      const inIframe =
        typeof window !== "undefined" && window.self !== window.top;
      if (inIframe) document.cookie = "monday_iframe=1; path=/";
      console.log("[MONDAY] useLayoutEffect inIframe", inIframe);
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const inIframe =
          typeof window !== "undefined" && window.self !== window.top;
        console.log("[MONDAY] effect start", { inIframe });
        if (!inIframe) {
          if (mounted)
            setValue({
              isInMonday: false,
              context: null,
              sessionToken: null,
              userEmail: null,
            });
          return;
        }
        const monday = mondaySdk();
        const ctx = await monday.get("context");
        const data = (ctx as any)?.data ?? null;
        const hasKnownIds = !!(
          data &&
          (data.boardId || data.itemId || data.instanceId || data.viewId)
        );
        console.log("[MONDAY] context", { hasKnownIds, data });
        if (!hasKnownIds) {
          if (mounted)
            setValue({
              isInMonday: false,
              context: data,
              sessionToken: null,
              userEmail: null,
            });
          return;
        }
        const tokenResp = await monday.get("sessionToken").catch(() => null);
        const token = (tokenResp as any)?.data ?? null;

        let mondayEmail: string | null = null;
        try {
          const meResp = await monday.api("query { me { email name } }");
          mondayEmail = (meResp as any)?.data?.me?.email ?? null;
        } catch {
          mondayEmail = null;
        }
        console.log("[MONDAY] resolved", {
          mondayEmail: !!mondayEmail,
          token: !!token,
        });

        if (mounted) {
          setValue({
            isInMonday: true,
            context: data,
            sessionToken: token,
            userEmail: mondayEmail,
          });
          try {
            document.cookie = "monday_iframe=1; path=/";
          } catch {}
        }
      } catch (e) {
        console.error("[MONDAY] effect error", e);
        if (mounted)
          setValue({
            isInMonday: false,
            context: null,
            sessionToken: null,
            userEmail: null,
          });
        try {
          document.cookie = "monday_iframe=; Max-Age=0; path=/";
        } catch {}
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const memo = useMemo(() => value, [value]);
  return (
    <MondayContext.Provider value={memo}>{children}</MondayContext.Provider>
  );
}

function MondayConvexEffects() {
  const monday = mondaySdk();
  const { context } = useMonday();
  const createEvent = useMutation(api.events.mutations.create);
  const removeEventByMondayId = useMutation(
    api.events.mutations.removeByMondayItemId,
  );
  const createProduct = useMutation(api.products.mutations.create);
  const updateEventByMondayId = useMutation(
    api.events.mutations.updateByMondayItemId,
  );
  const updateProductByMondayId = useMutation(
    api.products.mutations.updateByMondayItemId,
  );
  const pullInventoryItem = useAction(
    api.monday.inventorySync.pullInventoryItem,
  );
  const defaultConn = useQuery(
    api.integrations.queries.getDefaultMondayConnection,
    {},
  );

  useEffect(() => {
    if (!context) return;
    const unsubscribe = monday.listen("events", async (res: any) => {
      console.log("[MONDAY] events", res);
      try {
        if (!res?.type) return;
        const ids: string[] = (res?.data?.itemIds ?? []).map((x: number) =>
          String(x),
        );
        if (!ids.length) return;
        const q = `query ($ids: [ID!]!) { items(ids: $ids) { id name board { id } } }`;
        const r = await monday.api(q, { variables: { ids } });
        const items = r?.data?.items ?? [];
        console.log("[MONDAY] events items", items);
        for (const it of items) {
          const boardId = Number(it?.board?.id);
          const name = (it?.name ?? "").trim();
          const cfg = (defaultConn?.config ?? {}) as {
            eventsBoardId?: number;
            inventoryBoardId?: number;
          };
          const eventsBoardId = cfg?.eventsBoardId;
          const inventoryBoardId = cfg?.inventoryBoardId;
          if (res.type === "new_items") {
            console.log("[MONDAY] events new items", { name });
            console.log("[MONDAY] events context", context);
            console.log("[MONDAY] events boardId", boardId);
            if (
              typeof eventsBoardId === "number" &&
              eventsBoardId === boardId
            ) {
              if (name)
                await createEvent({
                  title: name,
                  createdById: "monday-user",
                  mondayItemId: String(it.id),
                });
            }
            if (
              typeof inventoryBoardId === "number" &&
              inventoryBoardId === boardId
            ) {
              console.log("[MONDAY] events create product", { name });
              if (name) console.log("[MONDAY] creating product", { name });
              await createProduct({
                name,
                description: undefined,
                stock: 0,
                price: 0,
                status: "Draft" as any,
                category: undefined,
                productCategoryId: undefined,
                mondayItemId: Number(it.id),
              });
            }
          } else if (res.type === "change_column_values") {
            // Handle name/title changes pushed from Monday
            console.log("[MONDAY] events change column values", { name });
            if (name) {
              if (
                typeof eventsBoardId === "number" &&
                eventsBoardId === boardId
              ) {
                try {
                  await updateEventByMondayId({
                    mondayItemId: String(it.id),
                    title: name,
                  });
                } catch (e) {
                  console.error("update event by monday id error", e);
                }
              }
              if (
                typeof inventoryBoardId === "number" &&
                inventoryBoardId === boardId
              ) {
                try {
                  // Prefer server-side pull from Monday using mapped columns
                  await pullInventoryItem({ itemId: String(it.id) });
                } catch (e) {
                  // We'll rely on pull sync for name updates if we can't resolve here
                }
              }
            }
          } else if (res.type === "delete_items") {
            if (
              typeof eventsBoardId === "number" &&
              eventsBoardId === boardId
            ) {
              await removeEventByMondayId({ mondayItemId: String(it.id) });
            }
          }
        }
      } catch (e) {
        console.error("[MONDAY] events error", e);
      }
    });
    return () => {
      try {
        // monday.listen returns an unsubscribe in newer SDKs; guard in case not
        // @ts-ignore
        if (typeof unsubscribe === "function") unsubscribe();
      } catch {}
    };
  }, [
    context,
    createEvent,
    removeEventByMondayId,
    createProduct,
    monday,
    defaultConn,
    pullInventoryItem,
    updateEventByMondayId,
  ]);

  return null;
}

// Roles context
export type RoleContextValue = {
  roles: string[];
  isAdmin: boolean;
  loading: boolean;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function useRoles(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) return { roles: [], isAdmin: false, loading: true };
  return ctx;
}

function RoleProvider({ children }: { children: React.ReactNode }) {
  const { isInMonday, userEmail } = useMonday();
  const upsertProfile = useMutation(api.users.mutations.upsertProfile);

  const meByAuth = useQuery(api.users.queries.viewer, {});
  const meByEmail = useQuery(
    api.users.queries.getByEmail,
    userEmail ? { email: userEmail } : ("skip" as any),
  );

  useEffect(() => {
    console.log("[MONDAY ROLE] upsert check", {
      isInMonday,
      userEmail,
      meByEmailState:
        meByEmail === undefined ? "loading" : meByEmail ? "found" : "null",
    });
    if (!isInMonday || !userEmail) return;
    if (meByEmail === undefined) return;
    if (meByEmail === null) {
      void upsertProfile({ email: userEmail, mustResetPassword: true });
    }
  }, [isInMonday, userEmail, meByEmail, upsertProfile]);

  const me = meByAuth ?? meByEmail;

  const value = useMemo<RoleContextValue>(() => {
    const roles = Array.isArray((me as any)?.roles)
      ? ((me as any).roles as string[])
      : [];
    return {
      roles,
      isAdmin: roles.includes("admin"),
      loading: me === undefined,
    };
  }, [me]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MondayContextProvider>
      <ConvexAuthNextjsProvider client={convex}>
        <ConvexProviderWithAuth client={convex} useAuth={useMergedAuth}>
          <MondayConvexEffects />
          <RoleProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </RoleProvider>
        </ConvexProviderWithAuth>
      </ConvexAuthNextjsProvider>
    </MondayContextProvider>
  );
}

export default Providers;
