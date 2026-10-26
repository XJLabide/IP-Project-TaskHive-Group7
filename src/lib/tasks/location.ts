export type Coordinates = {
  latitude: number;
  longitude: number;
};

export const DEFAULT_RADIUS_KM = 10;
export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 100;

const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Whether a value is a complete pair of coordinates on Earth. */
export function isCoordinates(
  value: { latitude?: unknown; longitude?: unknown } | null | undefined,
): value is Coordinates {
  if (!value) return false;
  const { latitude, longitude } = value;

  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/** Great-circle distance in kilometres, for radius filtering. */
export function distanceKm(from: Coordinates, to: Coordinates): number {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type SearchAreaSource = "chosen" | "saved" | "nationwide";

export type SearchArea = {
  origin: Coordinates | null;
  radiusKm: number;
  source: SearchAreaSource;
  label: string | null;
};

type ChosenArea = {
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number | null;
};

type SavedArea = {
  latitude?: number | null;
  longitude?: number | null;
  label?: string | null;
};

function clampRadius(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_RADIUS_KM;
  }

  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, value));
}

function savedOrigin(saved: SavedArea | null | undefined): Coordinates | null {
  if (!saved) return null;
  return isCoordinates(saved)
    ? { latitude: saved.latitude, longitude: saved.longitude }
    : null;
}

/**
 * Picks the origin for local discovery: an explicit choice first, then the
 * signed-in account's saved location, otherwise nationwide browsing. The
 * radius default and bounds apply to every origin.
 */
export function resolveSearchArea(input: {
  chosen?: ChosenArea | null;
  saved?: SavedArea | null;
}): SearchArea {
  const radiusKm = clampRadius(input.chosen?.radiusKm);

  if (isCoordinates(input.chosen)) {
    return {
      origin: { latitude: input.chosen.latitude, longitude: input.chosen.longitude },
      radiusKm,
      source: "chosen",
      label: null,
    };
  }

  const origin = savedOrigin(input.saved);
  if (origin) {
    return {
      origin,
      radiusKm,
      source: "saved",
      label: input.saved?.label?.trim() || null,
    };
  }

  return { origin: null, radiusKm, source: "nationwide", label: null };
}
