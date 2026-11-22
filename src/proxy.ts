import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isPublicPath } from "@/lib/auth-paths";

// Next 16 renombro `middleware.ts` a `proxy.ts`: con el nombre viejo el archivo
// deja de ejecutarse y la app queda sin autenticacion, sin ningun error visible.
// Debe vivir al nivel de app/ (o sea src/), no en la raiz del repo.
export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  if (request.auth) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const loginUrl = new URL("/acceso", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
});
