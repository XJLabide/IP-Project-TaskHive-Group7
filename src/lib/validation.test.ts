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
      mode: "BIDDING",
      autoApprove: false,
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
