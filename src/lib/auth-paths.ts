/** Rutas que se sirven sin sesion. Todo lo demas exige la cookie. */
export const PUBLIC_PATHS = [
  "/acceso",
  "/manifest.json",
  "/sw.js",
  "/favicon.ico",
];

/**
 * Solo archivos estaticos en la raiz, que es donde Next sirve /public.
 * Mirar la extension en cualquier ruta abria un bypass de sesion:
 * /api/recipes/<id>.png respondia 404 en vez de 401, y /recipes/x.png daba 200.
 */
const ROOT_STATIC_FILE = /^\/[^/]+\.(svg|png|ico|woff2|webmanifest)$/;

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  // Endpoints propios de Auth.js (signin, callback, session, csrf, signout).
  // Tienen que ser publicos o se bloquearia el login a si mismo; su seguridad
  // la maneja Auth.js, y quien decide si entras es la allowlist del callback.
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) return true;
  // Recetas compartidas por link. Solo este prefijo: la pagina es de solo
  // lectura, con lista blanca de campos, y no dispara nada de IA.
  if (pathname.startsWith("/r/")) return true;
  if (ROOT_STATIC_FILE.test(pathname)) return true;
  return false;
}
