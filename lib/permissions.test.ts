import { describe, expect, it } from "vitest";

import { canPerformAction } from "./permissions";

describe("canPerformAction", () => {
  it("allows admins to manage invitations and settings", () => {
    expect(canPerformAction(["admin"], "invites.send")).toBe(true);
    expect(canPerformAction(["admin"], "settings.write")).toBe(true);
  });

  it("prevents observers from mutating records", () => {
    expect(canPerformAction(["observer"], "children.write")).toBe(false);
    expect(canPerformAction(["observer"], "assessments.write")).toBe(false);
  });
});
