"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Circle, Map as LeafletMap, Marker } from "leaflet";
import { Button } from "@/components/ui/button";
import type { Coordinates } from "@/lib/tasks/location";

export const PHILIPPINES_MAP_CENTER: Coordinates = {
  latitude: 12.8797,
  longitude: 121.774,
};

type LeafletLocationPickerProps = {
  label: string;
  center: Coordinates;
  selected: Coordinates | null;
  zoom: number;
  radiusKm?: number | null;
  onSelect: (coordinates: Coordinates) => void;
};

const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export function LeafletLocationPicker({
  label,
  center,
  selected,
  zoom,
  radiusKm,
  onSelect,
}: LeafletLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const radiusRef = useRef<Circle | null>(null);
  const onSelectRef = useRef(onSelect);
  const initialViewRef = useRef({ center, zoom });
  const [mapReady, setMapReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const selectedLatitude = selected?.latitude ?? null;
  const selectedLongitude = selected?.longitude ?? null;

  const selectPoint = useCallback((coordinates: Coordinates) => {
    setLocationError("");
    onSelectRef.current(coordinates);
  }, []);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | null = null;

    void import("leaflet")
      .then((leaflet) => {
        if (disposed || !containerRef.current) return;

        leafletRef.current = leaflet;
        const initial = initialViewRef.current;
        map = leaflet
          .map(containerRef.current, {
            center: [initial.center.latitude, initial.center.longitude],
            zoom: initial.zoom,
            scrollWheelZoom: false,
            attributionControl: false,
          })
          .setView([initial.center.latitude, initial.center.longitude], initial.zoom);

        leaflet.control.attribution({ prefix: false }).addTo(map);

        const tiles = leaflet.tileLayer(tileUrl, {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        });
        tiles.on("tileerror", () => setTileError(true));
        tiles.on("tileload", () => setTileError(false));
        tiles.addTo(map);

        map.on("click", (event) => {
          selectPoint({
            latitude: event.latlng.lat,
            longitude: event.latlng.lng,
          });
        });

        mapRef.current = map;
        setMapReady(true);
        window.requestAnimationFrame(() => map?.invalidateSize());
      })
      .catch(() => setTileError(true));

    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markerRef.current = null;
      radiusRef.current = null;
    };
  }, [selectPoint]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!mapReady || !map || !leaflet) return;

    map.setView([center.latitude, center.longitude], zoom, { animate: false });

    if (selectedLatitude !== null && selectedLongitude !== null) {
      const position: [number, number] = [selectedLatitude, selectedLongitude];
      if (markerRef.current) {
        markerRef.current.setLatLng(position);
      } else {
        markerRef.current = leaflet
          .marker(position, {
            icon: leaflet.divIcon({
              className: "taskhive-leaflet-icon",
              html: '<span class="taskhive-leaflet-pin" aria-hidden="true"></span>',
              iconSize: [22, 28],
              iconAnchor: [11, 28],
            }),
          })
          .addTo(map);
      }

      if (radiusKm && radiusKm > 0) {
        if (radiusRef.current) {
          radiusRef.current.setLatLng(position).setRadius(radiusKm * 1000);
        } else {
          radiusRef.current = leaflet
            .circle(position, {
              radius: radiusKm * 1000,
              color: "#D19300",
              weight: 2,
              fillColor: "#FFC800",
              fillOpacity: 0.12,
            })
            .addTo(map);
        }
      } else if (radiusRef.current) {
        radiusRef.current.remove();
        radiusRef.current = null;
      }
    } else {
      markerRef.current?.remove();
      markerRef.current = null;
      radiusRef.current?.remove();
      radiusRef.current = null;
    }
  }, [
    center.latitude,
    center.longitude,
    mapReady,
    radiusKm,
    selectedLatitude,
    selectedLongitude,
    zoom,
  ]);

  function selectMapCenter() {
    const point = mapRef.current?.getCenter();
    if (point) {
      selectPoint({ latitude: point.lat, longitude: point.lng });
    }
  }

  function locateUser() {
    if (!navigator.geolocation) {
      setLocationError("Location access is unavailable in this browser. Choose a point on the map instead.");
      return;
    }

    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        mapRef.current?.setView([point.latitude, point.longitude], 14);
        selectPoint(point);
        setLocating(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            "Location access is blocked for this site. Allow it in your browser settings, then try again, or choose a point on the map.",
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError(
            "Your browser could not determine a location. Check device Location Services, then try again or choose a point on the map.",
          );
        } else {
          setLocationError(
            "Your browser did not return a location in time. Check that device Location Services are on, then try again or choose a point on the map.",
          );
        }
        setLocating(false);
      },
      // Prefer the browser's faster network/device estimate. High-accuracy GPS
      // requests often time out on laptops and desktops that have no GPS sensor.
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 },
    );
  }

  const selectedText = selected
    ? `Pin set at ${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}.`
    : "No pin selected yet.";

  return (
    <div className="grid gap-2">
      <div
        aria-label={label}
        className="taskhive-leaflet-map h-52 w-full overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700 sm:h-60"
        ref={containerRef}
        role="application"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {selectedText} Click or tap the map to move it.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={locating} onClick={locateUser} size="sm" type="button" variant="outline">
            {locating ? "Finding location…" : "Use my location"}
          </Button>
          <Button onClick={selectMapCenter} size="sm" type="button" variant="outline">
            Use map center
          </Button>
        </div>
      </div>
      <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        For an accurate current-location pin, allow location access when your browser asks. You can also set the pin manually.
      </p>
      {locationError ? (
        <p className="text-xs text-[#a01a26] dark:text-[#F04452]" role="alert">
          {locationError}
        </p>
      ) : null}
      {tileError ? (
        <p className="text-xs text-[#a01a26] dark:text-[#F04452]" role="status">
          Map tiles could not load. Check your connection and try again.
        </p>
      ) : null}
    </div>
  );
}
