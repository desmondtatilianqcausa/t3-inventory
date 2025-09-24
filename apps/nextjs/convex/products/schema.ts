import { defineTable } from "convex/server";
import { v } from "convex/values";

export const products = defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  price: v.optional(v.number()),
  category: v.optional(v.string()),
  productCategoryId: v.union(v.id("productCategories"), v.null()),
  featuredImageId: v.optional(v.id("_storage")),
  featuredImageUrl: v.optional(v.string()),
  mondayItemId: v.optional(v.number()),
  // Added fields to match CSV columns
  stock: v.optional(v.number()),
  orderingType: v.optional(v.string()),
  sourceVendor: v.optional(v.string()),
  status: v.optional(v.string()),
  inventoryUpdated: v.optional(v.string()),
  restockTrigger: v.optional(v.number()),
  lastManualStockCheck: v.optional(v.string()),
  location: v.optional(v.string()),
  checkedOut: v.optional(v.number()),
  numUntilRestock: v.optional(v.number()),
  ytdStockUsed: v.optional(v.number()),

  tags: v.optional(v.string()),
  owner: v.optional(v.string()),
  untilRestock: v.optional(v.number()),
  updatedTime: v.optional(v.string()),
})
  .index("by_category", ["category"])
  .index("by_productCategory", ["productCategoryId"]);

export const productCategories = defineTable({
  name: v.string(),
  slug: v.optional(v.string()),
  description: v.optional(v.string()),
  categoryColor: v.optional(v.string()),
  mondayGroupId: v.optional(v.string()),
  updatedAt: v.optional(v.number()),
}).index("by_slug", ["slug"]);
