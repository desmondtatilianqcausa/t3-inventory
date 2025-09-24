"use client";

import { DataTable } from "~/app/_components/Table";
import IntegrationForm from "./_components/IntegrationForm";
import React from "react";
import { api } from "@/convex/_generated/api";
import { columns } from "./columns";
import { useQuery } from "convex/react";

const IntegrationsPage = () => {
  const integrations = useQuery(api.integrations.queries.getAll, {});
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Create Integration</h2>
        <IntegrationForm />
      </div>
      <DataTable
        title="Integrations"
        data={integrations}
        columns={columns}
        postType="integrations"
      />
    </div>
  );
};

export default IntegrationsPage;
