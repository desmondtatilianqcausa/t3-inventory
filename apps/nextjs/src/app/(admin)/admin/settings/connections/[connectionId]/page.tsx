import ConnectionForm from "../_components/ConnectionForm";
import type { Id } from "@/convex/_generated/dataModel";
import React from "react";

function page({ params }: { params: { connectionId: string } }) {
  return (
    <div>
      <ConnectionForm
        connectionId={
          params.connectionId as unknown as Id<"integrationConnections">
        }
      />
    </div>
  );
}

export default page;
