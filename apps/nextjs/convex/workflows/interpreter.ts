"use node";

import { api, internal } from "../_generated/api";

import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";
import { registry } from "../pieces/registry";
import { resolveTemplates } from "../pieces/resolver";
import { v } from "convex/values";

// Minimal graph types
type Node = { id: string; type: string; params?: Record<string, unknown> };
type Edge = { from: string; to: string };
interface Graph {
  nodes: Array<Node>;
  edges: Array<Edge>;
}

export const execute = action({
  args: { runId: v.id("workflow_runs") },
  returns: v.null(),
  handler: async (ctx, { runId }) => {
    const run = await ctx.runQuery(internal.workflows.queries.getRun, {
      id: runId,
    });
    if (!run) return null;
    const version = await ctx.runQuery(
      internal.workflows.queries.getVersionByWorkflowAndVersion,
      { workflowId: run.workflowId, version: run.version },
    );
    if (!version) {
      await ctx.runMutation(internal.workflows.runs.updateRun, {
        id: runId,
        status: "error",
        error: "Workflow version not found",
      });
      return null;
    }
    const graph = version.graphJson as Graph;
    const start = graph.nodes.find((n) => n.type === "trigger.orderCreated");
    if (!start) {
      await ctx.runMutation(internal.workflows.runs.updateRun, {
        id: runId,
        status: "error",
        error: "No trigger node",
      });
      return null;
    }

    // Load default Monday connection (apiToken, boardId, groupId)
    const integ = await ctx.runQuery(api.integrations.queries.getByKind, {
      kind: "monday",
    });
    if (!integ) {
      await ctx.runMutation(internal.workflows.runs.updateRun, {
        id: runId,
        status: "error",
        error: "No Monday integration configured",
      });
      return null;
    }
    const connections = await ctx.runQuery(
      api.integrations.queries.listConnections,
      { integrationId: integ._id },
    );
    if (!connections || connections.length === 0) {
      await ctx.runMutation(internal.workflows.runs.updateRun, {
        id: runId,
        status: "error",
        error: "No Monday connections found",
      });
      return null;
    }
    const defaultConn =
      connections.find(
        (c: { config?: unknown }) =>
          ((c.config ?? {}) as { isDefault?: boolean }).isDefault,
      ) ?? connections[0];
    const cfg = (defaultConn.config ?? {}) as {
      apiToken?: string;
      boardId?: number;
      groupId?: string;
      columnMap?: Record<string, unknown>;
    };
    if (!cfg.apiToken) {
      await ctx.runMutation(internal.workflows.runs.updateRun, {
        id: runId,
        status: "error",
        error: "Monday API token missing on default connection",
      });
      return null;
    }
    const mondayCfg = {
      apiToken: cfg.apiToken,
      boardId: cfg.boardId,
      groupId: cfg.groupId,
    };

    const contextObj = (run.context ?? {}) as { orderId: Id<"orders"> };
    const state: { orderId: Id<"orders">; mondayItemId?: string } = {
      orderId: contextObj.orderId,
    };

    // Simple linear traversal following edges
    const queue: Array<Node> = [start];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const node = queue.shift()!;
      if (visited.has(node.id)) continue;
      visited.add(node.id);

      const stepId = await ctx.runMutation(internal.workflows.runs.createStep, {
        runId,
        nodeId: node.id,
        type: node.type,
      });

      try {
        // Activepieces-style piece step: type = `piece.<pieceName>.<actionName>`
        if (node.type.startsWith("piece.")) {
          const [, pieceName, actionName] = node.type.split(".");
          const piece = registry[pieceName];
          const actionDef = piece?.actions?.[actionName ?? ""];
          if (!piece || !actionDef)
            throw new Error(`Unknown piece action: ${node.type}`);
          const scope = {
            connection: mondayCfg,
            ctx,
            ctxRun: { runId, stepId },
            state,
            ctxObj: contextObj,
          } as Record<string, unknown>;
          const props = (node.params ?? {}) as Record<string, unknown>;
          await actionDef.run({ ctx, resolve: resolveTemplates, scope, props });
          await ctx.runMutation(internal.workflows.runs.finishStep, {
            id: stepId,
            status: "success",
            logs: { message: `${node.type} completed` },
          });
        } else if (node.type === "action.monday.upsertItem") {
          const apiToken = mondayCfg.apiToken;
          const boardId = Number(mondayCfg.boardId ?? 0);
          const groupId = mondayCfg.groupId;
          const columnValues =
            (node.params?.columnValues as Record<string, unknown>) ?? {};

          if (state.mondayItemId) {
            await ctx.runAction(api.monday.actions.updateItem, {
              config: { apiToken, boardId },
              itemId: state.mondayItemId,
              columnValues,
            });
          } else {
            const id = await ctx.runAction(api.monday.actions.createItem, {
              config: { apiToken, boardId, groupId },
              name: `Order ${String(state.orderId)}`,
              columnValues,
            });
            state.mondayItemId = id;
            await ctx.runMutation(api.orders.mutations.setMondayItemId, {
              id: state.orderId,
              mondayItemId: id,
            });
          }

          await ctx.runMutation(internal.workflows.runs.finishStep, {
            id: stepId,
            status: "success",
            logs: { message: "upsertItem completed" },
          });
        } else if (
          node.type === "map.lineItems" ||
          node.type === "action.monday.upsertSubitem"
        ) {
          const items = await ctx.runQuery(api.orders.queries.listLineItems, {
            orderId: state.orderId,
          });
          const apiToken = mondayCfg.apiToken;
          const boardId = Number(mondayCfg.boardId ?? 0);
          if (!state.mondayItemId) {
            throw new Error("Parent Monday item missing for subitems");
          }

          // Ensure we have a quantity column id for subitems; create one if missing
          let quantityColId: string | undefined =
            typeof cfg.columnMap === "object" && cfg.columnMap
              ? (cfg.columnMap.subitemQuantityColumnId as string | undefined)
              : undefined;
          console.log("quantityColId", quantityColId);
          if (!quantityColId && boardId && apiToken) {
            try {
              // Resolve subitems board id from the parent board
              const subitemsBoardId = await ctx.runAction(
                api.monday.actions.getSubitemsBoardId,
                { config: { apiToken }, parentBoardId: boardId },
              );
              await ctx.runMutation(internal.workflows.runs.updateRun, {
                id: runId,
                status: "running",
              });

              // Create the quantity column on the subitems board (not the parent board)
              quantityColId = await ctx.runAction(
                api.monday.actions.createNumbersColumn,
                {
                  config: { apiToken, boardId: Number(subitemsBoardId) },
                  title: "Quantity",
                },
              );
              await ctx.runMutation(internal.workflows.runs.updateRun, {
                id: runId,
                status: "running",
              });
              // Persist mapping on the connection
              const newMap: Record<string, unknown> = {
                ...(typeof cfg.columnMap === "object" && cfg.columnMap
                  ? cfg.columnMap
                  : {}),
                subitemQuantityColumnId: quantityColId,
              };
              await ctx.runMutation(
                api.integrations.mutations.setConnectionColumnMap,
                {
                  id: defaultConn._id as Id<"integrationConnections">,
                  columnMap: newMap,
                },
              );
              cfg.columnMap = newMap;
            } catch (e) {
              // If provisioning fails, continue without quantity mapping
            }
          }

          for (const li of items) {
            const subCols = quantityColId
              ? { [quantityColId]: String(li.quantity) }
              : {}; // fallback if no mapping
            if (li.mondaySubitemId) {
              await ctx.runAction(api.monday.actions.updateSubitem, {
                config: { apiToken },
                itemId: li.mondaySubitemId,
                columnValues: subCols,
              });
            } else {
              const created = await ctx.runAction(
                api.monday.actions.createSubitem,
                {
                  config: { apiToken },
                  parentItemId: state.mondayItemId,
                  name:
                    typeof li.productName === "string"
                      ? li.productName
                      : `Product ${String(li.productId)}`,
                  columnValues: subCols,
                },
              );
              const subId = created.id;
              await ctx.runMutation(api.orders.mutations.setLineItemMondayId, {
                id: li._id,
                mondaySubitemId: subId,
              });
              // Use returned subitem boardId for any immediate follow-up updates
              await ctx.runAction(api.monday.actions.updateSubitem, {
                config: { apiToken },
                itemId: subId,
                columnValues: subCols,
              });
            }
          }
          await ctx.runMutation(internal.workflows.runs.finishStep, {
            id: stepId,
            status: "success",
            logs: { message: "subitems upserted" },
          });
        } else {
          await ctx.runMutation(internal.workflows.runs.finishStep, {
            id: stepId,
            status: "success",
            logs: { message: `no-op for ${node.type}` },
          });
        }
      } catch (e) {
        await ctx.runMutation(internal.workflows.runs.finishStep, {
          id: stepId,
          status: "error",
          logs: { error: e instanceof Error ? e.message : String(e) },
        });
        await ctx.runMutation(internal.workflows.runs.updateRun, {
          id: runId,
          status: "error",
          error: e instanceof Error ? e.message : String(e),
        });
        return null;
      }

      const nextIds = graph.edges
        .filter((e) => e.from === node.id)
        .map((e) => e.to);
      const next = graph.nodes.filter((n) => nextIds.includes(n.id));
      for (const n of next) queue.push(n);
    }

    await ctx.runMutation(internal.workflows.runs.updateRun, {
      id: runId,
      status: "success",
      outputs: state,
    });
    return null;
  },
});
