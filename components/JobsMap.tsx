"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { US_MAP_VIEWBOX, US_STATE_PATHS } from "@/lib/us-map-paths";

interface StateCount {
  state: string;
  count: number;
}

// PRD §13.3: teal scale, amber reserved for the single highest-volume state.
const DEEP_TEAL = "#2F5D50";
const LIGHT_TEAL = "#BED3CC";
const AMBER = "#C98A3E";

const US_CENTER = { lat: 39.5, lng: -98.35 };

// The GeoJSON uses standard state names; Adzuna differs only for D.C.
const GEO_TO_ADZUNA: Record<string, string> = {
  "District of Columbia": "Washington, D.C.",
};

// Quiet, dashboard-matching base map: no roads, POIs, or city labels.
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f2f4f0" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5b6b63" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative.province",
    elementType: "geometry.stroke",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#dfe8e4" }],
  },
];

function lerpColor(from: string, to: string, t: number): string {
  const a = parseInt(from.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const channel = (shift: number) => {
    const x = (a >> shift) & 0xff;
    const y = (b >> shift) & 0xff;
    return Math.round(x + (y - x) * t);
  };
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0))
    .toString(16)
    .padStart(6, "0")}`;
}

/**
 * PRD §13.4 loading state: teal-tint skeleton shapes, not a spinner.
 * The actual US silhouette (from the same GeoJSON as the live map) with
 * states pulsing on staggered delays, so the loaded map lands in place.
 */
export function MapSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-[520px] w-full items-center justify-center overflow-hidden rounded-xl border border-teal-tint bg-white"
    >
      <svg
        viewBox={US_MAP_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full p-10"
      >
        {US_STATE_PATHS.map((d, i) => (
          <path
            key={i}
            d={d}
            className="animate-pulse fill-teal-tint"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            style={{ animationDelay: `${(i % 12) * 120}ms` }}
          />
        ))}
      </svg>
      <p className="absolute bottom-4 text-sm text-slate">
        Gathering live posting data...
      </p>
    </div>
  );
}

interface HoverInfo {
  label: string;
  count: number;
}

interface JobsMapProps {
  states: StateCount[];
  /** Changes when a new search resolves; restarts the entrance motion. */
  animationKey: string;
}

export default function JobsMap({ states, animationKey }: JobsMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geoReady, setGeoReady] = useState(false);
  const [hovered, setHovered] = useState<HoverInfo | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  // Read by the (once-registered) Data-layer listeners without re-binding.
  const stateCountsRef = useRef<Map<string, number>>(new Map());

  // PRD §13.1 motion: the map fills/grows in over ~400ms on search resolve.
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / 400, 1);
      setProgress(1 - Math.pow(1 - t, 3)); // ease-out cubic
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animationKey]);

  const countByState = new Map(states.map((s) => [s.state, s.count]));
  stateCountsRef.current = countByState;
  const maxStateCount = Math.max(...states.map((s) => s.count), 1);
  const topStateName = states.reduce(
    (best, s) => (s.count > (best?.count ?? 0) ? s : best),
    null as StateCount | null
  )?.state;

  // Choropleth styling; re-applied as counts change and during the entrance.
  useEffect(() => {
    if (!map || !geoReady) return;
    map.data.setStyle((feature) => {
      const geoName = feature.getProperty("name") as string;
      const adzunaName = GEO_TO_ADZUNA[geoName] ?? geoName;
      const count = countByState.get(adzunaName) ?? 0;
      const share = Math.sqrt(count / maxStateCount);
      const isTop = adzunaName === topStateName;
      return {
        fillColor: isTop ? AMBER : lerpColor(LIGHT_TEAL, DEEP_TEAL, share),
        fillOpacity: (count === 0 ? 0.15 : 0.65) * progress,
        strokeColor: "#FAFAF8",
        strokeOpacity: 1,
        strokeWeight: 1,
        zIndex: 1,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, geoReady, states, progress]);

  // Hover listeners are bound once per map instance.
  useEffect(() => {
    if (!map || !geoReady) return;
    const over = map.data.addListener(
      "mouseover",
      (event: google.maps.Data.MouseEvent) => {
        const geoName = event.feature.getProperty("name") as string;
        const adzunaName = GEO_TO_ADZUNA[geoName] ?? geoName;
        map.data.overrideStyle(event.feature, {
          strokeColor: DEEP_TEAL,
          strokeWeight: 2,
        });
        setHovered({
          label: geoName,
          count: stateCountsRef.current.get(adzunaName) ?? 0,
        });
      }
    );
    const out = map.data.addListener("mouseout", (event: google.maps.Data.MouseEvent) => {
      map.data.revertStyle(event.feature);
      setHovered(null);
    });
    return () => {
      over.remove();
      out.remove();
    };
  }, [map, geoReady]);

  if (!isLoaded) return <MapSkeleton />;

  return (
    <div
      ref={containerRef}
      className="relative h-[520px] w-full overflow-hidden rounded-xl border border-teal-tint"
      onMouseMove={(event) => {
        // Positioned imperatively so cursor movement never re-renders the map.
        const bounds = containerRef.current?.getBoundingClientRect();
        const tooltip = tooltipRef.current;
        if (!bounds || !tooltip) return;
        tooltip.style.left = `${event.clientX - bounds.left + 14}px`;
        tooltip.style.top = `${event.clientY - bounds.top - 12}px`;
      }}
    >
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={US_CENTER}
        zoom={4}
        onLoad={(loadedMap) => {
          setMap(loadedMap);
          loadedMap.data.loadGeoJson("/us-states.geojson", null, () =>
            setGeoReady(true)
          );
        }}
        onUnmount={() => setMap(null)}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          backgroundColor: "#FAFAF8",
        }}
      />

      <div
        ref={tooltipRef}
        className="pointer-events-none absolute z-10 rounded-lg border border-teal-tint bg-white px-3 py-2 text-sm"
        style={{ visibility: hovered ? "visible" : "hidden" }}
      >
        {hovered && (
          <>
            <span className="text-ink">{hovered.label}</span>{" "}
            <span className="font-mono font-medium text-teal">
              {hovered.count.toLocaleString("en-US")}
            </span>{" "}
            <span className="text-slate">postings</span>
          </>
        )}
      </div>
    </div>
  );
}
