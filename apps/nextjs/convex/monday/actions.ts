"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

type MondayConfig = {
  apiToken: string;
  boardId?: number;
  groupId?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 5,
  base = 100,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const isTransient = isTransientError(e);
      if (!isTransient || i === attempts - 1) throw e;
      const backoff = base * Math.pow(2, i);
      const jitter = Math.floor(Math.random() * base);
      await sleep(backoff + jitter);
    }
  }
  // Should never reach here
  // eslint-disable-next-line @typescript-eslint/no-throw-literal
  throw lastErr;
}

function isTransientError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { status?: number; message?: string };
  if (typeof err.status === "number") {
    if (err.status === 429) return true;
    if (err.status >= 500) return true;
  }
  const msg = err.message ?? "";
  return (
    msg.includes("Rate limited") ||
    msg.includes("timeout") ||
    msg.includes("network")
  );
}

async function callMonday(
  query: string,
  variables: Record<string, unknown>,
  apiToken: string,
) {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiToken,
    },
    body: JSON.stringify({ query, variables }),
  });
  const requestId = res.headers.get("x-request-id") ?? undefined;
  const raw = await res.text();
  let payload: unknown;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = raw;
  }
  if (res.status === 429) {
    const err: Error & {
      status?: number;
      requestId?: string;
      details?: unknown;
    } = new Error("Rate limited by Monday");
    err.status = 429;
    err.requestId = requestId;
    err.details = payload;
    throw err;
  }
  if (!res.ok) {
    const firstMsg: string | undefined =
      typeof payload === "object" &&
      payload &&
      Array.isArray(
        (payload as { errors?: Array<{ message?: string }> }).errors,
      )
        ? (payload as { errors?: Array<{ message?: string }> }).errors?.[0]
            ?.message
        : undefined;
    const err: Error & {
      status?: number;
      requestId?: string;
      details?: unknown;
    } = new Error(
      `Monday error ${res.status}${firstMsg ? ": " + firstMsg : ""}`,
    );
    err.status = res.status;
    err.requestId = requestId;
    err.details = payload;
    throw err;
  }
  // GraphQL can return 200 with `errors` array
  if (
    typeof payload === "object" &&
    payload &&
    Array.isArray(
      (payload as { errors?: Array<{ message?: string }> }).errors,
    ) &&
    (payload as { errors?: Array<unknown> }).errors!.length > 0
  ) {
    const firstMsg = (payload as { errors?: Array<{ message?: string }> })
      .errors?.[0]?.message;
    const err: Error & {
      status?: number;
      requestId?: string;
      details?: unknown;
    } = new Error(`Monday error 200: ${firstMsg ?? "GraphQL error"}`);
    err.status = 200;
    err.requestId = requestId;
    err.details = payload;
    throw err;
  }
  return payload;
}

export const createItem = action({
  args: {
    config: v.object({
      apiToken: v.string(),
      boardId: v.number(),
      groupId: v.optional(v.string()),
    }),
    name: v.string(),
    columnValues: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, { config, name, columnValues }) => {
    const query = `mutation ($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON) {
      create_item (board_id: $boardId, group_id: $groupId, item_name: $itemName, column_values: $columnValues, create_labels_if_missing: true) { id }
    }`;
    const result = (await withRetry(() =>
      callMonday(
        query,
        {
          boardId: String(config.boardId),
          groupId: config.groupId ?? null,
          itemName: name,
          columnValues: JSON.stringify(columnValues ?? {}),
        },
        config.apiToken,
      ),
    )) as { data?: { create_item?: { id?: string } } };
    const id = result?.data?.create_item?.id;
    console.log("createItem result", result);
    if (!id) throw new Error("No item id returned");
    return id;
  },
});

export const updateItem = action({
  args: {
    config: v.object({ apiToken: v.string(), boardId: v.number() }),
    itemId: v.string(),
    columnValues: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, { config, itemId, columnValues }) => {
    console.log("updateItem itemId", itemId);
    console.log("updateItem config", config);
    console.log("updateItem columnValues", columnValues);
    const query = `mutation ($itemId: ID!, $boardId: ID!, $columnValues: JSON!) {
      change_multiple_column_values (item_id: $itemId, board_id: $boardId, column_values: $columnValues, create_labels_if_missing: true) { id }
    }`;
    await withRetry(() =>
      callMonday(
        query,
        {
          itemId: String(itemId),
          boardId: String(config.boardId),
          columnValues: JSON.stringify(columnValues),
        },
        config.apiToken,
      ),
    );
    return null;
  },
});

