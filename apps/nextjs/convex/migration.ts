import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const createUser = internalMutation({
  args: {
    _id: v.optional(v.id("users")),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.string(),
    tel: v.optional(v.string()),
    roles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", args);
  },
});

export const createUserRole = internalMutation({
  args: {
    userId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => ctx.db.insert("userRoles", args),
});

export const createProduct = internalMutation({
  args: {
    _id: v.optional(v.id("products")),
    name: v.string(),
    description: v.optional(v.string()),
    quantity: v.number(),
    price: v.number(),
    category: v.optional(v.string()),
    createdAt: v.number(),
    productCategoryId: v.union(v.id("productCategories"), v.null()),
  },
  handler: async (ctx, args) => ctx.db.insert("products", args),
});

export const createFormResponse = internalMutation({
  args: {
    _id: v.optional(v.id("formResponses")),
    data: v.any(),
    createdAt: v.number(),
    createdById: v.string(),
    mondayItemId: v.optional(v.string()),
    status: v.optional(v.string()),
    processingStatus: v.optional(v.string()),
    processingMeta: v.optional(v.any()),
  },
  handler: async (ctx, args) => ctx.db.insert("formResponses", args),
});
