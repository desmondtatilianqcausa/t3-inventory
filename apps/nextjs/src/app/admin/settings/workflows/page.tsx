"use client";

import { DataTable } from "~/app/_components/Table";
import React from "react";
import WorkflowForm from "./_components/WorkflowForm";
import { api } from "@/convex/_generated/api";
import { columns } from "./columns";
import { useQuery } from "convex/react";

const WorkflowsPage = () => {
  const workflows = useQuery(api.workflows.queries.list, {});
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Create Workflow</h2>
        <WorkflowForm />
      </div>
      <DataTable
        title="Workflows"
        data={workflows}
        columns={columns}
        postType="workflows"
      />
    </div>
  );
};

export default WorkflowsPage;
