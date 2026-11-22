import { describe, it, expect } from "vitest";
import { isPublicPath } from "@/lib/auth-paths";

describe("isPublicPath — rutas que deben ser públicas", () => {
  it("deja pasar el login y sus dependencias", () => {
    expect(isPublicPath("/acceso")).toBe(true);
    expect(isPublicPath("/api/auth/login")).toBe(true);
  });

  it("deja pasar lo que necesita la PWA", () => {
    expect(isPublicPath("/manifest.json")).toBe(true);
    expect(isPublicPath("/sw.js")).toBe(true);
    expect(isPublicPath("/favicon.ico")).toBe(true);
    expect(isPublicPath("/icon-192.png")).toBe(true);
    expect(isPublicPath("/icon-512.png")).toBe(true);
  });

  it("deja pasar los assets de Next", () => {
    expect(isPublicPath("/_next/static/chunks/main.js")).toBe(true);
  });
});

describe("isPublicPath — bypass por extensión (regresión)", () => {
  // Antes se miraba la extension en cualquier ruta: /api/recipes/x.png
  // respondia 404 en vez de 401 porque el middleware ni corria.
  it("NO deja pasar rutas de API con extensión de imagen", () => {
    expect(isPublicPath("/api/recipes/abc.png")).toBe(false);
    expect(isPublicPath("/api/recipes/abc.svg")).toBe(false);
    expect(isPublicPath("/api/profile/x.ico")).toBe(false);
    expect(isPublicPath("/api/ai/vision.woff2")).toBe(false);
  });

  it("NO deja pasar páginas con extensión de imagen", () => {
    expect(isPublicPath("/recipes/abc.png")).toBe(false);
    expect(isPublicPath("/settings/x.svg")).toBe(false);
  });

  it("NO deja pasar rutas anidadas que imitan un archivo estático", () => {
    expect(isPublicPath("/a/b/c.png")).toBe(false);
  });
});

describe("isPublicPath — rutas protegidas", () => {
  it("exige sesión en las rutas normales", () => {
    for (const p of ["/", "/recipes", "/recipes/abc", "/settings", "/pantry", "/memoria"]) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });

  it("exige sesión en toda la API salvo el login", () => {
    for (const p of ["/api/recipes", "/api/drafts", "/api/profile", "/api/ai/vision", "/api/auth/logout"]) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });
});
