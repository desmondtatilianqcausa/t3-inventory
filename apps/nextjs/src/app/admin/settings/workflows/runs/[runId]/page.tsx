"use client";

import type { Id } from "@/convex/_generated/dataModel";
import React from "react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";

export default function RunDetailPage() {
  const params = useParams();
  const runId = params?.runId as Id<"workflow_runs">;
  const run = useQuery(api.workflows.runs.getById, { runId });
  const steps = useQuery(api.workflows.steps.listByRun, { runId });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Run Details</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1 text-sm">
          <div>
            <strong>Run ID:</strong> {String(run?._id)}
          </div>
          <div>
            <strong>Workflow:</strong> {String(run?.workflowId)}
          </div>
          <div>
            <strong>Version:</strong> v{run?.version}
          </div>
          <div>
            <strong>Status:</strong> {run?.status}
          </div>
          <div>
            <strong>Started:</strong>{" "}
            {run ? new Date(run.startedAt).toLocaleString() : "-"}
          </div>
          <div>
            <strong>Finished:</strong>{" "}
            {run?.finishedAt ? new Date(run.finishedAt).toLocaleString() : "-"}
          </div>
          {run?.error && (
            <div className="text-red-600">
              <strong>Error:</strong> {run.error}
            </div>
          )}
        </div>
        <div className="space-y-1 text-sm">
          <div>
            <strong>Context:</strong>
          </div>
          <pre className="rounded border bg-muted/30 p-2">
            {JSON.stringify(run?.context ?? {}, null, 2)}
          </pre>
          <div>
            <strong>Outputs:</strong>
          </div>
          <pre className="rounded border bg-muted/30 p-2">
            {JSON.stringify(run?.outputs ?? {}, null, 2)}
          </pre>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-medium">Steps</h2>
        <div className="overflow-x-auto">
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-2 text-left">Node</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Retries</th>
                <th className="p-2 text-left">Started</th>
                <th className="p-2 text-left">Finished</th>
                <th className="p-2 text-left">Logs</th>
              </tr>
            </thead>
            <tbody>
              {(steps ?? []).map((s) => (
                <tr key={String(s._id)} className="border-t">
                  <td className="p-2">{s.nodeId}</td>
                  <td className="p-2">{s.type}</td>
                  <td className="p-2">{s.status}</td>
                  <td className="p-2">{s.retryCount ?? 0}</td>
                  <td className="p-2">
                    {new Date(s.startedAt).toLocaleString()}
                  </td>
                  <td className="p-2">
                    {s.finishedAt
                      ? new Date(s.finishedAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-2">
                    <pre className="max-h-40 overflow-auto rounded border bg-muted/30 p-2">
                      {JSON.stringify(s.logs ?? {}, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
