"use client";

import { DataTable } from "~/app/_components/Table";
import Link from "next/link";
import { Spinner } from "~/app/_components/ui/loading-spinner";
import { api } from "@/convex/_generated/api";
import { columns } from "./columns";
import { useQuery } from "convex/react";

export default function AdminEventsPage() {
  const events = useQuery(api.events.queries.getAll, { limit: 100 });

  return (
    <DataTable
      title="Events"
      titleSize="3xl"
      data={events ?? []}
      columns={columns}
      postType="Event"
      // handleDelete={handleDelete}
      // handleDuplicate={handleDuplicate}
    />
  );
}
