"use client";

import * as React from "react";
import Link from "next/link";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@acme/ui/components/navigation-menu";

export default function TopNavbar() {
  return (
    <NavigationMenu className="w-full">
      <NavigationMenuList className="flex items-center gap-6">
        <NavigationMenuItem>
          <Link href="/listings" legacyBehavior passHref>
            <NavigationMenuLink className="text-sm text-gray-400 transition-colors hover:text-gray-200">
              Collections
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
        {/* <NavigationMenuItem>
          <Link href="/supabase/posts" legacyBehavior passHref>
            <NavigationMenuLink className="text-sm text-gray-400 transition-colors hover:text-gray-200">
              Supabase Posts
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <Link href="/demo/supabaseclient" legacyBehavior passHref>
            <NavigationMenuLink className="text-sm text-gray-400 transition-colors hover:text-gray-200">
              Supabase Data - Client
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem> */}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
