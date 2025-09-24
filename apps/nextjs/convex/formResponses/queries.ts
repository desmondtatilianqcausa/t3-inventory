import { query } from "../_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { id: v.id("formResponses") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const getAll = query({
  args: {},
  handler: async (ctx) => ctx.db.query("formResponses").order("desc").collect(),
}); 