export const createGroup = action({
  args: {
    config: v.object({ apiToken: v.string(), boardId: v.number() }),
    groupName: v.string(),
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, { config, groupName }) => {
    const query = `mutation ($boardId: ID!, $name: String!) {
      create_group (board_id: $boardId, group_name: $name) { id }
    }`;
    const result = (await withRetry(() =>
      callMonday(
        query,
        { boardId: String(config.boardId), name: groupName },
        config.apiToken,
      ),
    )) as { data?: { create_group?: { id?: string } } };
    const id = result?.data?.create_group?.id;
    if (!id) throw new Error("No group id returned");
    return { id };
  },
});

export const moveItemToGroup = action({
  args: {
    config: v.object({ apiToken: v.string() }),
    itemId: v.string(),
    groupId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { config, itemId, groupId }) => {
    const query = `mutation ($itemId: ID!, $groupId: String!) {
      move_item_to_group (item_id: $itemId, group_id: $groupId) { id }
    }`;
    await withRetry(() =>
      callMonday(query, { itemId: String(itemId), groupId }, config.apiToken),
    );
    return null;
  },
});

export const listBoardGroups = action({
  args: { config: v.object({ apiToken: v.string(), boardId: v.number() }) },
  returns: v.array(v.object({ id: v.string(), title: v.optional(v.string()) })),
  handler: async (ctx, { config }) => {
    const q = `query ($ids: [ID!]!) { boards(ids: $ids) { id groups { id title } } }`;
    const r = (await withRetry(() =>
      callMonday(q, { ids: [String(config.boardId)] }, config.apiToken),
    )) as {
      data?: {
        boards?: Array<{
          id?: string;
          groups?: Array<{ id?: string; title?: string }>;
        }>;
      };
    };
    const groups = r?.data?.boards?.[0]?.groups ?? [];
    return (groups ?? [])
      .filter((g) => !!g?.id)
      .map((g) => ({ id: String(g?.id ?? ""), title: g?.title }));
  },
});

export const listBoardItemsWithColumns = action({
  args: { config: v.object({ apiToken: v.string(), boardId: v.number() }) },
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.optional(v.string()),
      groupId: v.optional(v.string()),
      columns: v.array(
        v.object({
          id: v.string(),
          text: v.optional(v.string()),
          value: v.optional(v.string()),
        }),
      ),
    }),
  ),
  handler: async (ctx, { config }) => {
    const q = `query ($ids: [ID!]!) {
      boards(ids: $ids) {
        id
        items_page(limit: 500) {
          items { id name group { id } column_values { id text value } }
        }
      }
    }`;
    const r = (await withRetry(() =>
      callMonday(q, { ids: [String(config.boardId)] }, config.apiToken),
    )) as {
      data?: {
        boards?: Array<{
          id?: string;
          items_page?: {
            items?: Array<{
              id?: string;
              name?: string;
              group?: { id?: string };
              column_values?: Array<{
                id?: string;
                text?: string | null;
                value?: string | null;
              }>;
            }>;
          };
        }>;
      };
    };
    const items = r?.data?.boards?.[0]?.items_page?.items ?? [];
    return (items ?? [])
      .filter((it) => !!it?.id)
      .map((it) => ({
        id: String(it?.id ?? ""),
        name: it?.name,
        groupId: it?.group?.id ? String(it.group.id) : undefined,
        columns: (it?.column_values ?? [])
          .filter((c) => !!c?.id)
          .map((c) => {
            const obj: Record<string, unknown> = { id: String(c?.id ?? "") };
            if (typeof c?.text === "string") obj.text = c.text;
            if (typeof c?.value === "string") obj.value = c.value;
            return obj as { id: string; text?: string; value?: string };
          }),
      }));
  },
});

export const listSubitems = action({
  args: {
    config: v.object({ apiToken: v.string() }),
    parentItemId: v.string(),
  },
  returns: v.array(v.object({ id: v.string(), name: v.optional(v.string()) })),
  handler: async (ctx, { config, parentItemId }) => {
    const q = `query ($itemId: [ID!]!) { items (ids: $itemId) { id subitems { id name } } }`;
    const r = (await withRetry(() =>
      callMonday(q, { itemId: [String(parentItemId)] }, config.apiToken),
    )) as {
      data?: {
        items?: Array<{
          id?: string;
          subitems?: Array<{ id?: string; name?: string }>;
        }>;
      };
    };
    const subs = r?.data?.items?.[0]?.subitems ?? [];
    return (subs ?? [])
      .filter((s) => !!s?.id)
      .map((s) => ({ id: String(s?.id ?? ""), name: s?.name }));
  },
});

