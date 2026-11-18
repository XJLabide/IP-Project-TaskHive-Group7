import { describe, expect, it } from "vitest";
import { publicTaskToSummary } from "./public-ui";

describe("publicTaskToSummary", () => {
  it("converts public cents and approximate map coordinates for browse screens", () => {
    expect(publicTaskToSummary({
      id: "task-1",
      title: "Pick up groceries",
      description: "Buy groceries and bring them home.",
      category: "Delivery",
      budgetCents: 45000,
      currency: "PHP",
      deadline: "2026-11-30T12:00:00.000Z",
      publishedAt: null,
      fulfillmentMode: "local",
      hiringMode: "bidding",
      posterName: "Poster One",
      areaLabel: "Sampaloc",
      distanceKm: 2,
      applicationCount: 3,
      approximateCoordinates: { latitude: 14.62, longitude: 121 },
    })).toMatchObject({
      id: "task-1",
      budget: 450,
      location: "Sampaloc",
      latitude: 14.62,
      longitude: 121,
      applications: 3,
      status: "open",
    });
  });
});
