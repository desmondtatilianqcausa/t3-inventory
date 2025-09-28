"use client";

import React from "react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Separator } from "src/app/_components/ui/separator";
import { SidebarTrigger } from "src/app/_components/ui/sidebar";

import { cn } from "~/lib/utils";
import { navData } from "./app-sidebar";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export function SiteHeader({ className }: { className?: string }) {
  const [rightActions, setRightActions] = React.useState<React.ReactNode>(null);
  const [leftActions, setLeftActions] = React.useState<React.ReactNode>(null);
  const viewer = useQuery(api.users.queries.viewer, {});
  console.log("viewer", viewer);

  const user = {
    firstName: (viewer as { firstName?: string } | null)?.firstName ?? "User",
    lastName: (viewer as { lastName?: string } | null)?.lastName ?? "",
    email: (viewer as { email?: string } | null)?.email ?? "",
    avatar:
      (viewer as { pictureUrl?: string } | null)?.pictureUrl ??
      "/avatars/shadcn.jpg",
  };

  React.useEffect(() => {
    function handle(e: CustomEvent) {
      setRightActions(e.detail as React.ReactNode);
    }
    window.addEventListener("app:setHeaderActions", handle as EventListener);
    return () => {
      window.removeEventListener(
        "app:setHeaderActions",
        handle as EventListener,
      );
      setRightActions(null);
    };
  }, []);

  React.useEffect(() => {
    function handle(e: CustomEvent) {
      setLeftActions(e.detail as React.ReactNode);
    }
    window.addEventListener(
      "app:setHeaderLeftActions",
      handle as EventListener,
    );
    return () => {
      window.removeEventListener(
        "app:setHeaderLeftActions",
        handle as EventListener,
      );
      setLeftActions(null);
    };
  }, []);

  return (
    <header
      className={cn(
        "group-has-data-[collapsible=icon]/sidebar-wrapper:h-14 flex h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear",
        className,
      )}
    >
      <div className="flex w-full items-center gap-1 px-[30px] lg:gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex flex-1">
          {/* <NavMain items={navData.navMain} /> */}
          <div className="flex items-center gap-2">{leftActions}</div>
          <div className="ml-auto mr-4 flex items-center gap-2">
            {rightActions}
          </div>
          <NavUser className="w-auto min-w-48" user={user} side="bottom" />
        </div>
      </div>
    </header>
  );
}
