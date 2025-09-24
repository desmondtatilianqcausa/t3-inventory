import { defineTable } from "convex/server";
import { v } from "convex/values";

export const formResponses = defineTable({
  data: v.any(),
  createdAt: v.number(),
  createdById: v.string(),
  mondayItemId: v.optional(v.string()),
  status: v.optional(v.string()),
  processingStatus: v.optional(v.string()),
  processingMeta: v.optional(v.any()),
})
  .index("by_creator", ["createdById"])
  .index("by_status", ["status"]);
