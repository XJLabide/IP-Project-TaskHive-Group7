import { describe, expect, it } from "vitest";
import { validateTaskDraft, validateTaskForPublish, type TaskFields } from "./validation";

const now = new Date("2026-10-25T12:00:00.000Z");

const localTask: TaskFields = {
  title: "Pick up groceries",
  description: "Buy groceries and deliver them nearby.",
  category: "Delivery",
  budgetCents: 45000,
  deadline: new Date("2026-11-01T17:00:00.000Z"),
  fulfillmentMode: "local",
  hiringMode: "bidding",
  locationLabel: "Community Market",
  addressLine: "1234 Rizal Street, Sampaloc, Manila",
};

const remoteTask: TaskFields = {
  ...localTask,
  title: "Edit a product description",
  description: "Rewrite the product description for clarity.",
  category: "Writing",
  deadline: null,
  hiringMode: "fixed_price",
  fulfillmentMode: "remote",
  locationLabel: null,
};

describe("task validation", () => {
  it("accepts a complete local task for draft and publish", () => {
    expect(validateTaskDraft(localTask)).toEqual({});
    expect(validateTaskForPublish(localTask, now)).toEqual({});
  });

  it("accepts a remote fixed-price task without a service location", () => {
    expect(
      validateTaskForPublish(
        { ...remoteTask, deadline: new Date("2026-11-01T17:00:00.000Z") },
        now,
      ),
    ).toEqual({});
  });

  it("saves an incomplete draft without requiring any field yet", () => {
    expect(
      validateTaskDraft({
        ...localTask,
        title: "",
        description: "",
        category: "",
        budgetCents: 0,
        locationLabel: null,
      }),
    ).toEqual({});
  });

  it("requires title, description, and a positive budget to publish", () => {
    const errors = validateTaskForPublish(
      {
        ...localTask,
        title: "A",
        description: "too short",
        budgetCents: 0,
      },
      now,
    );

    expect(errors.title).toBeDefined();
    expect(errors.description).toBeDefined();
    expect(errors.budgetCents).toBeDefined();
  });

  it("allows a local draft without a location but requires one to publish", () => {
    expect(validateTaskDraft({ ...localTask, locationLabel: null })).toEqual({});
    expect(validateTaskForPublish({ ...localTask, locationLabel: null }, now).locationLabel)
      .toBeDefined();
  });

  it("ignores a service location on remote tasks", () => {
    expect(validateTaskDraft({ ...remoteTask, locationLabel: "Some address" })).toEqual({});
    expect(
      validateTaskForPublish(
        {
          ...remoteTask,
          deadline: new Date("2026-11-01T17:00:00.000Z"),
          locationLabel: "Some address",
        },
        now,
      ),
    ).toEqual({});
  });

  it("rejects an excluded or unapproved category", () => {
    expect(validateTaskDraft({ ...localTask, category: "Medical" }).category).toBeDefined();
    expect(validateTaskDraft({ ...localTask, category: "Pet grooming" }).category).toBeDefined();
  });

  it("rejects a category that does not fit the fulfillment", () => {
    expect(validateTaskDraft({ ...localTask, category: "Writing" }).category).toBeDefined();
  });

  it("allows a draft without a deadline but requires one to publish", () => {
    expect(validateTaskDraft(remoteTask)).toEqual({});
    expect(validateTaskForPublish(remoteTask, now).deadline).toBeDefined();
  });

  it("requires the published deadline to be in the future", () => {
    expect(
      validateTaskForPublish(
        { ...localTask, deadline: new Date("2026-10-24T17:00:00.000Z") },
        now,
      ).deadline,
    ).toBeDefined();
  });

  it("requires an exact local address to publish but not to draft", () => {
    expect(validateTaskDraft({ ...localTask, addressLine: null })).toEqual({});
    expect(
      validateTaskForPublish({ ...localTask, addressLine: null }, now).addressLine,
    ).toBeDefined();
    expect(
      validateTaskForPublish({ ...localTask, addressLine: "Flat" }, now).addressLine,
    ).toBeDefined();
  });

  it("does not ask a remote task for a service address", () => {
    expect(
      validateTaskForPublish(
        {
          ...remoteTask,
          addressLine: "1234 Rizal Street",
          deadline: new Date("2026-11-01T17:00:00.000Z"),
        },
        now,
      ),
    ).toEqual({});
  });

  it("rejects an invalid deadline value", () => {
    expect(
      validateTaskDraft({ ...localTask, deadline: "not-a-date" }).deadline,
    ).toBeDefined();
  });
});
