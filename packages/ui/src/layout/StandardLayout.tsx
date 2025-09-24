"use client";

import AppHeader from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { SidebarInset } from "@acme/ui/components/sidebar";
import { cn } from "@acme/ui/lib/utils";

export default function StandardLayout(props: {
  children?: React.ReactNode;
  sidebar?: React.ReactNode;
  appName: string;
  topbar?: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  sidebarVariant?: "inset" | "floating" | "sidebar";
  showSidebar?: boolean;
}) {
  const sidebarToggle = props.sidebar !== undefined;
  // If showSidebar is explicitly set to false, hide the sidebar
  // Otherwise, show it if it exists
  const shouldShowSidebar = props.showSidebar !== false && sidebarToggle;

  return (
    <div
      className={cn(
        "flex-1 [--header-height:calc(--spacing(14))]",
        props.className,
      )}
    >
      {props.header !== undefined ? (
        props.header
      ) : (
        <AppHeader
          appName={props.appName}
          sidebarToggle={sidebarToggle}
          className=""
        />
      )}
      {/* {props.topbar !== undefined ? <TopNavbar /> : null} */}
      <div className="flex flex-1">
        {shouldShowSidebar ? (
          <AppSidebar
            sidebar={props.sidebar}
            className="order-2 list-none md:order-1"
            variant={props.sidebarVariant}
          />
        ) : null}
        <SidebarInset className="order-1 md:order-2">
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              {props.children}
            </div>
          </div>
        </SidebarInset>
      </div>
    </div>
  );
}
