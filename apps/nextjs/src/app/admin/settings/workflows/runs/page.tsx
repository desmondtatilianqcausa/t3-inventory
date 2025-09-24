"use client";

import Link from "next/link";
import React from "react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function RunsListPage() {
  const runs = useQuery(api.workflows.runs.list, { limit: 50 });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Workflow Runs</h1>
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="p-2 text-left">Run ID</th>
              <th className="p-2 text-left">Workflow</th>
              <th className="p-2 text-left">Version</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Started</th>
              <th className="p-2 text-left">Finished</th>
              <th className="p-2 text-left">Error</th>
            </tr>
          </thead>
          <tbody>
            {(runs ?? []).map((r) => (
              <tr key={String(r._id)} className="border-t">
                <td className="p-2">
                  <Link
                    href={`/admin/settings/workflows/runs/${String(r._id)}`}
                    className="underline"
                  >
                    {String(r._id).slice(-8)}
                  </Link>
                </td>
                <td className="p-2">{String(r.workflowId).slice(-8)}</td>
                <td className="p-2">v{r.version}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">
                  {new Date(r.startedAt).toLocaleString()}
                </td>
                <td className="p-2">
                  {r.finishedAt ? new Date(r.finishedAt).toLocaleString() : "-"}
                </td>
                <td className="p-2 text-red-600">{r.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
