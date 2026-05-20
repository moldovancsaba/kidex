import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";
import { env } from "@/config/env";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip auth check if not enforced
  if (!env.kidexEnforceAuth) {
    return intlMiddleware(request);
  }

  // 2. Identify public routes
  const isPublicRoute = 
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/api/consent-review') ||
    pathname.startsWith('/api/culture-voice') ||
    pathname.startsWith('/api/oauth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg');

  // 3. Handle API routes
  if (pathname.startsWith('/api')) {
    if (isPublicRoute) return NextResponse.next();

    const cookie = request.cookies.get("kidex_session")?.value;
    const session = cookie ? await decrypt(cookie) : null;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-kidex-role', session.role || 'user');
    requestHeaders.set('x-kidex-user-id', session.userId || '');

    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  }

  // 4. Handle Page routes
  const cookie = request.cookies.get("kidex_session")?.value;
  const session = cookie ? await decrypt(cookie) : null;
  const isLegalPage = /\/(hu|en|ar)\/legal\//.test(pathname);
  const isLandingPage = pathname === '/' || /^\/(hu|en|ar)$/.test(pathname) || /^\/(hu|en|ar)\/$/.test(pathname);
  const isConsentReviewPage = /^\/(hu|en|ar)\/consent\//.test(pathname);
  const isCultureVoicePage = /^\/(hu|en|ar)\/voice\//.test(pathname);

  if (session && isLandingPage) {
    const locale = pathname.match(/^\/(hu|en|ar)/)?.[1] || 'en';
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  if (!session && !isLandingPage && !isLegalPage && !isConsentReviewPage && !isCultureVoicePage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|.*\\..*).*)'
  ]
};
