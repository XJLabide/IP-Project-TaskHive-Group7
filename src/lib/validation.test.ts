import { describe, expect, it } from "vitest";
import { bidSchema, createTaskSchema, reviewSchema } from "./validation";

describe("TaskHive validation schemas", () => {
  it("accepts a valid task payload", () => {
    const result = createTaskSchema.safeParse({
      title: "Pick up groceries",
      description: "Buy groceries and deliver them nearby.",
      category: "Delivery",
      budgetCents: 45000,
      locationLabel: "Community Market",
      fulfillmentMode: "local",
      hiringMode: "bidding",
      deadline: "2026-11-01T17:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.publish).toBe(true);
  });

  it("accepts a remote fixed-price task without a service location", () => {
    const result = createTaskSchema.safeParse({
      title: "Edit a product description",
      description: "Rewrite the product description for clarity.",
      category: "Writing",
      budgetCents: 60000,
      fulfillmentMode: "remote",
      hiringMode: "fixed_price",
      publish: false,
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty bid message", () => {
    const result = bidSchema.safeParse({
      amountCents: 43000,
      message: "",
    });

    expect(result.success).toBe(false);
  });

  it("caps review ratings at five stars", () => {
    const result = reviewSchema.safeParse({
      taskId: "task_1",
      revieweeId: "user_1",
      rating: 6,
    });

    expect(result.success).toBe(false);
  });
});
