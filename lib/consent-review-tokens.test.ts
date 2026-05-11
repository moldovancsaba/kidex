import { beforeEach, describe, expect, it } from "vitest";

beforeEach(() => {
  process.env.AUTH_SECRET = "test-secret-for-consent-review";
});

describe("consent review tokens", () => {
  it("round-trips a caregiver review token", async () => {
    const { createConsentReviewToken, verifyConsentReviewToken } = await import("./consent-review-tokens");
    const token = await createConsentReviewToken({
      childId: "child-1",
      caregiverId: "caregiver-1",
      locale: "en",
    });

    const payload = await verifyConsentReviewToken(token);
    expect(payload).toEqual({
      childId: "child-1",
      caregiverId: "caregiver-1",
      locale: "en",
    });
  });
});
