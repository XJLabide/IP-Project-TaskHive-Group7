import { describe, expect, it } from "vitest";
import {
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  distanceKm,
  isCoordinates,
  resolveSearchArea,
} from "./location";

describe("location primitives", () => {
  it("measures a known distance between two points", () => {
    // One tenth of a degree of latitude is about 11.1 km.
    expect(
      distanceKm(
        { latitude: 14.6, longitude: 121.0 },
        { latitude: 14.7, longitude: 121.0 },
      ),
    ).toBeCloseTo(11.12, 2);
  });

  it("returns zero for the same point and stays symmetric", () => {
    const point = { latitude: 14.5995, longitude: 120.9842 };
    const other = { latitude: 14.676, longitude: 121.0437 };

    expect(distanceKm(point, point)).toBe(0);
    expect(distanceKm(point, other)).toBeCloseTo(distanceKm(other, point), 6);
  });

  it("only accepts complete, in-range coordinates", () => {
    expect(isCoordinates({ latitude: 14.6, longitude: 121.0 })).toBe(true);
    expect(isCoordinates({ latitude: 91, longitude: 121 })).toBe(false);
    expect(isCoordinates({ latitude: 14.6, longitude: 181 })).toBe(false);
    expect(isCoordinates({ latitude: 14.6 })).toBe(false);
    expect(isCoordinates(null)).toBe(false);
  });
});

describe("search area", () => {
  const saved = {
    latitude: 14.5995,
    longitude: 120.9842,
    label: "Manila",
  };

  it("defaults to 10 km around the saved location", () => {
    expect(resolveSearchArea({ saved })).toEqual({
      origin: { latitude: 14.5995, longitude: 120.9842 },
      radiusKm: DEFAULT_RADIUS_KM,
      source: "saved",
      label: "Manila",
    });
  });

  it("uses a chosen origin over the saved location", () => {
    expect(
      resolveSearchArea({
        chosen: { latitude: 14.676, longitude: 121.0437 },
        saved,
      }),
    ).toEqual({
      origin: { latitude: 14.676, longitude: 121.0437 },
      radiusKm: DEFAULT_RADIUS_KM,
      source: "chosen",
      label: null,
    });
  });

  it("keeps a chosen radius and clamps it to the supported range", () => {
    const area = (radiusKm: number) =>
      resolveSearchArea({ chosen: { latitude: 14.6, longitude: 121, radiusKm } });

    expect(area(3).radiusKm).toBe(3);
    expect(area(0.2).radiusKm).toBe(MIN_RADIUS_KM);
    expect(area(500).radiusKm).toBe(MAX_RADIUS_KM);
  });

  it("applies a radius-only override to the saved origin", () => {
    expect(resolveSearchArea({ chosen: { radiusKm: 25 }, saved })).toMatchObject({
      source: "saved",
      radiusKm: 25,
      origin: { latitude: 14.5995, longitude: 120.9842 },
    });
  });

  it("browses nationwide when there is no origin at all", () => {
    expect(resolveSearchArea({})).toEqual({
      origin: null,
      radiusKm: DEFAULT_RADIUS_KM,
      source: "nationwide",
      label: null,
    });
  });

  it("falls back to the saved location when the chosen origin is incomplete", () => {
    expect(
      resolveSearchArea({ chosen: { latitude: 14.6, longitude: Number.NaN }, saved }),
    ).toMatchObject({ source: "saved", origin: { latitude: 14.5995, longitude: 120.9842 } });
  });
});
