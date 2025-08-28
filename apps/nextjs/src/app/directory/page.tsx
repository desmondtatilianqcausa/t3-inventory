"use client";

import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { MapHandle, MapMarker } from "../_components/map/Map";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@acme/ui/components/sheet";
import { useMemo, useRef, useState } from "react";

import { Button } from "@acme/ui/button";
import { Map as MapView } from "../_components/map/Map";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";

export default function DirectoryPage() {
  const mapRef = useRef<MapHandle>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<Id<"categories"> | null>(null);

  const rawEvents = useQuery(
    api.events.list,
    selectedCategoryId ? { categoryId: selectedCategoryId } : {},
  );
  const events = useMemo(() => rawEvents ?? [], [rawEvents]);
  const categoriesRaw = useQuery(api.categories.list, { postType: "event" });
  const categories = (categoriesRaw ?? []) as Array<{
    _id: Id<"categories">;
    name: string;
  }>;

  const eventsFiltered = useMemo(() => {
    if (!selectedCategoryId) return events;
    return events.filter((e) =>
      (e.categoryIds ?? []).some((id) => id === selectedCategoryId),
    );
  }, [events, selectedCategoryId]);

  // Group events by location (rounded to 5 decimals ~1m precision)
  const { markers, eventIdToMarkerId } = useMemo(() => {
    interface Group {
      lat: number;
      lng: number;
      color?: string;
      events: Doc<"events">[];
    }
    const byLoc = new Map<string, Group>();
    const keyOf = (lat: number, lng: number) =>
      `${lng.toFixed(5)},${lat.toFixed(5)}`;

    for (const e of eventsFiltered) {
      const k = keyOf(e.lat, e.lng);
      const entry: Group = byLoc.get(k) ?? {
        lat: e.lat,
        lng: e.lng,
        color: e.color ?? "#ef4444",
        events: [],
      };
      entry.events.push(e);
      byLoc.set(k, entry);
    }

    const eventIdToMarkerId: Record<string, string> = {};
    const markers: MapMarker[] = [];

    for (const [k, entry] of byLoc.entries()) {
      const sorted = entry.events
        .slice()
        .sort((a, b) => (a.startAt ?? 0) - (b.startAt ?? 0));
      const id = `loc:${k}`;
      for (const ev of entry.events) eventIdToMarkerId[ev._id] = id;

      markers.push({
        id,
        title: `${entry.events.length} event${entry.events.length > 1 ? "s" : ""} at this location`,
        coordinates: [entry.lng, entry.lat],
        color: entry.color,
        tooltipTitle: `${entry.events.length} event${entry.events.length > 1 ? "s" : ""}`,
        tooltipEvents: sorted.map((ev) => ({
          id: ev._id,
          title: ev.title,
          description: ev.description ?? undefined,
          startAt: ev.startAt ?? undefined,
          endAt: ev.endAt ?? undefined,
          color: ev.color ?? undefined,
        })),
      });
    }

    return { markers, eventIdToMarkerId };
  }, [eventsFiltered]);

  const handleFocusEvent = (eventId: string) => {
    const markerId = eventIdToMarkerId[eventId];
    if (markerId) mapRef.current?.flyToAndOpen(markerId, 17);
  };

  const selected = detailsId
    ? (events.find((e) => e._id === detailsId) ?? null)
    : null;

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-row gap-4 p-4">
      <div className="flex-1">
        {/* Category filter */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button
            variant={selectedCategoryId ? "outline" : "secondary"}
            onClick={() => setSelectedCategoryId(null)}
          >
            All
          </Button>
          {categories.map((c) => (
            <Button
              key={c._id}
              variant={selectedCategoryId === c._id ? "secondary" : "outline"}
              onClick={() => setSelectedCategoryId(c._id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
        <div className="relative h-[75dvh] w-full overflow-hidden rounded-lg border">
          <MapView
            ref={mapRef}
            markers={markers}
            onSelectEvent={(id) => setDetailsId(id)}
            className="h-full w-full"
            enable3DBuildings
            initialZoom={15}
          />
        </div>
      </div>
      <aside className="w-full max-w-sm shrink-0 rounded-lg border bg-background p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upcoming events</h2>
        </div>
        {eventsFiltered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No events yet. Create one to get started.
          </p>
        ) : (
          <ul className="divide-y">
            {eventsFiltered.map((e) => (
              <li key={e._id} className="py-2">
                <button
                  className="class:focus:ring-2 class:focus:ring-ring class:hover:bg-accent class:hover:text-accent-foreground w-full rounded-md px-2 py-2 text-left"
                  onClick={() => handleFocusEvent(e._id)}
                  aria-label={`Focus map on ${e.title}`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-1 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: e.color ?? "#ef4444" }}
                    />
                    <span>
                      <span className="block text-sm font-medium leading-tight">
                        {e.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {e.description}
                      </span>
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <Sheet
        open={!!selected}
        onOpenChange={(o) => !o && setDetailsId(null)}
        modal={false}
      >
        <SheetContent side="right" className="sm:max-w-[400px]">
          <SheetHeader>
            <SheetTitle>Event</SheetTitle>
            <SheetDescription>Details</SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 auto-rows-min gap-6 px-1">
            {selected ? (
              <div className="space-y-3 text-sm">
                {selected.startAt || selected.endAt ? (
                  <div className="text-muted-foreground">
                    {selected.startAt
                      ? new Date(selected.startAt).toLocaleString()
                      : null}
                    {selected.startAt && selected.endAt ? " – " : null}
                    {selected.endAt
                      ? new Date(selected.endAt).toLocaleString()
                      : null}
                  </div>
                ) : null}
                {selected.description ? (
                  <div className="whitespace-pre-wrap">
                    {selected.description}
                  </div>
                ) : null}
                <div className="text-xs text-muted-foreground">
                  {selected.lat}, {selected.lng}
                </div>
              </div>
            ) : null}
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
