import { query } from "../_generated/server";
import { v } from "convex/values";

const orderDoc = v.object({
  _id: v.id("orders"),
  _creationTime: v.number(),
  createdById: v.string(),
  formResponseId: v.optional(v.id("formResponses")),
  eventId: v.optional(v.id("events")),
  mondayItemId: v.optional(v.string()),
  totalQuantity: v.optional(v.number()),
  totalPrice: v.optional(v.number()),
  status: v.optional(v.string()),
  processingStatus: v.optional(v.string()),
  processingMeta: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
});

const lineItemDoc = v.object({
  _id: v.id("orderLineItems"),
  _creationTime: v.number(),
  orderId: v.id("orders"),
  productId: v.id("products"),
  productName: v.optional(v.string()),
  unitPrice: v.optional(v.number()),
  quantity: v.number(),
  mondaySubitemId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
});

export const getById = query({
  args: { id: v.id("orders") },
  returns: v.union(orderDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listByCreator = query({
  args: { createdById: v.string(), limit: v.optional(v.number()) },
  returns: v.array(orderDoc),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_creator", (q) => q.eq("createdById", args.createdById))
      .order("desc")
      .take(limit);
    return rows;
  },
});

export const listByStatus = query({
  args: { status: v.string(), limit: v.optional(v.number()) },
  returns: v.array(orderDoc),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .take(limit);
    return rows;
  },
});

export const listLineItems = query({
  args: { orderId: v.id("orders") },
  returns: v.array(lineItemDoc),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("orderLineItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
    return rows;
  },
});

export const getAll = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(orderDoc),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    return await ctx.db.query("orders").order("desc").take(limit);
  },
});

export const listByEvent = query({
  args: { eventId: v.id("events"), limit: v.optional(v.number()) },
  returns: v.array(orderDoc),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const rows = await ctx.db
      .query("orders")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .take(limit);
    return rows;
  },
});
