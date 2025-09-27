import IntegrationForm from "../_components/IntegrationForm";
import React from "react";

function page({ params }: { params: { integrationId: string } }) {
  return (
    <div>
      page {params.integrationId}
      <IntegrationForm />
    </div>
  );
}

export default page;
