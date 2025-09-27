/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
"use server";

import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";

export async function goToOrder(id: string) {
  redirect(`/order/${id}`);
}

export async function getOrders() {
  const result = await api.formResponse.getAll.query();
  return result;
}

export async function getUserOrders() {
  const result = await api.formResponse.getAll.query();
  return result;
}

export async function deleteOrder(id: number) {
  const result = await api.formResponse.deleteResponse.mutate({ id });
  return result;
}

export async function duplicateOrder(id: number) {
  try {
    // Step 1: Get the original order data
    const originalOrder = await api.formResponse.getFormResponseById.query({
      id,
    });
    if (!originalOrder) {
      throw new Error("Original order not found");
    }

    // Step 2: Parse the original form data and clean it for duplication
    const originalFormData = JSON.parse(originalOrder.data);

    // Remove Monday-specific IDs that should be regenerated
    const cleanedFormData = {
      ...originalFormData,
      MondayItemId: undefined, // Will be regenerated
      items: originalFormData.items.map((item: any) => ({
        ...item,
        itemId: undefined, // Monday subitem ID will be regenerated
      })),
    };

    // Return the cleaned data to be handled on the client side
    return { success: true, data: cleanedFormData };
  } catch (error) {
    console.error("Error preparing duplicate order:", error);
    throw new Error("Failed to prepare duplicate order");
  }
}

export async function fetchItems() {
  try {
    const query1 =
      '{ boards (ids: 5798486455) { items_page (limit: 500 , query_params: {order_by:[{column_id:"name"}]}) { items { id name group { title id } assets { id public_url }} } } }';
    const query2 =
      '{ boards (ids: 5798486455) { items_page (limit: 500, query_params: {order_by:[{column_id:"name"}], rules: [{column_id: "numbers5", compare_value: [0], operator: greater_than}], operator: and }) { items { id name group { title id } assets { id public_url }} } } }';
    const result = await mondayApiWithRetry(query2);
    console.log("fetchItems", result);
    return result;
  } catch (error) {
    console.log("error", error);
  }
}

export async function fetchCategories() {
  try {
    const query = "query { boards (ids: 5798486455) { groups { title id }} }";
    const result = await mondayApiWithRetry(query);
    // console.log("fetchCategories", result);
    return result;
  } catch (error) {
    console.log("error", error);
  }
}

export interface Events {
  data: {
    items_page_by_column_values: {
      items: Event[];
    };
  };
}

export interface Event {
  id: string;
  name: string;
  group: {
    id: number;
    title: string;
  };
  column_values: [
    {
      time: string;
      date: string;
    },
  ];
}

export type GroupedEvents = Record<
  number,
  {
    // Use string if your actual data uses string IDs for groups
    groupId: number; // Or string
    title: string;
    items: Omit<Event, "group">[]; // Omit the 'group' property from Event in items array
  }
>;

export async function fetchEvents() {
  try {
    const query =
      'query { items_page_by_column_values ( limit:100 , board_id: 7298393018 , columns: [{ column_id: "dropdown4", column_values: ["Yes"] }]) {items {id name group {id title} column_values(ids: "text7") { ... on DateValue { time date} }} }}';
    const result1 = (await mondayApiWithRetry(query)) as Events;
    // console.log("result1", result1);
    const result2 = result1.data.items_page_by_column_values.items;
    console.log("result2", result2);

    const groupedData = result2.reduce<GroupedEvents>((acc, item) => {
      // Use the group id as the key for each group
      const { id, title } = item.group;

      // If the group hasn't been added to the accumulator, add it
      if (!acc[id]) {
        acc[id] = {
          groupId: id,
          title,
          items: [],
        };
      }

      // Add the current item to the group's items array
      acc[id]?.items.push({
        id: item.id,
        name: item.name,
        column_values: item.column_values,
      });

      return acc;
    }, {});

    return groupedData;
  } catch (error) {
    console.log("error", error);
  }
}

export async function getEventSubBoard() {
  try {
    const query =
      'query { items_page_by_column_values ( limit:50 , board_id: 5385787810 , columns: [{ column_id: "dropdown__1", column_values: ["Yes"] }]) {items {id name group {id title} } }}';
    const result1 = (await mondayApiWithRetry(query)) as Events;
    // console.log("result1", result1);
    const result2 = result1.data.items_page_by_column_values.items;

    const groupedData = result2.reduce<GroupedEvents>((acc, item) => {
      // Use the group id as the key for each group
      const { id, title } = item.group;

      // If the group hasn't been added to the accumulator, add it
      if (!acc[id]) {
        acc[id] = {
          groupId: id,
          title,
          items: [],
        };
      }

      // Add the current item to the group's items array
      acc[id]?.items.push({
        id: item.id,
        name: item.name,
        column_values: item.column_values,
      });

      return acc;
    }, {});

    return groupedData;
  } catch (error) {
    console.log("error", error);
  }
}

export async function fetchSubEvents(selectedEvent: string) {
  console.log("fetchSubEvents");
  try {
    const query = ` query {items(ids:[${selectedEvent}]) {subitems {id name column_values (ids:"dropdown__1") {text} }}} `;
    const result1 = await mondayApiWithRetry(query);

    const subitems = result1.data.items[0].subitems;
    console.log("subitems", subitems);

    const filteredSubitems = subitems.filter(
      (subitem: { column_values: any[] }) =>
        subitem.column_values.some((cv) => cv.text === "Yes"),
    );

    console.log("filteredSubitems", filteredSubitems);

    // const groupedData = result2.reduce<GroupedEvents>((acc, item) => {
    //   // Use the group id as the key for each group
    //   const { id, title } = item.group;

    //   // If the group hasn't been added to the accumulator, add it
    //   if (!acc[id]) {
    //     acc[id] = {
    //       groupId: id,
    //       title,
    //       items: [],
    //     };
    //   }

    //   // Add the current item to the group's items array
    //   acc[id]?.items.push({
    //     id: item.id,
    //     name: item.name,
    //     column_values: item.column_values,
    //   });

    //   return acc;
    // }, {});

    return filteredSubitems;
  } catch (error) {
    console.log("error", error);
  }
}

export async function fetchLocations() {
  try {
    const query =
      "{ boards (ids: 5987199810) { items_page (limit: 500) { items { id name } } } }";
    const result = await mondayApiWithRetry(query);
    return result;
  } catch (error) {
    console.log("error", error);
  }
}
