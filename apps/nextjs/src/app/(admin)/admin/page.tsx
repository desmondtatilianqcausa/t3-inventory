import { AppSidebar } from "src/app/_components/app-sidebar";
import { ChartAreaInteractive } from "src/app/_components/chart-area-interactive";
import { DataTable } from "src/app/_components/data-table";
import { SectionCards } from "src/app/_components/section-cards";
import { SiteHeader } from "src/app/_components/site-header";
import { SidebarInset, SidebarProvider } from "src/app/_components/ui/sidebar";

import data from "../../dashboard/data.json";

export default function Page() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </div>
          <DataTable data={data} />
        </div>
      </div>
    </div>
  );
}
