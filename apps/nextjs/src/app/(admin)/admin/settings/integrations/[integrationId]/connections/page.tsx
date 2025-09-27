"use client";

import ConnectionForm from "../../../connections/_components/ConnectionForm";
import { DataTable } from "~/app/_components/Table";
import type { Id } from "@/convex/_generated/dataModel";
import React from "react";
import { api } from "@/convex/_generated/api";
import { columns } from "./columns";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";

const ConnectionsPage = () => {
  const params = useParams();
  const integrationId = params?.integrationId as Id<"integrations">;
  const connections = useQuery(api.integrations.queries.listConnections, {
    integrationId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Create Connection</h2>
        <ConnectionForm integrationId={integrationId} />
      </div>
      <DataTable
        title="Connections"
        data={connections}
        columns={columns}
        postType="integrationConnections"
      />
    </div>
  );
};

export default ConnectionsPage;
