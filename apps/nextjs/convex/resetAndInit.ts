import type { FunctionReference } from "convex/server";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export default internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Invoke the default export of convex/init.ts with reset and workflow seeding
    const ref = "init:default" as unknown as FunctionReference<"mutation">;
    await ctx.runMutation(ref, {
      reset: true,
      seedMonday: true,
      seedWorkflow: true,
      seedRun: true,
      monday: {
        apiToken: process.env.MONDAY_TOKEN ?? "asd1234567890",
        boardId: Number(process.env.MONDAY_BOARD_ID ?? "1234567890"),
        groupId: process.env.MONDAY_GROUP_ID ?? "",
      },
    });
    return null;
  },
});
