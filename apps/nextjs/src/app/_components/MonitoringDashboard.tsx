"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export const MonitoringDashboard = () => {
  const logs = useQuery(api.logs.getRecent, { limit: 50 }) ?? [];

  const errorLogs = logs.filter((l) => l.level === "error");

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">System Monitoring</h1>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded border p-3">
          <div className="text-sm text-muted-foreground">Total Logs</div>
          <div className="text-2xl font-semibold">{logs.length}</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-sm text-muted-foreground">Errors</div>
          <div className="text-2xl font-semibold text-red-600">
            {errorLogs.length}
          </div>
        </div>
      </div>

      <h2 className="mb-2 text-lg font-medium">Recent Activity</h2>
      <div className="overflow-hidden rounded border">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Level</th>
              <th className="px-3 py-2 text-left">Message</th>
              <th className="px-3 py-2 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id} className="border-t">
                <td className="px-3 py-2">
                  {new Date(log.ts).toLocaleString()}
                </td>
                <td className="px-3 py-2">{log.level}</td>
                <td className="px-3 py-2">{log.message}</td>
                <td className="px-3 py-2">
                  {log.meta ? (
                    <details>
                      <summary className="cursor-pointer text-muted-foreground">
                        View
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap rounded bg-muted/30 p-2">
                        {JSON.stringify(log.meta, null, 2)}
                      </pre>
                    </details>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
