import { describe, expect, it } from "vitest";

import { requiredActionForDashboardPath } from "./dashboard-access";

describe("requiredActionForDashboardPath", () => {
  it("maps dashboard paths to the expected permissions", () => {
    expect(requiredActionForDashboardPath("/dashboard")).toBe(null);
    expect(requiredActionForDashboardPath("/dashboard/assessment")).toBe("assessments.write");
    expect(requiredActionForDashboardPath("/dashboard/records/123")).toBe("assessments.read");
    expect(requiredActionForDashboardPath("/dashboard/children/123")).toBe("children.read");
    expect(requiredActionForDashboardPath("/dashboard/settings")).toBe("settings.read");
  });
});