export const createSubitem = action({
  args: {
    config: v.object({ apiToken: v.string() }),
    parentItemId: v.string(),
    name: v.string(),
    columnValues: v.optional(v.any()),
  },
  returns: v.object({ id: v.string() }),
  handler: async (ctx, { config, parentItemId, name, columnValues }) => {
    console.log("createSubitem parentItemId", parentItemId);
    console.log("createSubitem name", name);
    console.log("createSubitem columnValues", columnValues);
    const query = `mutation ($parentItemId: ID!, $itemName: String!, $columnValues: JSON) {
      create_subitem (parent_item_id: $parentItemId, item_name: $itemName, column_values: $columnValues, create_labels_if_missing: true) { id }
    }`;
    const result = (await withRetry(() =>
      callMonday(
        query,
        {
          parentItemId: String(parentItemId),
          itemName: name,
          columnValues: JSON.stringify(columnValues ?? {}),
        },
        config.apiToken,
      ),
    )) as {
      data?: { create_subitem?: { id?: string } };
    };
    const id = result?.data?.create_subitem?.id;
    if (!id) throw new Error("No subitem id returned");
    console.log("createSubitem result", result);
    return { id };
  },
});

export const updateSubitem = action({
  args: {
    config: v.object({ apiToken: v.string() }),
    itemId: v.string(),
    columnValues: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, { config, itemId, columnValues }) => {
    // Resolve the subitem's board id without relying on caller-provided ids
    console.log("updateSubitem itemId", itemId);
    console.log("updateSubitem config", config);
    console.log("updateSubitem columnValues", columnValues);
    let boardId: string | undefined;
    const boardQuery = `query ($ids: [ID!]!) {
      items(ids: $ids) { id board { id } parent_item { board { id } } }
    }`;
    const boardRes = (await withRetry(() =>
      callMonday(boardQuery, { ids: [String(itemId)] }, config.apiToken),
    )) as {
      data?: {
        items?: Array<{
          id?: string;
          board?: { id?: string };
          parent_item?: { board?: { id?: string } };
        }>;
      };
    };
    boardId = boardRes?.data?.items?.[0]?.board?.id ?? undefined;
    const parentBoardId =
      boardRes?.data?.items?.[0]?.parent_item?.board?.id ?? undefined;

    // Fallback: resolve from parent board's subitems column settings
    if (!boardId && parentBoardId) {
      // First try direct id filter
      let settingsStr: string | undefined;
      {
        const q = `query ($ids: [ID!]!) { boards(ids: $ids) { columns(ids: "subitems") { id type settings_str } } }`;
        const r = (await withRetry(() =>
          callMonday(q, { ids: [String(parentBoardId)] }, config.apiToken),
        )) as {
          data?: {
            boards?: Array<{
              columns?: Array<{
                id?: string;
                type?: string;
                settings_str?: string;
              }>;
            }>;
          };
        };
        settingsStr = r?.data?.boards?.[0]?.columns?.[0]?.settings_str;
      }
      if (typeof settingsStr !== "string" || settingsStr.length === 0) {
        // Fallback: scan all columns and pick by type/id
        const qAll = `query ($ids: [ID!]!) { boards(ids: $ids) { columns { id type settings_str } } }`;
        const rAll = (await withRetry(() =>
          callMonday(qAll, { ids: [String(parentBoardId)] }, config.apiToken),
        )) as {
          data?: {
            boards?: Array<{
              columns?: Array<{
                id?: string;
                type?: string;
                settings_str?: string;
              }>;
            }>;
          };
        };
        const cols = rAll?.data?.boards?.[0]?.columns ?? [];
        const subCol = cols.find(
          (c) =>
            !!c &&
            (c.id === "subitems" ||
              c.type === "subtasks" ||
              c.type === "subitems" ||
              (typeof c.settings_str === "string" &&
                c.settings_str.includes("boardIds"))),
        );
        settingsStr = subCol?.settings_str;
      }
      if (typeof settingsStr === "string" && settingsStr.length > 0) {
        try {
          const parsed = JSON.parse(settingsStr) as {
            boardIds?: Array<number | string>;
          };
          const first = parsed.boardIds?.[0];
          if (first !== undefined && first !== null) boardId = String(first);
        } catch {}
      }
    }

    if (!boardId) throw new Error("Unable to resolve board id for subitem");

    // Update subitem columns
    const mutation = `mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values (board_id: $boardId, item_id: $itemId, column_values: $columnValues, create_labels_if_missing: true) { id }
    }`;
    await withRetry(() =>
      callMonday(
        mutation,
        {
          boardId,
          itemId: String(itemId),
          columnValues: JSON.stringify(columnValues),
        },
        config.apiToken,
      ),
    );
    return null;
  },
});

