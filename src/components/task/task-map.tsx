"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TaskSummary } from "@/lib/tasks/types";
import { isCoordinates } from "@/lib/tasks/location";

export type MappableTask = TaskSummary & { latitude: number; longitude: number };

export function mappableTasks(tasks: TaskSummary[]): MappableTask[] {
  return tasks.filter(
    (task): task is MappableTask =>
      task.status === "open" &&
      task.fulfillmentMode === "local" &&
      isCoordinates({ latitude: task.latitude, longitude: task.longitude }),
  );
}

export function groupTasksByLocation(tasks: MappableTask[]) {
  const groups = new Map<string, MappableTask[]>();
  for (const task of tasks) {
    const key = `${task.latitude.toFixed(6)},${task.longitude.toFixed(6)}`;
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return [...groups.entries()].map(([key, groupedTasks]) => {
    const [latitude, longitude] = key.split(",").map(Number);
    return { key, latitude, longitude, tasks: groupedTasks };
  });
}

function budgetLabel(task: TaskSummary) {
  return `PHP ${task.budget.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const philippinesCenter = { latitude: 12.8797, longitude: 121.774 };

export function TaskMap({ tasks }: { tasks: TaskSummary[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mappedTasks = useMemo(() => mappableTasks(tasks), [tasks]);
  const groups = useMemo(() => groupTasksByLocation(mappedTasks), [mappedTasks]);

  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((leaflet) => {
      if (disposed || !containerRef.current) return;
      leafletRef.current = leaflet;
      const map = leaflet.map(containerRef.current, {
        center: [philippinesCenter.latitude, philippinesCenter.longitude],
        zoom: 6,
        scrollWheelZoom: true,
        attributionControl: false,
      });
      leaflet.control.attribution({ prefix: false }).addTo(map);
      const tiles = leaflet.tileLayer(tileUrl, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      tiles.on("tileerror", () => setTileError(true));
      tiles.on("tileload", () => setTileError(false));
      tiles.addTo(map);
      mapRef.current = map;
      setMapReady(true);
      window.requestAnimationFrame(() => map.invalidateSize());
    }).catch(() => setTileError(true));

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markersRef.current = [];
      userMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!mapReady || !map || !leaflet) return;

    for (const marker of markersRef.current) marker.remove();
    markersRef.current = groups.map((group) => {
      const items = group.tasks
        .map(
          (task) =>
            `<li><a href="/tasks/${encodeURIComponent(task.id)}">${escapeHtml(task.title || "Untitled task")}</a><span>${escapeHtml(task.category || "Task")} · ${escapeHtml(budgetLabel(task))}</span></li>`,
        )
        .join("");
      const location = group.tasks[0]?.location || "Approximate service area";
      return leaflet
        .marker([group.latitude, group.longitude], {
          icon: leaflet.divIcon({
            className: "taskhive-leaflet-icon",
            html: `<span class="taskhive-leaflet-pin" aria-hidden="true"></span><span class="taskhive-leaflet-count">${group.tasks.length}</span>`,
            iconSize: [30, 34],
            iconAnchor: [15, 34],
          }),
        })
        .bindPopup(`<div class="taskhive-map-popup"><strong>${escapeHtml(location)}</strong><ul>${items}</ul></div>`)
        .addTo(map);
    });

    if (groups.length === 1) {
      map.setView([groups[0].latitude, groups[0].longitude], 13, { animate: false });
    } else if (groups.length > 1) {
      map.fitBounds(
        groups.map((group) => [group.latitude, group.longitude] as [number, number]),
        { padding: [48, 48], maxZoom: 13, animate: false },
      );
    }
  }, [groups, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!mapReady || !map || !leaflet) return;

    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
    if (userLocation) {
      userMarkerRef.current = leaflet
        .marker([userLocation.latitude, userLocation.longitude], {
          icon: leaflet.divIcon({
            className: "taskhive-user-location-icon",
            html: '<span class="taskhive-user-location-dot" aria-hidden="true"></span>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
        })
        .bindTooltip("Your location")
        .addTo(map);
    }
  }, [mapReady, userLocation]);

  function locateUser() {
    if (!navigator.geolocation) {
      setLocationError("Location access is unavailable in this browser.");
      return;
    }

    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { latitude: coords.latitude, longitude: coords.longitude };
        setUserLocation(next);
        mapRef.current?.setView([next.latitude, next.longitude], 13, { animate: true });
        setLocating(false);
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location access is blocked. Allow it in your browser settings and try again."
            : "We could not determine your location. Try again or choose a task on the map.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 },
    );
  }

  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div
          aria-label="Map of open local tasks"
          className="taskhive-leaflet-map h-[min(68vh,680px)] min-h-[420px] w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
          ref={containerRef}
          role="application"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 transition-colors hover:border-[#D19300] hover:bg-[#FFFDF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-[#FFD50D] dark:hover:bg-zinc-800"
            disabled={locating}
            onClick={locateUser}
            type="button"
          >
            <LocateFixed aria-hidden="true" className="h-4 w-4" />
            {locating ? "Finding you…" : "Use my location"}
          </button>
          {locationError ? <p className="text-xs text-[#a01a26] dark:text-[#F04452]" role="alert">{locationError}</p> : null}
        </div>
        {tileError ? <p className="mt-3 text-sm text-[#a01a26] dark:text-[#F04452]" role="status">Map tiles could not load. Check your connection and try again.</p> : null}
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          Pins show approximate service areas only. Exact addresses are never shown here.
        </p>
      </CardContent>
    </Card>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

