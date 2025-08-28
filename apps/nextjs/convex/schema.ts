import { defineSchema, defineTable } from "convex/server";

import { v } from "convex/values";

export default defineSchema({
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    color: v.optional(v.string()),
    startAt: v.optional(v.number()),
    endAt: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    categoryIds: v.optional(v.array(v.id("categories"))),
  }).index("by_category", ["categoryIds"]),
  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    postTypes: v.array(v.string()), // e.g. ["event"]
  })
    .index("by_slug", ["slug"])
    .index("by_postType", ["postTypes"]),
});
