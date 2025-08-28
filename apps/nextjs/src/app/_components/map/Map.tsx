"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import maplibregl, {
  LngLatLike,
  Map as MapLibreMap,
  MarkerOptions,
} from "maplibre-gl";

import type { FillExtrusionLayerSpecification } from "@maplibre/maplibre-gl-style-spec";
import { MapTooltip } from "./MapTooltip";
import type { Root } from "react-dom/client";
import type { TooltipEventItem } from "./MapTooltip";
import { createRoot } from "react-dom/client";
import styles from "./Map.module.css";

export interface MapMarker {
  id: string;
  coordinates: [number, number]; // [lng, lat]
  title: string;
  description?: string;
  color?: string;
  markerOptions?: Omit<MarkerOptions, "color">;
  tooltipTitle?: string;
  tooltipEvents?: TooltipEventItem[];
}

export interface MapProps {
  initialCenter?: LngLatLike;
  initialZoom?: number;
  markers?: MapMarker[];
  className?: string;
  interactive?: boolean;
  enable3DBuildings?: boolean;
  pitch?: number;
  bearing?: number;
  onSelectEvent?: (id: string) => void;
}

export interface MapHandle {
  flyTo: (center: LngLatLike, zoom?: number) => void;
  flyToMarker: (id: string, zoom?: number) => void;
  openPopupForMarker: (id: string) => void;
  flyToAndOpen: (id: string, zoom?: number) => void;
}

const DEFAULT_CENTER: LngLatLike = [-84.2807, 30.4383]; // Tallahassee, FL

