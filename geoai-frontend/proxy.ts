import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { isAdminRole } from "./lib/roles";

const intlMiddleware = createMiddleware(routing);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always skip API routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 2. Skip Next.js internal files
  if (
    pathname.startsWith("/_next") ||
    pathname.includes("favicon.ico") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|woff2?)$/)
  ) {
    return NextResponse.next();
  }

  // 3. Run i18n middleware for pages
  let res = intlMiddleware(req);

  // Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });

          res = NextResponse.next({
            request: req,
            headers: res.headers,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Get user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;

  // Remove locale prefix (/fr, /en, /ar)
  const pathWithoutLocale =
    pathname.replace(/^\/(en|fr|ar)(\/|$)/, "/") || "/";

  const publicRoutes = ["/login", "/register", "/", "/pricing", "/dashboard"];

  const isPublicRoute =
    publicRoutes.includes(pathWithoutLocale) ||
    routing.locales.some((l) => pathname === `/${l}`);

  const locale =
    req.cookies.get("NEXT_LOCALE")?.value || routing.defaultLocale;

  // Redirect unauthenticated users away from protected routes
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  // Protect admin routes
  const isAdminRoute =
    pathWithoutLocale === "/admin" || pathWithoutLocale.startsWith("/admin/");

  if (isAdminRoute && isLoggedIn) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .maybeSingle();

    if (!isAdminRole(profile?.role)) {
      return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm|woff2?)$).*)",
  ],
};