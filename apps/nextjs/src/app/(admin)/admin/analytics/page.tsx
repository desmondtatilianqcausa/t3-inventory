"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function AnalyticsPage() {
  const data = useQuery(api.formResponses.queries.getAll) ?? [];
  const isLoading = data === undefined;
  const error = null as unknown as { message: string } | null;

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (error)
    return <div className="p-4 text-red-600">{String(error.message)}</div>;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Orders Processing Monitor</h1>
      <div className="grid grid-cols-1 gap-3">
        {data?.map((row) => {
          const payload = typeof row.data === "string" ? row.data : JSON.stringify(row.data);
          return (
            <div key={row._id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Order {row._id}</div>
                <div className="text-sm">Status: {row.status ?? "-"}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                Monday ID: {row.mondayItemId ?? "-"}
              </div>
              <div className="text-sm">
                Processing: {row.processingStatus ?? "-"}
              </div>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-muted/30 p-2 text-xs">
                {payload}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
