"use client";

import { DataTable } from "~/app/_components/Table";
import React from "react";
import { api } from "@/convex/_generated/api";
import { columns } from "./columns";
import { useQuery } from "convex/react";

const ConnectionsPage = () => {
  const connections = useQuery(api.integrations.queries.listAllConnections, {});
  return (
    <div>
      <DataTable
        title="Connections"
        data={connections}
        columns={columns}
        postType="connections"
      />
    </div>
  );
};

export default ConnectionsPage;
