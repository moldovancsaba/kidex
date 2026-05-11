import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { requireServerEnv } from "@/config/env";

const SESSION_COOKIE_NAME = "kidex_session";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: string;
  roles?: string[];
  expires: number;
  accessToken?: string;
};

function getSecretKey() {
  const secret = requireServerEnv("authSecret");
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, getSecretKey(), {
      algorithms: ["HS256"]
    });
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(user: { id: string; email: string; name: string; role: string; roles?: string[]; accessToken?: string }) {
  const expires = Date.now() + SESSION_DURATION;
  const session = await encrypt({ 
    userId: user.id, 
    email: user.email, 
    name: user.name, 
    role: user.role, 
    roles: user.roles,
    expires,
    accessToken: user.accessToken
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expires),
    sameSite: "lax",
    path: "/"
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
