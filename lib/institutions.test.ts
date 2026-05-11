import { describe, expect, it } from "vitest";

import { ensureInstitutionMembershipFromDirectory, normalizeInstitutionDirectory } from "./institutions";

describe("normalizeInstitutionDirectory", () => {
  it("normalizes institutions and preserves the default entry", () => {
    const institutions = normalizeInstitutionDirectory([
      { name: "North Academy" },
      { id: "south-campus", name: "South Campus", status: "archived" },
    ]);

    expect(institutions.some((institution) => institution.id === "default")).toBe(true);
    expect(institutions.some((institution) => institution.id === "north-academy")).toBe(true);
    expect(institutions.find((institution) => institution.id === "south-campus")?.status).toBe("archived");
  });
});

describe("ensureInstitutionMembershipFromDirectory", () => {
  it("drops memberships that are not present in the directory", () => {
    const directory = normalizeInstitutionDirectory([{ id: "north", name: "North" }]);
    const membership = ensureInstitutionMembershipFromDirectory(["north", "missing"], "missing", directory);

    expect(membership.institutionIds).toEqual(["north"]);
    expect(membership.primaryInstitutionId).toBe("north");
  });
});
