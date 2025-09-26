import { defineTable } from "convex/server";
import { v } from "convex/values";

export const orders = defineTable({
  // Reference to the creator (Convex Auth user id string)
  createdById: v.string(),
  // Optional linkage to legacy formResponses for compatibility
  formResponseId: v.optional(v.id("formResponses")),
  // Link to an event, if applicable
  eventId: v.optional(v.id("events")),
  // Monday.com main item id if applicable
  mondayItemId: v.optional(v.string()),
  // Human-friendly incremental order number
  orderNumber: v.optional(v.number()),
  // Aggregated totals (denormalized for convenience)
  totalQuantity: v.optional(v.number()),
  totalPrice: v.optional(v.number()),
  // Status lifecycle
  status: v.optional(v.string()), // e.g., "pending" | "processing" | "completed" | "failed"
  processingStatus: v.optional(v.string()),
  processingMeta: v.optional(v.any()),
  // Featured image for order summary/printouts
  featuredImageId: v.optional(v.id("_storage")),
  featuredImageUrl: v.optional(v.string()),
  // New: pickup/dropoff location
  pickupDropoffLocation: v.optional(v.string()),
  // Timestamps
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_creator", ["createdById"]) // query orders by creator
  .index("by_status", ["status"]) // filter by status
  .index("by_event", ["eventId"]) // list orders for an event
  .index("by_mondayItemId", ["mondayItemId"]) // map to monday item
  .index("by_orderNumber", ["orderNumber"]);

export const orderLineItems = defineTable({
  orderId: v.id("orders"),
  productId: v.id("products"),
  productName: v.optional(v.string()), // denormalized name snapshot
  unitPrice: v.optional(v.number()), // denormalized price snapshot
  quantity: v.number(),
  // New: optional check-in quantity captured at check-in time
  checkinQuantity: v.optional(v.number()),
  // Monday.com subitem linkage
  mondaySubitemId: v.optional(v.string()),
  // Timestamps
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
})
  .index("by_order", ["orderId"]) // list items for an order
  .index("by_product", ["productId"]); // find orders involving a product

// Simple counter table for generating incremental numbers
export const counters = defineTable({
  key: v.string(),
  value: v.number(),
}).index("by_key", ["key"]);
