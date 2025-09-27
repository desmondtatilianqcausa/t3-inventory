"use client";

import * as React from "react";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  BookOpen,
  Bot,
  Calendar,
  Command,
  Frame,
  LayoutDashboard,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  Square,
  Users,
  Workflow,
} from "lucide-react";
import { TbCloudDataConnection } from "react-icons/tb";
import { NavMain } from "src/app/_components/nav-main";
import { NavProjects } from "src/app/_components/nav-projects";
import { NavSecondary } from "src/app/_components/nav-secondary";
import { NavUser } from "src/app/_components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "src/app/_components/ui/sidebar";
import { useMonday, useRoles } from "src/app/providers";

export const navData = {
  navMain: [
    // {
    //   title: "Dashboard",
    //   url: "/admin",
    //   icon: LayoutDashboard,
    //   isActive: true,
    // },
    {
      title: "Orders",
      url: "/admin/orders",
      icon: Bot,
    },
    {
      title: "Products",
      url: "/admin/products",
      icon: BookOpen,
      items: [
        {
          title: "Categories",
          url: "/admin/products/categories",
          icon: BookOpen,
        },
      ],
    },
    {
      title: "Events",
      url: "/admin/events",
      icon: Calendar,
    },
    {
      title: "Analytics",
      url: "/admin/analytics",
      icon: Settings2,
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: Users,
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: Settings2,
      items: [
        {
          title: "Integrations",
          url: "/admin/settings/integrations",
          icon: TbCloudDataConnection,
        },
        {
          title: "Connections",
          url: "/admin/settings/connections",
          icon: TbCloudDataConnection,
        },
        {
          title: "Workflows",
          url: "/admin/settings/workflows",
          icon: Workflow,
        },
      ],
    },
  ],
} as const;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isInMonday } = useMonday();
  if (isInMonday) return null;
  const { isAdmin } = useRoles();

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

  // Clone navMain into a mutable array to satisfy NavMain prop typing
  const navItems = React.useMemo(
    () => navData.navMain.map((i) => ({ ...i })),
    [],
  );

  // Role-based filtering: non-admins see only Orders, Products, Events
  const filteredNavItems = React.useMemo(() => {
    if (isAdmin) return navItems;
    const allow = new Set([
      "/admin/orders",
      "/admin/products",
      "/admin/events",
    ]);
    return navItems.filter((item) => allow.has(item.url));
  }, [isAdmin, navItems]);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    D5 Inventory System
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavItems as any} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
