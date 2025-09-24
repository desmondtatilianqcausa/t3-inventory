import { defineTable } from "convex/server";
import { v } from "convex/values";

export const eventDoc = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  title: v.string(),
  description: v.optional(v.string()),
  slug: v.optional(v.string()),
  createdById: v.optional(v.string()),
  location: v.union(
    v.null(),
    v.string(),
    v.object({
      name: v.optional(v.string()),
      address: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      country: v.optional(v.string()),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
    }),
  ),
  isFree: v.optional(v.boolean()),
  price: v.optional(v.number()),
  images: v.optional(v.array(v.string())),
  startAt: v.optional(v.string()),
  endAt: v.optional(v.string()),
  eventType: v.optional(v.string()),
  leadAgency: v.optional(v.string()),
  targetSegment: v.optional(v.string()),
  isRecurring: v.optional(v.boolean()),
  updatedAt: v.optional(v.number()),
});

export const events = defineTable(eventDoc)
  .index("by_slug", ["slug"]) // fetch by slug
  .index("by_creator", ["createdById"]) // list by creator
  .index("by_startAt", ["startAt"]); // upcoming ordering