export const Map = forwardRef<MapHandle, MapProps>(
  (
    {
      initialCenter = DEFAULT_CENTER,
      initialZoom = 12,
      markers = [],
      className,
      interactive = true,
      enable3DBuildings = false,
      pitch,
      bearing,
      onSelectEvent,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const markersIndexRef = useRef<Record<string, maplibregl.Marker>>({});
    const onSelectEventRef = useRef<typeof onSelectEvent>(onSelectEvent);

    useImperativeHandle(
      ref,
      () => ({
        flyTo: (center, zoom) => {
          const map = mapRef.current;
          if (!map) return;
          map.flyTo({
            center,
            zoom: typeof zoom === "number" ? zoom : map.getZoom(),
          });
        },
        flyToMarker: (id, zoom) => {
          const map = mapRef.current;
          const mk = markersIndexRef.current[id];
          if (!map || !mk) return;
          const ll = mk.getLngLat();
          map.flyTo({
            center: [ll.lng, ll.lat],
            zoom: zoom ?? Math.max(map.getZoom(), 16),
          });
        },
        openPopupForMarker: (id) => {
          const mk = markersIndexRef.current[id];
          const map = mapRef.current;
          if (!mk || !map) return;
          // Close other popups via toggle to ensure proper state
          markersRef.current.forEach((m) => {
            if (m !== mk && m.getPopup().isOpen()) m.togglePopup();
          });
          if (!mk.getPopup().isOpen()) mk.togglePopup();
        },
        flyToAndOpen: (id, zoom) => {
          const map = mapRef.current;
          const mk = markersIndexRef.current[id];
          if (!map || !mk) return;
          const ll = mk.getLngLat();
          map.flyTo({
            center: [ll.lng, ll.lat],
            zoom: zoom ?? Math.max(map.getZoom(), 16),
          });
          // Close others and open this one shortly after camera starts moving
          setTimeout(() => {
            markersRef.current.forEach((m) => {
              if (m !== mk && m.getPopup().isOpen()) m.togglePopup();
            });
            if (!mk.getPopup().isOpen()) mk.togglePopup();
          }, 250);
        },
      }),
      [],
    );

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [
                "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution:
                '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
            },
          ],
        },
        center: initialCenter,
        zoom: initialZoom,
        interactive,
        pitch: typeof pitch === "number" ? pitch : enable3DBuildings ? 45 : 0,
        bearing:
          typeof bearing === "number" ? bearing : enable3DBuildings ? -17.6 : 0,
        canvasContextAttributes: enable3DBuildings
          ? { antialias: true }
          : undefined,
      });

      mapRef.current = map;

      map.addControl(
        new maplibregl.NavigationControl({ visualizePitch: true }),
        "top-right",
      );
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right",
      );

      map.on("load", () => {
        if (!enable3DBuildings) return;

        // Add OpenFreeMap vector tiles and 3D buildings layer
        if (!map.getSource("openfreemap")) {
          map.addSource("openfreemap", {
            url: "https://tiles.openfreemap.org/planet",
            type: "vector",
          });
        }

        // Insert below label layers if any exist; otherwise, just add on top
        const styleLayers = map.getStyle().layers;
        let insertBeforeId: string | undefined;
        for (const layer of styleLayers) {
          if (layer.type === "symbol" && layer.layout?.["text-field"]) {
            insertBeforeId = layer.id;
            break;
          }
        }

        if (!map.getLayer("3d-buildings")) {
          const layerDef: FillExtrusionLayerSpecification = {
            id: "3d-buildings",
            source: "openfreemap",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 15,
            filter: ["!=", ["get", "hide_3d"], true],
            paint: {
              "fill-extrusion-color": [
                "interpolate",
                ["linear"],
                ["get", "render_height"],
                0,
                "lightgray",
                200,
                "royalblue",
                400,
                "lightblue",
              ],
              "fill-extrusion-height": [
                "interpolate",
                ["linear"],
                ["zoom"],
                15,
                0,
                16,
                ["get", "render_height"],
              ],
              "fill-extrusion-base": [
                "case",
                [">=", ["get", "zoom"], 16],
                ["get", "render_min_height"],
                0,
              ],
            },
          };
          if (insertBeforeId) {
            map.addLayer(layerDef, insertBeforeId);
          } else {
            map.addLayer(layerDef);
          }
        }
      });

      return () => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        markersIndexRef.current = {};
        map.remove();
        mapRef.current = null;
      };
    }, [
      initialCenter,
      initialZoom,
      interactive,
      enable3DBuildings,
      pitch,
      bearing,
    ]);

    useEffect(() => {
      onSelectEventRef.current = onSelectEvent;
    }, [onSelectEvent]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      markersIndexRef.current = {};

      markers.forEach((m) => {
        const container = document.createElement("div");
        container.setAttribute("role", "button");
        container.setAttribute("aria-label", m.title);
        container.tabIndex = 0;

        const inner = document.createElement("div");
        inner.className = (styles as unknown as { pin: string }).pin;
        inner.style.setProperty("--marker-color", m.color ?? "#ef4444");
        inner.innerHTML = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="currentColor" d="M12 2c-4.418 0-8 3.42-8 7.64 0 4.78 5.88 10.93 7.38 12.33.34.32.9.32 1.24 0 1.5-1.4 7.38-7.55 7.38-12.33C20 5.42 16.418 2 12 2z"/>
            <circle cx="12" cy="9.5" r="3.25" fill="#ffffff"/>
          </svg>
        `;
        container.appendChild(inner);

        const popup = new maplibregl.Popup({
          offset: 26,
          closeOnClick: false,
          closeButton: false,
        });
        if (m.tooltipEvents && m.tooltipEvents.length > 0) {
          const mount = document.createElement("div");
          // Prevent interactions inside the tooltip from bubbling to the map/marker
          ["pointerdown", "mousedown", "touchstart"].forEach((evt) => {
            mount.addEventListener(
              evt,
              (e: Event) => {
                const ee = e as unknown as {
                  stopImmediatePropagation?: () => void;
                };
                if (typeof ee.stopImmediatePropagation === "function") {
                  ee.stopImmediatePropagation();
                }
                e.stopPropagation();
              },
              { capture: true },
            );
          });
          const root: Root = createRoot(mount);
          root.render(
            <MapTooltip
              markerTitle={m.tooltipTitle ?? m.title}
              events={m.tooltipEvents}
              onSelectEvent={(id) => onSelectEventRef.current?.(id)}
            />,
          );
          popup.setDOMContent(mount);
        } else {
          popup.setHTML(
            `<div style="min-width:180px"><strong>${m.title}</strong>${m.description ? `<div style="margin-top:4px;color:#4b5563">${m.description}</div>` : ""}</div>`,
          );
        }

        const marker = new maplibregl.Marker({
          element: container,
          anchor: "bottom",
          ...(m.markerOptions ?? {}),
        })
          .setLngLat(m.coordinates)
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
        markersIndexRef.current[m.id] = marker;
      });
    }, [markers]);

    return (
      <div
        ref={containerRef}
        className={className ?? ""}
        aria-label="Map showing event locations"
      />
    );
  },
);

Map.displayName = "Map";
