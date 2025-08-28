"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@acme/ui/input";

interface NominatimResult {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
}

export interface AddressSearchProps {
  value?: string;
  onChange?: (value: string) => void;
  onSelect: (result: { lat: number; lng: number; displayName: string }) => void;
  placeholder?: string;
  className?: string;
}

export const AddressSearch = ({
  value,
  onChange,
  onSelect,
  placeholder = "Search address",
  className,
}: AddressSearchProps) => {
  const [query, setQuery] = useState(value ?? "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounced = useDebounced(query, 300);

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  useEffect(() => {
    if (!debounced || debounced.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const params = new URLSearchParams({
      format: "jsonv2",
      q: debounced,
      limit: "8",
      addressdetails: "0",
      polygon_geojson: "0",
    });
    fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        "Accept-Language": "en",
      },
    })
      .then(async (r) => (r.ok ? ((await r.json()) as NominatimResult[]) : []))
      .then((items) => setResults(items))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [debounced]);

  const handleSelect = (r: NominatimResult) => {
    setOpen(false);
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    onSelect({ lat, lng, displayName: r.display_name });
    setQuery(r.display_name);
    onChange?.(r.display_name);
  };

  return (
    <div className={className ? `relative ${className}` : "relative"}>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange?.(e.target.value);
        }}
        placeholder={placeholder}
        onFocus={() => setOpen(query.length >= 3)}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && (results.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-background shadow">
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Searching…
            </div>
          )}
          {results.map((r) => (
            <button
              key={String(r.place_id)}
              type="button"
              onClick={() => handleSelect(r)}
              className="class:hover:bg-accent class:hover:text-accent-foreground block w-full px-3 py-2 text-left text-sm"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const useDebounced = (val: string, delay: number) => {
  const [v, setV] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setV(val), delay);
    return () => clearTimeout(t);
  }, [val, delay]);
  return v;
};
