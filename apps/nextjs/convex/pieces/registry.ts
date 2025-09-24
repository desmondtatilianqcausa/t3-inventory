import type { PieceActionContext, PieceDef, PieceRegistry } from "./types";

import { api } from "../_generated/api";

const mondayPiece: PieceDef = {
  name: "monday",
  actions: {
    createItem: {
      name: "createItem",
      props: { name: "string", columnValues: "object" },
      run: async ({ ctx, resolve, scope, props }) => {
        const { name, columnValues } = props as {
          name: string;
          columnValues?: Record<string, unknown>;
        };
        const resolvedName = resolve(name, scope) as string;
        const resolvedCols = resolve(columnValues ?? {}, scope) as Record<
          string,
          unknown
        >;
        const { apiToken, boardId, groupId } = (scope.connection ?? {}) as {
          apiToken: string;
          boardId: number;
          groupId?: string;
        };

        return await ctx.runAction(api.monday.actions.createItem, {
          config: { apiToken, boardId, groupId },
          name: resolvedName,
          columnValues: resolvedCols,
        });
      },
    },
    updateItem: {
      name: "updateItem",
      props: { itemId: "string", columnValues: "object" },
      run: async ({ ctx, resolve, scope, props }) => {
        const { itemId, columnValues } = props as {
          itemId: string;
          columnValues: Record<string, unknown>;
        };
        const resolvedCols = resolve(columnValues, scope) as Record<
          string,
          unknown
        >;
        const { apiToken, boardId } = (scope.connection ?? {}) as {
          apiToken: string;
          boardId: number;
        };

        await ctx.runAction(api.monday.actions.updateItem, {
          config: { apiToken, boardId },
          itemId,
          columnValues: resolvedCols,
        });
        return null;
      },
    },
    createSubitem: {
      name: "createSubitem",
      props: { parentItemId: "string", name: "string", columnValues: "object" },
      run: async ({ ctx, resolve, scope, props }) => {
        const { parentItemId, name, columnValues } = props as {
          parentItemId: string;
          name: string;
          columnValues?: Record<string, unknown>;
        };
        const resolvedName = resolve(name, scope) as string;
        const resolvedCols = resolve(columnValues ?? {}, scope) as Record<
          string,
          unknown
        >;
        const { apiToken } = (scope.connection ?? {}) as { apiToken: string };

        const res = await ctx.runAction(api.monday.actions.createSubitem, {
          config: { apiToken },
          parentItemId,
          name: resolvedName,
          columnValues: resolvedCols,
        });
        return res?.id ?? null;
      },
    },
    updateSubitem: {
      name: "updateSubitem",
      props: { itemId: "string", columnValues: "object" },
      run: async ({ ctx, resolve, scope, props }) => {
        const { itemId, columnValues } = props as {
          itemId: string;
          columnValues: Record<string, unknown>;
        };
        const resolvedCols = resolve(columnValues, scope) as Record<
          string,
          unknown
        >;
        const { apiToken } = (scope.connection ?? {}) as { apiToken: string };

        await ctx.runAction(api.monday.actions.updateSubitem, {
          config: { apiToken },
          itemId,
          columnValues: resolvedCols,
        });
        return null;
      },
    },
  },
};

export const registry: PieceRegistry = {
  monday: mondayPiece,
};

export type { PieceDef, PieceActionContext };
