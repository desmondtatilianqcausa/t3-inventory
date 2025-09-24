"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { RouterOutputs } from "@acme/trpc/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@acme/ui/components/avatar";
import { Badge } from "@acme/ui/components/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@acme/ui/components/command";

type SearchResult = RouterOutputs["traderLaunchpad"]["directory"]["search"];
interface EntityResult {
  id: string;
  name: string;
  type: string;
  instagramUsername?: string | null;
}
type InstagramResult = SearchResult["instagramProfiles"][number];

export function DirectorySearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Reset isNavigating state when query changes
  useEffect(() => {
    if (query) {
      setIsNavigating(false);
    }
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: searchResults } = api.traderLaunchpad.directory.search.useQuery(
    { query },
    {
      enabled: query.length > 0,
    },
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && query) {
        setIsNavigating(true);
        setOpen(false);
        setQuery("");
        router.push(`/traderlaunchpad/directory/${query}/overview`);
      }
    },
    [query, router],
  );

  const handleSelect = useCallback(
    (entity: EntityResult) => {
      setIsNavigating(true);
      setOpen(false);
      setQuery("");
      // Use username for Instagram profiles, ID for other entities
      const slug =
        entity.type === "instagram" ? entity.instagramUsername : entity.id;
      router.push(`/traderlaunchpad/directory/${slug}/overview`);
    },
    [router],
  );

  return (
    <div ref={searchRef} className="relative w-full">
      <Command
        shouldFilter={false}
        className="relative overflow-visible rounded-lg border border-white/20 bg-[#f8f9fa]/80 shadow-[0_4px_20px_rgba(0,0,0,0.05)] backdrop-blur-[8.4px] [&_[cmdk-input-wrapper]]:px-3"
      >
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-orange-500/10 via-black/5 to-black/10" />
        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/20 to-transparent" />
        <CommandInput
          placeholder="Search traders, brokers, platforms..."
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="relative h-10 w-full border-none bg-transparent py-2 outline-none placeholder:text-black/60 focus:border-none focus:outline-none focus:ring-0"
        />
        <CommandList className="absolute top-[calc(100%+4px)] z-50 w-full rounded-lg border bg-white shadow-lg">
          {open && query && !isNavigating ? (
            <>
              <CommandEmpty>No results found.</CommandEmpty>
              {searchResults?.entities && searchResults.entities.length > 0 && (
                <CommandGroup heading="Entities">
                  {searchResults.entities.map((entity: EntityResult) => (
                    <CommandItem
                      key={entity.id}
                      value={entity.name}
                      onSelect={() => handleSelect(entity)}
                      className="flex items-center gap-2 px-4 py-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {entity.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-1 items-center justify-between">
                        <span>{entity.name}</span>
                        <Badge variant="secondary" className="capitalize">
                          {entity.type}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {searchResults?.instagramProfiles &&
                searchResults.instagramProfiles.length > 0 && (
                  <CommandGroup heading="Instagram Profiles">
                    {searchResults.instagramProfiles.map(
                      (profile: InstagramResult) => (
                        <CommandItem
                          key={profile.id}
                          value={profile.name}
                          onSelect={() => handleSelect(profile)}
                          className="flex items-center gap-2 px-4 py-2"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={profile.profilePicUrl ?? undefined}
                            />
                            <AvatarFallback>
                              {profile.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-1 items-center justify-between">
                            <div className="flex flex-col">
                              <span>{profile.name}</span>
                              {profile.fullName && (
                                <span className="text-sm text-slate-500">
                                  {profile.fullName}
                                </span>
                              )}
                            </div>
                            <Badge variant="secondary">Instagram</Badge>
                          </div>
                        </CommandItem>
                      ),
                    )}
                  </CommandGroup>
                )}
            </>
          ) : null}
        </CommandList>
      </Command>
    </div>
  );
}
