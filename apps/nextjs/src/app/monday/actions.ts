/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use server";




import { type InventoryFormData } from "../_components/DefaultForm";


import mondaySdk from "monday-sdk-js";
import { type APIOptions } from "monday-sdk-js/types/client-api.interface";

import { headers } from "next/headers";

const monday = mondaySdk();
monday.setApiVersion("2023-10");

const options: APIOptions = {
  token: process.env.MONDAY_TOKEN,
};

export async function mondayApiWithRetry(query: string): Promise<any> {
  return retryApiCall(() => monday.api(query, options));
}

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function resolveBaseUrl(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? process.env.VERCEL_URL;
  if (host) return `${proto}://${host}`;
  return process.env.NODE_ENV === "production"
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

export async function saveFormResponse(values: string) {
  try {
    // Step 1: Save the form response to the database
    const dbData = await saveToDatabase(values);
    // console.log("saveFormResponse_server", dbData);
    if (!dbData) return;

    // Step 2: Create Monday Item and SubItems
    const createMondayItemResult = await createMondayItem(dbData);
    if (!createMondayItemResult) return;
    const MondayItemId = createMondayItemResult.createMondayItemId;
    const updatedFormData = JSON.stringify(
      createMondayItemResult.updatedFormData,
    );
    console.log("updatedFormData", updatedFormData);

    // Step 3: Update Database again

    const updateWithMondayData =
      await api.formResponse.updateWithMondayData.mutate({
        id: dbData.id,
        mondayItemId: MondayItemId,
        data: updatedFormData,
      });

    console.log("updateWithMondayData", updateWithMondayData);
  } catch (error) {
    console.log("Error saving to database", error);
    // Handle this error specifically, maybe return or throw a custom error
    throw new Error("Database save failed");
  }
}

export async function updateFormResponse(orderId: number, values: string) {
  console.log("updateFormResponse", values);
  const data = JSON.parse(values);
  try {
    // 1. Get the DB record so we can read the mondayItemId column
    const record = await api.formResponse.getFormResponseById.query({
      id: orderId,
    });
    if (!record?.mondayItemId) {
      throw new Error("mondayItemId missing on formResponses row");
    }
    const mondayItemId = record.mondayItemId;
    if (!mondayItemId) {
      throw new Error("mondayItemId missing on formResponses row");
    }

    // Trigger background processing for checkin (fire-and-forget)
    try {
      const baseUrl = resolveBaseUrl();
      void fetch(`${baseUrl}/api/orders/${orderId}/checkin-items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: values,
      }).catch((e) =>
        console.error("Failed to trigger background checkin-items", e),
      );
    } catch (err) {
      console.error("Error firing background checkin processing", err);
    }

    // Update DB status immediately; processingStatus will be updated by background job
    await api.formResponse.updateWithMondayData.mutate({
      id: orderId,
      status: "checkin",
      processingStatus: "checkin-processing",
    });
  } catch (error) {
    console.error("updateFormResponse error", error);
  }
}

export async function checkinOrder(id: string) {
  console.log("checkinOrder_init", id);
  try {
    const mutation = `mutation { change_simple_column_value (board_id: 6309440166, item_id: \"${id}\", column_id:\"status\", value: \"1\") { id }}`;
    const updateMondayOrder = await mondayApiWithRetry(mutation);
    console.log("updateMondayOrder", updateMondayOrder);
    return updateMondayOrder;
  } catch (error) {}
}

export async function changeSubitemQuantity(data: any) {
  console.log("changeSubitemQuantity_init", data);
  const updatedItems = await Promise.all(
    data.items.map(async (item: any) => {
      const itemId = await updateSubitem(item); // Your function to create an item on Monday
      return { ...item }; // Append the itemId to the item
    }),
  );
}

export async function updateSubitem(data: any) {
  try {
    const { itemId, quantity } = data;
    console.log("updateSubitem_id", itemId);
    const mutation1 = `mutation { change_simple_column_value (board_id: 6314721404, item_id: \"${itemId}\", column_id:\"numbers2\", value: \"${quantity.checkin}\") { id }}`;
    const result1 = await mondayApiWithRetry(mutation1);

    const query1 = `query { items (ids: \"${itemId}\") { column_values (ids: [\"text\"]) { text }} }`;
    const result2 = await mondayApiWithRetry(query1);
    const sku = result2.data.items[0].column_values[0].text;

    // Consolidated single query for multiple columns
    const consolidated = `query { items (ids: \"${sku}\") { column_values (ids: [\"numbers5\", \"numbers\", \"numbers6\"]) { id text } } }`;
    const consolidatedResult: any = await mondayApiWithRetry(consolidated);
    const columns: Array<{ id: string; text: string }> =
      consolidatedResult.data.items[0].column_values;
    const getText = (colId: string) =>
      columns.find((c) => c.id === colId)?.text ?? "0";
    const currentStock = getText("numbers5");
    const currentCheckedOut = getText("numbers");
    const alterTriggerQuantity = getText("numbers6");

    const newQuantity = toNum(currentStock) + toNum(quantity.checkin);
    const newCheckOut = toNum(currentCheckedOut) - toNum(quantity.checkin);

    const newStockBeforeRestock = newQuantity - toNum(alterTriggerQuantity);
    console.log("newStockBeforeRestock", newStockBeforeRestock);
    const mutation2 = `mutation { change_multiple_column_values (board_id: 5798486455, item_id: \"${sku}\", column_values: \"{ \\\"numbers5\\\": \\\"${newQuantity}\\\", \\\"numbers\\\": \\\"${newCheckOut}\\\"}\") { id }}`;
    const result6 = await mondayApiWithRetry(mutation2);
    console.log("result6", result6);
    return result1;
  } catch (error) {
    console.log("error", error);
  }
}

export async function updateInventoryColumn(data: any) {
  try {
    const { itemId, quantity } = data;
    console.log("updateSubitem_id", itemId);
    const mutation = `mutation { change_simple_column_value (board_id: 6314721404, item_id: \"${itemId}\", column_id:\"numbers2\", value: \"${quantity.checkin}\") { id }}`;
    const result = await mondayApiWithRetry(mutation);
    console.log("updateSubitem_end", result);
    return result;
  } catch (error) {
    console.log("error", error);
  }
}

export async function readUserSession() {
  const supabase = await supabaseServer();
  return supabase.auth.getSession();
}

export async function saveToDatabase(values: string) {
  let session;
  try {
    const response = await readUserSession();
    session = response.data.session;
    // Check if session or session.user.id is not available
    if (!session?.user?.id) {
      throw new Error("No valid session or user ID found");
    }
  } catch (error) {
    console.error("Error reading user session:", error);
    throw new Error("Failed to retrieve user session");
  }

  try {
    const result = await api.formResponse.create.mutate({
      data: values,
      createdById: session.user.id,
    });
    return result;
  } catch (error) {
    console.error("Error saving to database:", error);
    throw error; // Re-throw the error to be caught by the caller
  }
}

export async function createMondayItem(
  dbData: inferProcedureOutput<AppRouter["formResponse"]["getAll"]>[number],
) {
  const user = await api.user.getById.query({ id: dbData.createdById });

  const formData: InventoryFormData = JSON.parse(dbData.data);
  try {
    const mutation = `mutation { create_item (board_id: 6309440166, item_name: \"Order# ${dbData.id}\", column_values: \"{ \\\"email\\\": \\\"${user?.email} ${user?.email}\\\", \\\"text0\\\": \\\"${user?.tel}\\\", \\\"text3\\\": \\\"${formData.location.name}\\\",\\\"text4\\\": \\\"${formData.event.name}\\\",\\\"text__1\\\": \\\"${formData.subevent?.name ?? ""}\\\", \\\"text\\\": \\\"${user?.firstName}\\\", \\\"status\\\": \\\"2\\\" }\") { id board { id } } }`;
    console.log(mutation);
    const createMondayItemResult = await mondayApiWithRetry(mutation);
    const createMondayItemId = createMondayItemResult.data.create_item.id;

    // Insert the createMondayItemId into formData
    formData.MondayItemId = createMondayItemId;

    // Task 1: Early persistence of mondayItemId
    try {
      await api.formResponse.updateWithMondayData.mutate({
        id: dbData.id,
        mondayItemId: createMondayItemId,
      });
    } catch (err) {
      console.error("Failed to persist mondayItemId early", err);
    }

    // Task 2: Move subitem processing to background route (fire-and-forget)
    try {
      const baseUrl = resolveBaseUrl();
      // Do not await; run in background
      void fetch(`${baseUrl}/api/orders/${dbData.id}/sync-items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      }).catch((e) =>
        console.error("Failed to trigger background sync-items", e),
      );
    } catch (err) {
      console.error("Error firing background subitem processing", err);
    }

    // Background job will update items; return current formData with MondayItemId
    const updatedFormData = { ...formData };

    return { createMondayItemId, updatedFormData };
  } catch (error) {
    console.log("error", error);
    throw error; // Re-throw to ensure calling code handles the error
  }
}

export async function createMondayUserItem({ data }: AuthResponse) {
  const mutation = `mutation { create_item (board_id: 6354338796, item_name: \"${data.user?.user_metadata.first_name} ${data.user?.user_metadata.last_name}\", column_values: \"{ \\\"text__1\\\": \\\"${data.user?.email}\\\" }\") { id board { id } } }`;
  const result = await mondayApiWithRetry(mutation);
  console.log("createMondayUserItem", result);
}

// export async function updateFormDataInDatabase(
//   databaseId: number,
//   updatedFormData: JsonObject,
// ) {}

// Helper function to retry API calls with exponential backoff
// Only adds delays between retry attempts, not on the first attempt
async function retryApiCall<T>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error);

      // Check if it's a rate limit error (429 status)
      const isRateLimit =
        error &&
        (String(error).includes("429") ||
          String(error).includes("Rate Limit") ||
          String(error).includes("Too Many Requests"));

      // If it's the last attempt or not a retryable error, throw
      if (attempt === maxRetries || !isRateLimit) {
        throw error;
      }

      // Only add delay between retry attempts (not on first attempt)
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(
        `Rate limit detected. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript requires it
  throw new Error("Retry attempts exhausted");
}

export async function createSubitem(
  data: InventoryFormData["items"][number],
  newItemId: string,
): Promise<string> {
  return retryApiCall(
    async () => {
      const { name, id, quantity } = data;
      console.log("item name", name);
      const mutation = `mutation { create_subitem (parent_item_id: ${newItemId}, item_name: ${JSON.stringify(name)}, column_values: \"{ \\\"numbers\\\": \\\"${quantity.checkout}\\\",\\\"text\\\": \\\"${id}\\\" }\") { id board { id } } }`;
      const result: any = await mondayApiWithRetry(mutation);

      if (!result?.data?.create_subitem?.id) {
        throw new Error(
          `Failed to create subitem: Invalid response from Monday API`,
        );
      }

      // Consolidated single query for multiple columns
      const consolidated = `query { items (ids: \"${id}\") { column_values (ids: [\"numbers5\", \"numbers\", \"numbers6\"]) { id text } } }`;
      const consolidatedResult: any = await mondayApiWithRetry(consolidated);
      const columns: Array<{ id: string; text: string }> =
        consolidatedResult.data.items[0].column_values;
      const getText = (colId: string) =>
        columns.find((c) => c.id === colId)?.text ?? "0";
      const currentStock = getText("numbers5");
      console.log("currentStock", currentStock);
      const currentCheckedOut = getText("numbers");
      const alterTriggerQuantity = getText("numbers6");

      console.log("currentCheckedOut", currentCheckedOut);

      const alterTriggerQuantityNum = toNum(alterTriggerQuantity);

      const newQuantity = toNum(currentStock) - toNum(quantity.checkout);
      console.log("newQuantity", newQuantity);
      console.log("alterTriggerQuantityNum", alterTriggerQuantityNum);
      const newCheckOut = toNum(currentCheckedOut) + toNum(quantity.checkout);
      const newStockBeforeRestock = newQuantity - toNum(alterTriggerQuantity);
      console.log("newStockBeforeRestock", newStockBeforeRestock);

      const mutation2 = `mutation { change_multiple_column_values (board_id: 5798486455, item_id: \"${id}\", column_values: \"{ \\\"numbers5\\\": \\\"${newQuantity}\\\", \\\"numbers\\\": \\\"${newCheckOut}\\\", \\\"numbers67\\\": \\\"${newStockBeforeRestock}\\\"}\") { id }}`;
      const result6: any = await mondayApiWithRetry(mutation2);
      console.log("result6", result6);

      return result.data.create_subitem.id;
    },
    3,
    1000,
  ); // 3 retries, starting with 1 second delay
}
