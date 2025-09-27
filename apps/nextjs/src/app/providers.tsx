"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/convex/_generated/api";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
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

function MondayProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<MondayContextValue>({
    isInMonday: false,
    context: null,
    sessionToken: null,
    userEmail: null,
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

        // Try to fetch current Monday user's email via SDK GraphQL
        let mondayEmail: string | null = null;
        try {
          const meResp = await monday.api("query { me { email name } }");
          mondayEmail = (meResp as any)?.data?.me?.email ?? null;
        } catch {
          mondayEmail = null;
        }

        if (mounted) {
          setValue({
            isInMonday: true,
            context: data,
            sessionToken: token,
            userEmail: mondayEmail,
          });
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
              }
            }
          } catch (e) {
            console.error("monday events error", e);
          }
        });
      } catch {
        if (mounted)
          setValue({
            isInMonday: false,
            context: null,
            sessionToken: null,
            userEmail: null,
          });
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

  // Use viewer when authenticated normally; otherwise, if in Monday, load by email
  const meByAuth = useQuery(api.users.queries.viewer, {});
  const meByEmail = useQuery(
    api.users.queries.getByEmail,
    userEmail ? { email: userEmail } : ("skip" as any),
  );

  // When embedded in Monday and we have an email, ensure a user row exists (and flag reset for first login)
  useEffect(() => {
    if (!isInMonday || !userEmail) return;
    if (meByEmail === undefined) return; // wait for load
    if (meByEmail === null) {
      void upsertProfile({ email: userEmail, mustResetPassword: true });
    }
  }, [isInMonday, userEmail, meByEmail, upsertProfile]);

  const me = meByAuth ?? meByEmail;

  // If user is flagged for reset, route them to /reset
  useEffect(() => {
    if (!me) return;
    const needsReset = Boolean((me as any)?.mustResetPassword);
    if (needsReset && typeof window !== "undefined") {
      const path = window.location.pathname;
      if (!path.startsWith("/reset")) {
        window.location.assign("/reset");
      }
    }
  }, [me]);

  // Login redirects: if user present and on / or /login, redirect to configured path for their role
  const redirects = useQuery(api.users.queries.listLoginRedirects, {});
  useEffect(() => {
    if (!me || !redirects) return;
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path !== "/" && !path.startsWith("/login")) return;

    const roles: string[] = Array.isArray((me as any)?.roles)
      ? ((me as any).roles as string[])
      : ["user"];

    // Choose the first matching role in priority order (admin, then user)
    const priority = [
      "admin",
      "user",
      ...roles.filter((r) => r !== "admin" && r !== "user"),
    ];
    let dest: string | null = null;
    for (const r of priority) {
      const found = (redirects as Array<{ role: string; path: string }>).find(
        (x) => x.role === r,
      );
      if (found?.path) {
        dest = found.path;
        break;
      }
    }
    if (dest && dest !== path) {
      window.location.assign(dest);
    }
  }, [me, redirects]);

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
    <ConvexAuthNextjsProvider client={convex}>
      <MondayProvider>
        <RoleProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </RoleProvider>
      </MondayProvider>
    </ConvexAuthNextjsProvider>
  );
}

export default Providers;
