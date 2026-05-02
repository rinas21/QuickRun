import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface Marker {
  lat: number;
  lng: number;
  label: string;
  color?: "orange" | "blue" | "green" | "red";
  pulse?: boolean;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: Marker[];
  className?: string;
}

const ICON_SVG = (color: string, pulse: boolean) => `
  <div style="position:relative; display:flex; align-items:center; justify-content:center;">
    ${pulse ? `<div style="position:absolute; width:36px; height:36px; border-radius:50%; background:${color}; opacity:0.25; animation:mapPulse 1.5s infinite;"></div>` : ""}
    <div style="width:18px; height:18px; border-radius:50%; background:${color}; border:3px solid white; box-shadow:0 2px 8px rgba(0,0,0,0.4); position:relative; z-index:1;"></div>
  </div>
`;

const COLOR_MAP: Record<string, string> = {
  orange: "#f97316",
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
};

export function MapView({ center = [6.9271, 79.8612], zoom = 14, markers = [], className = "" }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<{ map: any; L: any } | null>(null);
  const markersRef = useRef<any[]>([]);
  // Queue for markers that arrive before the async Leaflet import completes
  const pendingMarkersRef = useRef<Marker[] | null>(null);

  const applyMarkers = (map: any, L: any, markerList: Marker[]) => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markerList.forEach((m) => {
      const color = COLOR_MAP[m.color || "orange"];
      const icon = L.divIcon({
        html: ICON_SVG(color, !!m.pulse),
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });
      const marker = L.marker([m.lat, m.lng], { icon })
        .bindPopup(`<strong>${m.label}</strong>`)
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (markerList.length > 0) {
      const latlngs = markerList.map((m) => [m.lat, m.lng] as [number, number]);
      if (markerList.length === 1) {
        map.setView(latlngs[0], zoom);
      } else {
        try {
          map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
        } catch {}
      }
    }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const style = document.createElement("style");
    style.textContent = `@keyframes mapPulse { 0%,100% { transform:scale(1); opacity:0.25; } 50% { transform:scale(2); opacity:0; } }`;
    document.head.appendChild(style);

    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = L.default.map(mapRef.current, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = { map, L: L.default };

      // Apply any markers that arrived during async load
      if (pendingMarkersRef.current !== null) {
        applyMarkers(map, L.default, pendingMarkersRef.current);
        pendingMarkersRef.current = null;
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) {
      // Map not ready yet — queue the markers for when it loads
      pendingMarkersRef.current = markers;
      return;
    }
    applyMarkers(mapInstanceRef.current.map, mapInstanceRef.current.L, markers);
  }, [markers]);

  return (
    <div
      ref={mapRef}
      className={`w-full rounded-xl overflow-hidden border border-border ${className}`}
      style={{ minHeight: 320, background: "#e8f0e8" }}
    />
  );
}
