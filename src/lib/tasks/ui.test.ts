import { describe, expect, it } from "vitest";
import {
  budgetToCents,
  formatTaskDeadline,
  fromDateTimeLocal,
  materialEditNotice,
  taskFormErrors,
  taskToFields,
  toDateTimeLocal,
  toTaskFields,
  toTaskFormValues,
} from "./ui";

const taskSource = {
  title: "Pick up groceries",
  description: "Buy groceries and deliver them nearby.",
  category: "Delivery",
  fulfillmentMode: "local" as const,
  hiringMode: "bidding" as const,
  budget: 450,
  location: "Community Market",
  addressLine: "1234 Rizal Street, Sampaloc, Manila",
  deadline: "2026-11-01T09:00:00.000Z",
};

describe("task UI helpers", () => {
  it("converts peso input to cents", () => {
    expect(budgetToCents("450")).toBe(45000);
    expect(budgetToCents("450.50")).toBe(45050);
    expect(budgetToCents("")).toBe(0);
    expect(Number.isNaN(budgetToCents("not a number"))).toBe(true);
  });

  it("formats deadlines in Manila time", () => {
    expect(formatTaskDeadline("2026-11-01T09:00:00.000Z")).toBe("Nov 1, 2026, 5:00 PM");
    expect(formatTaskDeadline("2026-01-05T00:30:00.000Z")).toBe("Jan 5, 2026, 8:30 AM");
    expect(formatTaskDeadline("not-a-date")).toBe("No deadline");
  });

  it("round-trips a Manila datetime-local value", () => {
    expect(toDateTimeLocal("2026-11-01T09:00:00.000Z")).toBe("2026-11-01T17:00");
    expect(fromDateTimeLocal("2026-11-01T17:00")).toBe("2026-11-01T09:00:00.000Z");
    expect(fromDateTimeLocal("")).toBeNull();
  });

  it("maps a form to domain fields and drops a remote location", () => {
    const fields = toTaskFields({
      ...toTaskFormValues(taskSource),
      fulfillmentMode: "remote",
      location: "Somewhere",
    });

    expect(fields.budgetCents).toBe(45000);
    expect(fields.locationLabel).toBeNull();
    expect(fields.addressLine).toBeNull();
    expect(fields.deadline).toBe("2026-11-01T09:00:00.000Z");
  });

  it("lets an incomplete draft save but blocks publishing it", () => {
    const empty = {
      ...toTaskFormValues(taskSource),
      title: "",
      description: "",
      budget: "",
      category: "",
      location: "",
    };

    expect(taskFormErrors(empty, { publish: false })).toEqual({});
    expect(taskFormErrors(empty, { publish: true }).title).toBeDefined();
  });

  it("describes the applications a material edit resets", () => {
    const values = { ...toTaskFormValues(taskSource), budget: "500" };
    const notice = materialEditNotice(taskSource, values, 2);

    expect(notice?.fields).toEqual(["budgetCents"]);
    expect(notice?.message).toContain("the price");
    expect(notice?.message).toContain("2 pending applications");
    expect(notice?.message).toContain("those Taskers will be notified");
  });

  it("does not warn when nothing material changed or nobody applied", () => {
    const values = { ...toTaskFormValues(taskSource), category: "Cleaning" };

    expect(materialEditNotice(taskSource, values, 2)).toBeNull();
    expect(
      materialEditNotice(taskSource, { ...values, budget: "500" }, 0),
    ).toBeNull();
  });

  it("converts a UI task back to domain fields", () => {
    const fields = taskToFields(taskSource);

    expect(fields.budgetCents).toBe(45000);
    expect(fields.locationLabel).toBe("Community Market");
    expect(fields.addressLine).toBe("1234 Rizal Street, Sampaloc, Manila");
  });
});
