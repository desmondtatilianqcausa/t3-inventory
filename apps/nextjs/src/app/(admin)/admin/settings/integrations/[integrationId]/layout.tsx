import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/app/_components/ui/tabs";

import Link from "next/link";
import React from "react";

export default async function IntegrationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ integrationId: string }>;
}) {
  const { integrationId } = await params;
  return (
    <div>
      <Tabs defaultValue="workflows">
        <TabsList>
          <TabsTrigger value="workflows" asChild>
            <Link href={`/admin/settings/integrations/${integrationId}`}>
              Workflows
            </Link>
          </TabsTrigger>
          <TabsTrigger value="connections" asChild>
            <Link
              href={`/admin/settings/integrations/${integrationId}/connections`}
            >
              Connections
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
