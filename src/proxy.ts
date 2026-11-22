import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, getAuthCookie } from "@/lib/auth";
import { isPublicPath } from "@/lib/auth-paths";

// Next 16 renombro `middleware.ts` a `proxy.ts`: con el nombre viejo el archivo
// deja de ejecutarse y la app queda sin autenticacion, sin ningun error visible.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const cookieName = getAuthCookie();
  const token = request.cookies.get(cookieName)?.value;

  if (token && await verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const loginUrl = new URL("/acceso", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
