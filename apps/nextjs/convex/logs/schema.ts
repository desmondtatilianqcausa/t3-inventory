import { defineTable } from "convex/server";
import { v } from "convex/values";

export const logs = defineTable({
  ts: v.number(),
  level: v.string(),
  message: v.string(),
  meta: v.optional(v.any()),
});
