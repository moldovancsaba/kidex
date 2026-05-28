import { env, requireServerEnv } from "@/config/env";

export function getGoogleAuthorizationUrl(state: string) {
  const clientId = requireServerEnv("googleClientId");
  const redirectUri = env.googleRedirectUri;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  // Request Gmail send scope plus offline access so invite delivery can refresh tokens later.
  url.searchParams.set("scope", "openid email profile https://www.googleapis.com/auth/gmail.send");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeGoogleCodeForTokens(code: string) {
  const clientId = requireServerEnv("googleClientId");
  const clientSecret = requireServerEnv("googleClientSecret");
  const redirectUri = env.googleRedirectUri;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google Token Exchange Error: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

export async function refreshGoogleToken(refreshToken: string) {
  const clientId = requireServerEnv("googleClientId");
  const clientSecret = requireServerEnv("googleClientSecret");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google Token Refresh Error: ${JSON.stringify(error)}`);
  }

  return await response.json();
}
