"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import mondaySdk from "monday-sdk-js";

import { DataTable } from "~/app/_components/Table";
import { Spinner } from "~/app/_components/ui/loading-spinner";
import { columns } from "./columns";

const monday = mondaySdk();
export default function AdminEventsPage() {
  const events = useQuery(api.events.queries.getAll, { limit: 100 });
  const createEvent = useMutation(api.events.mutations.create);
  const removeByMondayId = useMutation(
    api.events.mutations.removeByMondayItemId,
  );

  useEffect(() => {
    const inIframe =
      typeof window !== "undefined" && window.self !== window.top;
    if (!inIframe) return;

    const handler = async (res: any) => {
      console.log("Board event:", res);
      if (res?.type === "new_items") {
        const ids: string[] = (res?.data?.itemIds ?? []).map((x: number) =>
          String(x),
        );
        if (!ids.length) return;
        try {
          const query = `query ($ids: [ID!]!) { items (ids: $ids) { id name } }`;
          const itemRes = await monday.api(query, { variables: { ids } });
          const items = itemRes?.data?.items ?? [];
          for (const it of items) {
            const name: string | undefined = it?.name;
            if (typeof name === "string" && name.trim()) {
              await createEvent({
                title: name.trim(),
                createdById: "monday-user",
                mondayItemId: String(it.id),
              });
            }
          }
        } catch (e) {
          console.error("monday items fetch error", e);
        }
      } else if (res?.type === "delete_items") {
        const ids: string[] = (res?.data?.itemIds ?? []).map((x: number) =>
          String(x),
        );
        for (const id of ids) {
          try {
            await removeByMondayId({ mondayItemId: id });
          } catch (e) {
            console.error("removeByMondayId error", e);
          }
        }
      }
    };

    monday.listen("events", handler);
    return () => {
      // monday.listen does not return unsubscribe in this mode; rely on page unmount
    };
  }, []);

  return (
    <DataTable
      title="Events"
      titleSize="3xl"
      data={events ?? []}
      columns={columns}
      postType="Event"
    />
  );
}
