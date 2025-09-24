"use client";

import { SignInButton, useClerk, useSession } from "@clerk/nextjs";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react";

import { cn } from "@acme/ui";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@acme/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@acme/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@acme/ui/sidebar";

interface NavUserProps {
  user?: {
    name: string;
    email: string;
    avatar: string;
  };
  className?: string;
}

export function NavUser({ user, className }: NavUserProps = {}) {
  const { isMobile } = useSidebar();
  const { session } = useSession();
  const { signOut } = useClerk();

  if (!session) {
    return (
      <SignInButton>
        <button className="ml-auto flex items-center justify-center rounded-md bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 px-4 py-1 text-sm font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-600">
          Sign In
        </button>
      </SignInButton>
    );
  }

  return (
    <SidebarMenu className="w-auto">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "h-10 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 p-1 hover:from-pink-500/30 hover:to-purple-500/30",
                className,
              )}
            >
              <Avatar className="border-gradient-to-r h-8 w-8 rounded-lg border-2 from-pink-500 to-purple-500">
                <AvatarImage src={session.user.imageUrl} />
                <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500">
                  {session.user.firstName?.[0] ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-black">
                  {session.user.fullName ?? session.user.username}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-black/70" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border border-white/10 bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-black backdrop-blur-xl"
            side={isMobile ? "bottom" : "bottom"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 rounded-t-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10 px-3 py-2">
                <Avatar className="border-gradient-to-r h-8 w-8 rounded-lg border-2 from-pink-500 to-purple-500">
                  <AvatarImage src={session.user.imageUrl} />
                  <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500">
                    {session.user.firstName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {session.user.fullName || session.user.username}
                  </span>
                  <span className="truncate text-xs">
                    {session.user.emailAddresses[0]?.emailAddress}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.08]" />
            <DropdownMenuGroup>
              <DropdownMenuItem className="focus:bg-gradient-to-r focus:from-pink-500/20 focus:to-purple-500/20">
                <Sparkles className="mr-2 h-4 w-4 text-pink-500" />
                <span>Upgrade to Pro</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/[0.08]" />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="focus:bg-gradient-to-r focus:from-pink-500/20 focus:to-purple-500/20"
            >
              <LogOut className="mr-2 h-4 w-4 text-pink-500" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
