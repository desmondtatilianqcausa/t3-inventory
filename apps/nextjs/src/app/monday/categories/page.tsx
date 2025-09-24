/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { ComboboxDemo } from "~/app/_components/ComboBox";
import React from "react";
import { fetchCategories } from "~/app/order/actions";

async function page() {
  const fetchedCategories = await fetchCategories();
  console.log("fetchedCategories", fetchedCategories?.data.boards[0].groups);
  const prettyPrintedJSON = JSON.stringify(
    fetchedCategories?.data.boards[0].groups,
    null,
    2,
  );
  return <ComboboxDemo />;
}

export default page;
