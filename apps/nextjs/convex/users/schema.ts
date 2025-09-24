import { defineTable } from "convex/server";
import { v } from "convex/values";

export const users = defineTable({
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  email: v.string(),
  tel: v.optional(v.string()),
  roles: v.optional(v.array(v.string())),
}).index("by_email", ["email"]);

export const userRoles = defineTable({
  userId: v.string(),
  role: v.string(),
})
  .index("by_user", ["userId"])
  .index("by_role", ["role"]);
