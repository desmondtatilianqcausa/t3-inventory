/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as e2e from "../e2e.js";
import type * as events_helpers from "../events/helpers.js";
import type * as events_mutations from "../events/mutations.js";
import type * as events_queries from "../events/queries.js";
import type * as formResponses_mutations from "../formResponses/mutations.js";
import type * as formResponses_queries from "../formResponses/queries.js";
import type * as http from "../http.js";
import type * as init from "../init.js";
import type * as integrations_mutations from "../integrations/mutations.js";
import type * as integrations_queries from "../integrations/queries.js";
import type * as logs_mutations from "../logs/mutations.js";
import type * as logs_queries from "../logs/queries.js";
import type * as migration from "../migration.js";
import type * as monday_actions from "../monday/actions.js";
import type * as monday_internal from "../monday/internal.js";
import type * as monday_inventorySync from "../monday/inventorySync.js";
import type * as monday_mutations from "../monday/mutations.js";
import type * as monday_sync from "../monday/sync.js";
import type * as orders_helpers from "../orders/helpers.js";
import type * as orders_mutations from "../orders/mutations.js";
import type * as orders_queries from "../orders/queries.js";
import type * as pieces_registry from "../pieces/registry.js";
import type * as pieces_resolver from "../pieces/resolver.js";
import type * as pieces_types from "../pieces/types.js";
import type * as products_actions from "../products/actions.js";
import type * as products_mutations from "../products/mutations.js";
import type * as products_queries from "../products/queries.js";
import type * as resetAndInit from "../resetAndInit.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as users from "../users.js";
import type * as workflows_interpreter from "../workflows/interpreter.js";
import type * as workflows_mutations from "../workflows/mutations.js";
import type * as workflows_queries from "../workflows/queries.js";
import type * as workflows_runs from "../workflows/runs.js";
import type * as workflows_steps from "../workflows/steps.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  e2e: typeof e2e;
  "events/helpers": typeof events_helpers;
  "events/mutations": typeof events_mutations;
  "events/queries": typeof events_queries;
  "formResponses/mutations": typeof formResponses_mutations;
  "formResponses/queries": typeof formResponses_queries;
  http: typeof http;
  init: typeof init;
  "integrations/mutations": typeof integrations_mutations;
  "integrations/queries": typeof integrations_queries;
  "logs/mutations": typeof logs_mutations;
  "logs/queries": typeof logs_queries;
  migration: typeof migration;
  "monday/actions": typeof monday_actions;
  "monday/internal": typeof monday_internal;
  "monday/inventorySync": typeof monday_inventorySync;
  "monday/mutations": typeof monday_mutations;
  "monday/sync": typeof monday_sync;
  "orders/helpers": typeof orders_helpers;
  "orders/mutations": typeof orders_mutations;
  "orders/queries": typeof orders_queries;
  "pieces/registry": typeof pieces_registry;
  "pieces/resolver": typeof pieces_resolver;
  "pieces/types": typeof pieces_types;
  "products/actions": typeof products_actions;
  "products/mutations": typeof products_mutations;
  "products/queries": typeof products_queries;
  resetAndInit: typeof resetAndInit;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  users: typeof users;
  "workflows/interpreter": typeof workflows_interpreter;
  "workflows/mutations": typeof workflows_mutations;
  "workflows/queries": typeof workflows_queries;
  "workflows/runs": typeof workflows_runs;
  "workflows/steps": typeof workflows_steps;
  workflows: typeof workflows;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  workflow: {
    journal: {
      load: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          journalEntries: Array<{
            _creationTime: number;
            _id: string;
            step: {
              args: any;
              argsSize: number;
              completedAt?: number;
              functionType: "query" | "mutation" | "action";
              handle: string;
              inProgress: boolean;
              name: string;
              runResult?:
                | { kind: "success"; returnValue: any }
                | { error: string; kind: "failed" }
                | { kind: "canceled" };
              startedAt: number;
              workId?: string;
            };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          ok: boolean;
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
      startStep: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          name: string;
          retry?:
            | boolean
            | { base: number; initialBackoffMs: number; maxAttempts: number };
          schedulerOptions?: { runAt?: number } | { runAfter?: number };
          step: {
            args: any;
            argsSize: number;
            completedAt?: number;
            functionType: "query" | "mutation" | "action";
            handle: string;
            inProgress: boolean;
            name: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt: number;
            workId?: string;
          };
          workflowId: string;
          workpoolOptions?: {
            defaultRetryBehavior?: {
              base: number;
              initialBackoffMs: number;
              maxAttempts: number;
            };
            logLevel?: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
            maxParallelism?: number;
            retryActionsByDefault?: boolean;
          };
        },
        {
          _creationTime: number;
          _id: string;
          step: {
            args: any;
            argsSize: number;
            completedAt?: number;
            functionType: "query" | "mutation" | "action";
            handle: string;
            inProgress: boolean;
            name: string;
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt: number;
            workId?: string;
          };
          stepNumber: number;
          workflowId: string;
        }
      >;
    };
    workflow: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        null
      >;
      cleanup: FunctionReference<
        "mutation",
        "internal",
        { workflowId: string },
        boolean
      >;
      complete: FunctionReference<
        "mutation",
        "internal",
        {
          generationNumber: number;
          runResult:
            | { kind: "success"; returnValue: any }
            | { error: string; kind: "failed" }
            | { kind: "canceled" };
          workflowId: string;
        },
        null
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          maxParallelism?: number;
          onComplete?: { context?: any; fnHandle: string };
          startAsync?: boolean;
          workflowArgs: any;
          workflowHandle: string;
          workflowName: string;
        },
        string
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { workflowId: string },
        {
          inProgress: Array<{
            _creationTime: number;
            _id: string;
            step: {
              args: any;
              argsSize: number;
              completedAt?: number;
              functionType: "query" | "mutation" | "action";
              handle: string;
              inProgress: boolean;
              name: string;
              runResult?:
                | { kind: "success"; returnValue: any }
                | { error: string; kind: "failed" }
                | { kind: "canceled" };
              startedAt: number;
              workId?: string;
            };
            stepNumber: number;
            workflowId: string;
          }>;
          logLevel: "DEBUG" | "TRACE" | "INFO" | "REPORT" | "WARN" | "ERROR";
          workflow: {
            _creationTime: number;
            _id: string;
            args: any;
            generationNumber: number;
            logLevel?: any;
            name?: string;
            onComplete?: { context?: any; fnHandle: string };
            runResult?:
              | { kind: "success"; returnValue: any }
              | { error: string; kind: "failed" }
              | { kind: "canceled" };
            startedAt?: any;
            state?: any;
            workflowHandle: string;
          };
        }
      >;
    };
  };
};
