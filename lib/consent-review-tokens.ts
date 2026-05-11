import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { requireServerEnv } from "@/config/env";

export interface ConsentReviewTokenPayload extends JWTPayload {
  childId: string;
  caregiverId: string;
  locale?: string;
}

function getSecretKey() {
  const secret = requireServerEnv("authSecret");
  return new TextEncoder().encode(secret);
}

export async function createConsentReviewToken(
  payload: ConsentReviewTokenPayload,
  expiresIn = "30d",
) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
}

export async function verifyConsentReviewToken(token: string): Promise<ConsentReviewTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    const childId = typeof payload.childId === "string" ? payload.childId : "";
    const caregiverId = typeof payload.caregiverId === "string" ? payload.caregiverId : "";
    const locale = typeof payload.locale === "string" ? payload.locale : undefined;
    if (!childId || !caregiverId) return null;
    return { childId, caregiverId, locale };
  } catch {
    return null;
  }
}
