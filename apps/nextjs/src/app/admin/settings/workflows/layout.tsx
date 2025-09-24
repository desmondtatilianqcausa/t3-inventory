import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/app/_components/ui/tabs";

import Link from "next/link";

const WorkflowsLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Tabs defaultValue="workflows">
      <TabsList>
        <TabsTrigger value="workflows" asChild>
          <Link href="/admin/settings/workflows">Workflows</Link>
        </TabsTrigger>
        <TabsTrigger value="runs" asChild>
          <Link href="/admin/settings/workflows/runs">Runs</Link>
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
};

export default WorkflowsLayout;
