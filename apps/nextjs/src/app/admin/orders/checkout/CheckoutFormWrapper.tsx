"use client";

import { DefaultForm, type FormProps } from "~/app/_components/DefaultForm";
import { useEffect, useState } from "react";
import { type GroupedEvents } from "../actions";

interface CheckoutFormWrapperProps {
  type: "out";
  categories: FormProps["categories"];
  events: GroupedEvents | undefined;
  locations: FormProps["locations"];
  items: FormProps["items"];
  isDuplicateMode: boolean;
}

export function CheckoutFormWrapper({
  type,
  categories,
  events,
  locations,
  items,
  isDuplicateMode,
}: CheckoutFormWrapperProps) {
  const [duplicateData, setDuplicateData] = useState<string | null>(null);

  useEffect(() => {
    console.log("CheckoutFormWrapper: isDuplicateMode =", isDuplicateMode);

    if (isDuplicateMode && typeof window !== "undefined") {
      const data = sessionStorage.getItem("duplicateOrderData");
      console.log("CheckoutFormWrapper: Retrieved session storage data:", data);

      if (data) {
        setDuplicateData(data);
        // Clear the session storage after retrieving the data
        sessionStorage.removeItem("duplicateOrderData");
        console.log(
          "CheckoutFormWrapper: Set duplicate data and cleared session storage",
        );
      } else {
        console.log(
          "CheckoutFormWrapper: No duplicate data found in session storage",
        );
      }
    }
  }, [isDuplicateMode]);

  console.log(
    "CheckoutFormWrapper: Rendering with duplicateData:",
    duplicateData ? "present" : "null",
  );

  return (
    <DefaultForm
      type={type}
      data={duplicateData}
      categories={categories}
      events={events}
      locations={locations}
      items={items}
      readonly={isDuplicateMode}
    />
  );
}
