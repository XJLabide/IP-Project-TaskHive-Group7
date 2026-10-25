import { describe, expect, it } from "vitest";
import {
  canCancel,
  canDelete,
  changedMaterialFields,
  isMaterialTaskChange,
  transition,
  type MaterialTaskFields,
} from "./lifecycle";

const before: MaterialTaskFields = {
  title: "Pick up groceries",
  description: "Buy groceries and deliver them nearby.",
  budgetCents: 45000,
  deadline: new Date("2026-11-01T17:00:00.000Z"),
  locationLabel: "Community Market",
  fulfillmentMode: "local",
  hiringMode: "bidding",
};

describe("task lifecycle", () => {
  it("publishes a draft", () => {
    expect(transition("draft", { type: "publish" })).toEqual({
      ok: true,
      status: "open",
      effects: [],
    });
  });

  it("does not publish an already published task", () => {
    expect(transition("open", { type: "publish" })).toMatchObject({
      ok: false,
      code: "invalid_transition",
    });
  });

  it("deletes a draft permanently", () => {
    expect(transition("draft", { type: "delete" })).toEqual({
      ok: true,
      status: null,
      effects: [],
    });
  });

  it("refuses to delete a published task and points to cancellation", () => {
    expect(transition("open", { type: "delete" })).toMatchObject({
      ok: false,
      code: "published_task_must_be_cancelled",
    });
  });

  it("cancels an open published task", () => {
    expect(transition("open", { type: "cancel" })).toEqual({
      ok: true,
      status: "cancelled",
      effects: [],
    });
  });

  it("does not cancel a draft", () => {
    expect(transition("draft", { type: "cancel" })).toMatchObject({
      ok: false,
      code: "invalid_transition",
    });
  });

  it("retains a cancelled task instead of deleting it", () => {
    expect(transition("cancelled", { type: "delete" })).toMatchObject({
      ok: false,
      code: "invalid_transition",
    });
    expect(canDelete("cancelled")).toBe(false);
    expect(canCancel("cancelled")).toBe(false);
  });

  it("allows edits on drafts and open tasks only", () => {
    expect(transition("draft", { type: "edit", materialFields: [] }))
      .toMatchObject({ ok: true, status: "draft" });
    expect(transition("open", { type: "edit", materialFields: [] }))
      .toMatchObject({ ok: true, status: "open" });
    expect(transition("cancelled", { type: "edit", materialFields: [] }))
      .toMatchObject({ ok: false, code: "invalid_transition" });
  });

  it("clears and notifies applications after a material edit on an open task", () => {
    expect(
      transition("open", {
        type: "edit",
        materialFields: ["budgetCents"],
      }),
    ).toEqual({
      ok: true,
      status: "open",
      effects: [{ type: "clear_applications" }, { type: "notify_applicants" }],
    });
  });

  it("does not clear applications for a material edit on a draft", () => {
    expect(
      transition("draft", {
        type: "edit",
        materialFields: ["budgetCents"],
      }),
    ).toEqual({ ok: true, status: "draft", effects: [] });
  });

  it("does not clear applications for a non-material edit", () => {
    expect(
      transition("open", {
        type: "edit",
        materialFields: [],
      }),
    ).toEqual({ ok: true, status: "open", effects: [] });
  });

  it("exposes which statuses allow deletion and cancellation", () => {
    expect(canDelete("draft")).toBe(true);
    expect(canDelete("open")).toBe(false);
    expect(canCancel("open")).toBe(true);
    expect(canCancel("draft")).toBe(false);
  });
});

describe("material task changes", () => {
  it("treats title, scope, budget, deadline, location, fulfillment, and hiring as material", () => {
    expect(changedMaterialFields(before, { ...before, title: "Buy groceries" })).toEqual(["title"]);
    expect(
      changedMaterialFields(before, {
        ...before,
        description: "Buy groceries, cleaning supplies, and deliver them.",
      }),
    ).toEqual(["description"]);
    expect(changedMaterialFields(before, { ...before, budgetCents: 50000 })).toEqual([
      "budgetCents",
    ]);
    expect(
      changedMaterialFields(before, {
        ...before,
        deadline: new Date("2026-11-02T17:00:00.000Z"),
      }),
    ).toEqual(["deadline"]);
    expect(changedMaterialFields(before, { ...before, locationLabel: "Another market" })).toEqual([
      "locationLabel",
    ]);
    expect(changedMaterialFields(before, { ...before, fulfillmentMode: "remote" })).toEqual([
      "fulfillmentMode",
    ]);
    expect(changedMaterialFields(before, { ...before, hiringMode: "fixed_price" })).toEqual([
      "hiringMode",
    ]);
  });

  it("ignores formatting-only edits", () => {
    expect(
      isMaterialTaskChange(before, {
        ...before,
        title: "  Pick up groceries  ",
        description: "Buy groceries and deliver them nearby. ",
        locationLabel: " Community Market ",
        deadline: "2026-11-01T17:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("reports every changed material field together", () => {
    const fields = changedMaterialFields(before, {
      ...before,
      title: "Buy groceries",
      budgetCents: 50000,
      hiringMode: "fixed_price",
    });

    expect(fields).toEqual(["title", "budgetCents", "hiringMode"]);
    expect(isMaterialTaskChange(before, { ...before, budgetCents: 50000 })).toBe(true);
  });
});
