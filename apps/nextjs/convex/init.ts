import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { slugify } from "./events/helpers";
import { v } from "convex/values";

export default internalMutation({
  args: {
    reset: v.optional(v.boolean()),
    seedMonday: v.optional(v.boolean()),
    monday: v.optional(
      v.object({
        apiToken: v.string(),
        boardId: v.number(),
        groupId: v.optional(v.string()),
      }),
    ),
    seedWorkflow: v.optional(v.boolean()),
    seedRun: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Optional: reset existing seeded entities
    if (args.reset) {
      for await (const li of ctx.db.query("orderLineItems"))
        await ctx.db.delete(li._id);
      for await (const o of ctx.db.query("orders")) await ctx.db.delete(o._id);
      for await (const p of ctx.db.query("products"))
        await ctx.db.delete(p._id);
      for await (const c of ctx.db.query("productCategories"))
        await ctx.db.delete(c._id);
      for await (const e of ctx.db.query("events")) await ctx.db.delete(e._id);
      for await (const s of ctx.db.query("workflow_steps"))
        await ctx.db.delete(s._id);
      for await (const r of ctx.db.query("workflow_runs"))
        await ctx.db.delete(r._id);
      for await (const vrow of ctx.db.query("workflow_versions"))
        await ctx.db.delete(vrow._id);
      for await (const w of ctx.db.query("workflows"))
        await ctx.db.delete(w._id);
      for await (const ic of ctx.db.query("integrationConnections"))
        await ctx.db.delete(ic._id);
      for await (const i of ctx.db.query("integrations"))
        await ctx.db.delete(i._id);
    }

    // Seed Monday integration + default connection
    if (args.seedMonday && args.monday) {
      const integId = await ctx.db.insert("integrations", {
        kind: "monday",
        name: "Monday Default",
        createdAt: now,
      });
      await ctx.db.insert("integrationConnections", {
        integrationId: integId,
        name: "Default",
        config: {
          apiToken: args.monday.apiToken,
          boardId: args.monday.boardId,
          ...(args.monday.groupId ? { groupId: args.monday.groupId } : {}),
          isDefault: true,
        },
        createdAt: now,
      });
    }

    // Seed Events / Products / Orders (unchanged; abbreviated for brevity)
    // Seed events first (so orders can link to them)
    let events = await ctx.db.query("events").take(10);
    if (events.length === 0) {
      const day = 24 * 60 * 60 * 1000;
      const twoHours = 2 * 60 * 60 * 1000;
      const eventSeeds = [
        {
          title: "Community Meetup",
          description: "Monthly community networking and talks.",
          createdById: "seed-user",
          location: {
            name: "Downtown Hub",
            city: "Tallahassee",
            state: "FL",
            country: "USA",
          },
          isFree: true,
          images: [],
          startAt: now + 2 * day,
          endAt: now + 2 * day + twoHours,
          isRecurring: false,
        },
      ];
      for (const ev of eventSeeds) {
        await ctx.db.insert("events", {
          ...ev,
          slug: slugify(ev.title),
          createdAt: now,
          updatedAt: now,
        });
      }
      events = await ctx.db.query("events").order("asc").take(10);
    }

    let categories = await ctx.db.query("productCategories").take(10);
    if (categories.length === 0) {
      const categorySeeds = [
        { name: "Widgets", description: "All widgets", color: "#0ea5e9" },
        { name: "Gadgets", description: "All gadgets", color: "#10b981" },
      ];
      for (const c of categorySeeds) {
        await ctx.db.insert("productCategories", {
          name: c.name,
          slug: slugify(c.name),
          description: c.description,
          categoryColor: c.color,
          createdAt: now,
          updatedAt: now,
        });
      }
      categories = await ctx.db.query("productCategories").take(10);
    }

    const categoryByName = new Map<string, Id<"productCategories">>();
    for (const c of categories)
      categoryByName.set(c.name as string, c._id as Id<"productCategories">);

    const existingProducts = await ctx.db.query("products").take(1);
    let products = await ctx.db.query("products").take(10);
    if (existingProducts.length === 0) {
      const productSeeds = [
        {
          name: "Widget Alpha",
          description: "Standard widget",
          quantity: 100,
          price: 9.99,
          categoryText: "widgets",
          categoryName: "Widgets",
        },
        {
          name: "Gadget Beta",
          description: "Premium gadget",
          quantity: 50,
          price: 24.5,
          categoryText: "gadgets",
          categoryName: "Gadgets",
        },
      ];
      for (const p of productSeeds) {
        const categoryId = categoryByName.get(p.categoryName) ?? null;
        await ctx.db.insert("products", {
          name: p.name,
          description: p.description,
          quantity: p.quantity,
          price: p.price,
          category: p.categoryText,
          productCategoryId: categoryId,
          createdAt: now,
        });
      }
      products = await ctx.db.query("products").take(10);
    }

    let firstOrderId: Id<"orders"> | null = null;
    if (products.length >= 1) {
      const linkedEventId = events[0]?._id;
      const existingOrders = await ctx.db.query("orders").take(1);
      if (existingOrders.length === 0) {
        const [p1] = products;
        const items = [{ product: p1, quantity: 2 }];
        const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
        const totalPrice = items.reduce(
          (sum, i) =>
            sum +
            (typeof i.product.price === "number" ? i.product.price : 0) *
              i.quantity,
          0,
        );
        const orderId = await ctx.db.insert("orders", {
          createdById: "seed-user",
          createdAt: now,
          status: "completed",
          processingStatus: "completed",
          totalQuantity,
          totalPrice,
          eventId: linkedEventId,
        });
        for (const i of items) {
          await ctx.db.insert("orderLineItems", {
            orderId,
            productId: i.product._id,
            productName: i.product.name,
            unitPrice:
              typeof i.product.price === "number" ? i.product.price : 0,
            quantity: i.quantity,
            createdAt: now,
          });
        }
        firstOrderId = orderId as Id<"orders">;
      } else {
        firstOrderId = existingOrders[0]!._id as Id<"orders">;
      }
    }

    // Seed a workflow and publish it
    let wfId: Id<"workflows"> | null = null;
    if (args.seedWorkflow) {
      wfId = (await ctx.db.insert("workflows", {
        name: "order_to_monday",
        status: "draft",
        createdAt: now,
        updatedAt: now,
        draftGraphJson: {
          nodes: [
            { id: "t1", type: "trigger.orderCreated" },
            { id: "a1", type: "action.monday.upsertItem" },
            { id: "m1", type: "map.lineItems" },
            { id: "a2", type: "action.monday.upsertSubitem" },
            { id: "end", type: "end" },
          ],
          edges: [
            { from: "t1", to: "a1" },
            { from: "a1", to: "m1" },
            { from: "m1", to: "a2" },
            { from: "a2", to: "end" },
          ],
        },
      })) as Id<"workflows">;

      // Publish version 1
      await ctx.db.insert("workflow_versions", {
        workflowId: wfId,
        version: 1,
        state: "published",
        graphJson: (await ctx.db.get(wfId))?.draftGraphJson ?? {
          nodes: [],
          edges: [],
        },
        createdAt: now,
      });
      await ctx.db.patch(wfId, { status: "published", updatedAt: now });
    }

    // Optional kickoff of the workflow run for the first order
    if (args.seedRun && firstOrderId) {
      await ctx.runMutation(api.workflows.runs.kickoff, {
        workflowName: "order_to_monday",
        context: { orderId: firstOrderId },
      });
    }

    return null;
  },
});
