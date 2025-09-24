import { mutation } from "../_generated/server";
import { slugify } from "./helpers";
import { v } from "convex/values";

const baseEventArgs = {
  title: v.string(),
  description: v.optional(v.string()),
  slug: v.optional(v.string()),
  createdById: v.string(),
  location: v.optional(
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
  startAt: v.optional(v.number()),
  endAt: v.optional(v.number()),
  isRecurring: v.optional(v.boolean()),
};

export const create = mutation({
  args: baseEventArgs,
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const slug = args.slug ? slugify(args.slug) : slugify(args.title);

    const existing = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    const finalSlug = existing ? `${slug}-${now}` : slug;

    return await ctx.db.insert("events", {
      ...args,
      slug: finalSlug,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    ...baseEventArgs,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, title, slug, ...rest } = args;
    const now = Date.now();
    let newSlug = slug;
    if (!newSlug && title) newSlug = slugify(title);

    if (newSlug) {
      const existing = await ctx.db
        .query("events")
        .withIndex("by_slug", (q) => q.eq("slug", newSlug!))
        .first();
      if (existing && existing._id !== id) {
        newSlug = `${newSlug}-${now}`;
      }
    }

    await ctx.db.patch(id, {
      ...rest,
      ...(title !== undefined ? { title } : {}),
      ...(newSlug !== undefined ? { slug: newSlug } : {}),
      updatedAt: now,
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const setFeaturedImage = mutation({
  args: {
    eventId: v.id("events"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, { eventId, storageId }) => {
    const url = await ctx.storage.getUrl(storageId);
    const patch: Record<string, unknown> = {
      featuredImageId: storageId,
    };
    if (typeof url === "string") {
      patch.featuredImageUrl = url;
    }
    await ctx.db.patch(eventId, patch);
    return null;
  },
});
