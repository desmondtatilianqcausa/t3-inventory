"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  MailIcon,
  MoveLeftIcon,
  PlusCircleIcon,
} from "lucide-react";

import { Button, cn } from "@acme/ui";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@acme/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@acme/ui/sidebar";

import { QuickCreateDialog } from "./quick-create-dialog";

interface SubItem {
  title: string;
  url: string;
  items?: {
    title: string;
    url: string;
  }[];
}

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: SubItem[];
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // Check if a given path is active
  const isActive = (url: string) => {
    // Exact match for dashboard or root paths
    if (url === "/dashboard" || url === "/") {
      return pathname === url;
    }

    // For other paths, check if the current path starts with the URL
    // This ensures that sub-pages also activate their parent menu item
    return pathname.startsWith(url);
  };

  // Check if any sub-item is active
  const hasActiveChild = (itemUrl: string, subItems?: SubItem[]) => {
    if (!subItems) return false;

    // If the parent URL is active, return true
    if (isActive(itemUrl)) return true;

    // Check if any child URL is active
    return subItems.some((subItem) => isActive(subItem.url));
  };

  const router = useRouter();

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const itemActive = isActive(item.url);
            const childActive = hasActiveChild(item.url, item.items);
            const isCurrentActive = itemActive || childActive;

            // If the item has sub-items, render as a Collapsible
            if (item.items && item.items.length > 0) {
              return (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isCurrentActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isCurrentActive}
                        tooltip={item.title}
                      >
                        <Link
                          href={item.url}
                          className="flex flex-1 items-center gap-2 [&>svg]:size-4 [&>svg]:shrink-0"
                        >
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                        </Link>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => {
                          const subItemActive = isActive(subItem.url);

                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                className={cn(
                                  subItemActive &&
                                    "bg-accent/50 font-medium text-accent-foreground",
                                )}
                              >
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            // Otherwise render as a regular menu item
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  className={cn(
                    itemActive && "bg-accent text-accent-foreground",
                  )}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