export const createNumbersColumn = action({
  args: {
    config: v.object({ apiToken: v.string(), boardId: v.number() }),
    title: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, { config, title }) => {
    const query = `mutation ($boardId: ID!, $title: String!) {
      create_column (board_id: $boardId, title: $title, column_type: numbers) { id }
    }`;
    console.log(
      "createNumbersColumn target board",
      config.boardId,
      "title",
      title,
    );
    const result = (await withRetry(() =>
      callMonday(
        query,
        { boardId: String(config.boardId), title },
        config.apiToken,
      ),
    )) as { data?: { create_column?: { id?: string } } };
    const id = result?.data?.create_column?.id;
    if (!id) throw new Error("No column id returned");
    return id;
  },
});

export const getSubitemsBoardId = action({
  args: {
    config: v.object({ apiToken: v.string() }),
    parentBoardId: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, { config, parentBoardId }) => {
    // Try direct subitems id first
    let settingsStr: string | undefined;
    {
      const q = `query ($ids: [ID!]!) { boards(ids: $ids) { columns(ids: "subitems") { id type settings_str } } }`;
      const r = (await withRetry(() =>
        callMonday(q, { ids: [String(parentBoardId)] }, config.apiToken),
      )) as {
        data?: {
          boards?: Array<{
            columns?: Array<{
              id?: string;
              type?: string;
              settings_str?: string;
            }>;
          }>;
        };
      };
      settingsStr = r?.data?.boards?.[0]?.columns?.[0]?.settings_str;
    }
    if (typeof settingsStr !== "string" || settingsStr.length === 0) {
      // Fallback: scan all columns and select by type/id
      const qAll = `query ($ids: [ID!]!) { boards(ids: $ids) { columns { id type settings_str } } }`;
      const rAll = (await withRetry(() =>
        callMonday(qAll, { ids: [String(parentBoardId)] }, config.apiToken),
      )) as {
        data?: {
          boards?: Array<{
            columns?: Array<{
              id?: string;
              type?: string;
              settings_str?: string;
            }>;
          }>;
        };
      };
      const cols = rAll?.data?.boards?.[0]?.columns ?? [];
      const subCol = cols.find(
        (c) =>
          !!c &&
          (c.id === "subitems" ||
            c.type === "subtasks" ||
            c.type === "subitems" ||
            (typeof c.settings_str === "string" &&
              c.settings_str.includes("boardIds"))),
      );
      settingsStr = subCol?.settings_str;
    }
    if (typeof settingsStr !== "string" || settingsStr.length === 0) {
      throw new Error("Unable to read subitems settings_str for parent board");
    }
    try {
      const parsed = JSON.parse(settingsStr) as {
        boardIds?: Array<number | string>;
      };
      const first = parsed.boardIds?.[0];
      if (first === undefined || first === null) {
        throw new Error("No subitems board id in settings_str");
      }
      return String(first);
    } catch {
      throw new Error("Failed to parse subitems settings_str");
    }
  },
});

export const getBoardIdForItem = action({
  args: { config: v.object({ apiToken: v.string() }), itemId: v.string() },
  returns: v.string(),
  handler: async (ctx, { config, itemId }) => {
    const q = `query ($ids: [ID!]!) { items(ids: $ids) { board { id } } }`;
    const res = (await withRetry(() =>
      callMonday(q, { ids: [String(itemId)] }, config.apiToken),
    )) as { data?: { items?: Array<{ board?: { id?: string } }> } };
    const id = res?.data?.items?.[0]?.board?.id;
    if (!id) throw new Error("Unable to resolve board id for item");
    return id;
  },
});

