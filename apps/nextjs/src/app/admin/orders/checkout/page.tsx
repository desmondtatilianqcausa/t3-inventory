/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  fetchCategories,
  fetchEvents,
  fetchItems,
  fetchLocations,
} from "../actions";

import { CheckoutFormWrapper } from "./CheckoutFormWrapper";
import React from "react";

export const revalidate = 10;

interface Props {
  searchParams: { mode?: string };
}

async function CheckoutPage({ searchParams }: Props) {
  const fetchedEvents = await fetchEvents();
  const fetchedLocations = await fetchLocations();
  const fetchedItems = await fetchItems();
  // console.log("fetchedItems", fetchedItems?.data.boards);
  const items = fetchedItems?.data?.boards[0].items_page.items;
  // console.log("items", items);
  const locations = fetchedLocations?.data.boards[0].items_page.items;
  const fetchedCategories = await fetchCategories();
  const categories = fetchedCategories?.data.boards[0].groups;

  const isDuplicateMode = searchParams.mode === "duplicate";

  // console.log("categories", categories);
  return (
    <div className="container flex flex-col items-center justify-center rounded-md p-3 text-black">
      <CheckoutFormWrapper
        type="out"
        categories={categories}
        events={fetchedEvents}
        locations={locations}
        items={items}
        isDuplicateMode={isDuplicateMode}
      />
    </div>
  );
}

export default CheckoutPage;
