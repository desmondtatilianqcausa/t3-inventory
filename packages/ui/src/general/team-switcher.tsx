"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronsUpDown, Image as ImageIcon, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
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

const mockNfts = [
  {
    name: "Crypto Punk #1234",
    image: ImageIcon,
    collection: "CryptoPunks",
  },
  {
    name: "Bored Ape #5678",
    image: ImageIcon,
    collection: "BAYC",
  },
  {
    name: "Doodle #9012",
    image: ImageIcon,
    collection: "Doodles",
  },
];

export function TeamSwitcher() {
  const { isMobile } = useSidebar();
  const [activeNft, setActiveNft] = React.useState(mockNfts[0]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="rounded-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-2 hover:from-pink-500/20 hover:to-purple-500/20"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                <activeNft.image className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-white">
                  {activeNft.name}
                </span>
                <span className="truncate text-xs text-white/70">
                  {activeNft.collection}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-white/70" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border border-white/10 bg-black/90 text-white backdrop-blur-xl"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-white/70">
              Your NFTs
            </DropdownMenuLabel>
            {mockNfts.map((nft) => (
              <DropdownMenuItem
                key={nft.name}
                onClick={() => setActiveNft(nft)}
                className="gap-2 p-2 focus:bg-gradient-to-r focus:from-pink-500/20 focus:to-purple-500/20"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-purple-500">
                  <nft.image className="size-4 shrink-0 text-white" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">{nft.name}</span>
                  <span className="text-xs text-white/70">
                    {nft.collection}
                  </span>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-white/[0.08]" />
            <Link href="/my-nfts">
              <DropdownMenuItem className="gap-2 p-2 focus:bg-gradient-to-r focus:from-pink-500/20 focus:to-purple-500/20">
                <div className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-purple-500">
                  <Plus className="size-4 text-white" />
                </div>
                <span className="font-medium">Add New NFT</span>
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