export const testConnection = action({
  args: {
    apiToken: v.string(),
    ordersBoardId: v.optional(v.number()),
    inventoryBoardId: v.optional(v.number()),
    eventsBoardId: v.optional(v.number()),
    columnMap: v.optional(v.record(v.string(), v.any())),
  },
  returns: v.object({ ok: v.boolean(), details: v.any() }),
  handler: async (
    ctx,
    { apiToken, ordersBoardId, inventoryBoardId, eventsBoardId, columnMap },
  ) => {
    const details: Record<string, unknown> = {};

    // Validate token
    try {
      const meQuery = `query { me { id name } }`;
      const me = await withRetry(() => callMonday(meQuery, {}, apiToken));
      details.me = me;
    } catch (e) {
      return { ok: false, details: { step: "token", error: String(e) } };
    }

    // Helper: check board exists and optional columns
    async function checkBoard(boardId?: number, columns?: string[]) {
      if (!boardId) return { ok: true };
      const q = `query ($ids: [ID!]!) { boards(ids: $ids) { id name columns { id title type } } }`;
      const r = (await withRetry(() =>
        callMonday(q, { ids: [String(boardId)] }, apiToken),
      )) as {
        data?: {
          boards?: Array<{
            id?: string;
            name?: string;
            columns?: Array<{ id?: string; title?: string; type?: string }>;
          }>;
        };
      };
      const b = r?.data?.boards?.[0];
      if (!b?.id) return { ok: false, error: `Board ${boardId} not found` };
      const colIds = new Set((b.columns ?? []).map((c) => c?.id));
      for (const cid of columns ?? []) {
        if (!cid) continue;
        if (!colIds.has(cid))
          return {
            ok: false,
            error: `Column ${cid} not found on board ${boardId}`,
          };
      }
      return { ok: true };
    }

    const checkoutCol = String(
      columnMap?.orderSubitemCheckoutQuantityColumnId ?? "",
    );
    const checkinCol = String(
      columnMap?.orderSubitemCheckinQuantityColumnId ?? "",
    );
    const stockCol = String(columnMap?.inventoryStockColumnId ?? "");
    const checkedOutCol = String(columnMap?.inventoryCheckedOutColumnId ?? "");
    const restockCol = String(columnMap?.inventoryRestockTriggerColumnId ?? "");

    const ordersCheck = await checkBoard(
      ordersBoardId,
      [checkoutCol, checkinCol].filter(Boolean),
    );
    if (!ordersCheck.ok)
      return { ok: false, details: { step: "ordersBoard", ...ordersCheck } };

    const inventoryCheck = await checkBoard(
      inventoryBoardId,
      [stockCol, checkedOutCol, restockCol].filter(Boolean),
    );
    if (!inventoryCheck.ok)
      return {
        ok: false,
        details: { step: "inventoryBoard", ...inventoryCheck },
      };

    const eventsCheck = await checkBoard(eventsBoardId, []);
    if (!eventsCheck.ok)
      return { ok: false, details: { step: "eventsBoard", ...eventsCheck } };

    return { ok: true, details };
  },
});

export const listBoardColumns = action({
  args: { apiToken: v.string(), boardId: v.number() },
  returns: v.array(
    v.object({
      id: v.string(),
      title: v.optional(v.string()),
      type: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { apiToken, boardId }) => {
    const q = `query ($ids: [ID!]!) {
      boards(ids: $ids) { id name columns { id title type } }
    }`;
    const r = (await withRetry(() =>
      callMonday(q, { ids: [String(boardId)] }, apiToken),
    )) as {
      data?: {
        boards?: Array<{
          id?: string;
          columns?: Array<{ id?: string; title?: string; type?: string }>;
        }>;
      };
    };
    const cols = r?.data?.boards?.[0]?.columns ?? [];
    return (cols ?? [])
      .filter((c) => !!c?.id)
      .map((c) => ({
        id: String(c?.id ?? ""),
        title: c?.title,
        type: c?.type,
      }));
  },
});

export const getItemWithColumns = action({
  args: { config: v.object({ apiToken: v.string() }), itemId: v.string() },
  returns: v.object({
    id: v.string(),
    name: v.optional(v.string()),
    groupId: v.optional(v.string()),
    columns: v.array(
      v.object({
        id: v.string(),
        text: v.optional(v.string()),
        value: v.optional(v.string()),
      }),
    ),
  }),
  handler: async (ctx, { config, itemId }) => {
    const q = `query ($ids: [ID!]!) {
      items(ids: $ids) { id name group { id } column_values { id text value } }
    }`;
    const r = (await withRetry(() =>
      callMonday(q, { ids: [String(itemId)] }, config.apiToken),
    )) as {
      data?: {
        items?: Array<{
          id?: string;
          name?: string;
          group?: { id?: string };
          column_values?: Array<{
            id?: string;
            text?: string | null;
            value?: string | null;
          }>;
        }>;
      };
    };
    const it = (r?.data?.items ?? [])[0];
    return {
      id: String(it?.id ?? ""),
      name: it?.name,
      groupId: it?.group?.id ? String(it.group.id) : undefined,
      columns: (it?.column_values ?? [])
        .filter((c) => !!c?.id)
        .map((c) => {
          const obj: Record<string, unknown> = { id: String(c?.id ?? "") };
          if (typeof c?.text === "string") obj.text = c.text;
          if (typeof c?.value === "string") obj.value = c.value;
          return obj as { id: string; text?: string; value?: string };
        }),
    };
  },
});
