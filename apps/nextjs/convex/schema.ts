import { authTables } from "@convex-dev/auth/server";
import { defineSchema } from "convex/server";

import { events } from "./events/schema";
import { formResponses } from "./formResponses/schema";
import { integrationConnections, integrations } from "./integrations/schema";
import { counters, orderLineItems, orders } from "./orders/schema";
import { productCategories, products } from "./products/schema";
import { userRoles, users } from "./users/schema";
import {
  workflow_runs,
  workflow_steps,
  workflow_versions,
  workflows,
} from "./workflows/schema";

export default defineSchema({
  ...authTables,
  users,
  userRoles,
  formResponses,
  products,
  productCategories,

  orders,
  orderLineItems,
  events,
  integrations,
  integrationConnections,
  workflows,
  workflow_versions,
  workflow_runs,
  workflow_steps,
  counters,
});
