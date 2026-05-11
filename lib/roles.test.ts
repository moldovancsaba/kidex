import { describe, expect, it } from "vitest";

import {
  DEFAULT_BOOTSTRAP_ROLES,
  parseRoleHeader,
  sanitizeStoredRoles,
} from "./roles";

describe("sanitizeStoredRoles", () => {
  it("keeps only active runtime roles", () => {
    expect(
      sanitizeStoredRoles(["ADMIN", "conductor", "guardian_viewer", "invalid", "observer", "admin"]),
    ).toEqual(["admin", "conductor", "observer"]);
  });

  it("returns an empty array for non-array input", () => {
    expect(sanitizeStoredRoles("admin")).toEqual([]);
  });
});

describe("parseRoleHeader", () => {
  it("parses comma-separated role headers and drops reserved roles", () => {
    expect(parseRoleHeader("admin, conductor, guardian_viewer, observer")).toEqual([
      "admin",
      "conductor",
      "observer",
    ]);
  });
});

describe("DEFAULT_BOOTSTRAP_ROLES", () => {
  it("keeps the first-user bootstrap aligned to the current active runtime model", () => {
    expect(DEFAULT_BOOTSTRAP_ROLES).toEqual(["admin", "conductor"]);
  });
});
