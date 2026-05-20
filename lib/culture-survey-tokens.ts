import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { requireServerEnv } from "@/config/env";

export interface CultureSurveyTokenPayload extends JWTPayload {
  surveyId: string;
  locale?: string;
}

function getSecretKey() {
  const secret = requireServerEnv("authSecret");
  return new TextEncoder().encode(secret);
}

export async function createCultureSurveyToken(payload: CultureSurveyTokenPayload, expiresIn = "21d") {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
}

export async function verifyCultureSurveyToken(token: string): Promise<CultureSurveyTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    const surveyId = typeof payload.surveyId === "string" ? payload.surveyId : "";
    const locale = typeof payload.locale === "string" ? payload.locale : undefined;
    if (!surveyId) return null;
    return { surveyId, locale };
  } catch {
    return null;
  }
}
