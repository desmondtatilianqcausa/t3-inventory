import type { Id } from "@/convex/_generated/dataModel";
import React from "react";

import ConnectionForm from "~/app/(admin)/admin/settings/connections/_components/ConnectionForm";

async function page({
  params,
}: {
  params: Promise<{ integrationId: string; connectionId: string }>;
}) {
  const { integrationId, connectionId } = await params;
  return (
    <div>
      <ConnectionForm
        integrationId={integrationId as unknown as Id<"integrations">}
        connectionId={connectionId as unknown as Id<"integrationConnections">}
      />
    </div>
  );
}

export default page;
