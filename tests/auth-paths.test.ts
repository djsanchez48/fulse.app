import { describe, it, expect } from "vitest";
import { isPublicPath } from "@/lib/auth-paths";

describe("isPublicPath — rutas que deben ser públicas", () => {
  it("deja pasar la pantalla de acceso", () => {
    expect(isPublicPath("/acceso")).toBe(true);
  });

  it("deja pasar los endpoints de Auth.js (si no, el login se bloquea a sí mismo)", () => {
    for (const p of [
      "/api/auth/signin",
      "/api/auth/signin/google",
      "/api/auth/callback/google",
      "/api/auth/session",
      "/api/auth/csrf",
      "/api/auth/signout",
      "/api/auth/providers",
    ]) {
      expect(isPublicPath(p), p).toBe(true);
    }
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

  it("exige sesión en toda la API salvo el prefijo de Auth.js", () => {
    for (const p of ["/api/recipes", "/api/drafts", "/api/profile", "/api/ai/vision", "/api/ai/ocr-recipe"]) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });

  it("no confunde una ruta que solo empieza parecido a /api/auth", () => {
    expect(isPublicPath("/api/authorize")).toBe(false);
    expect(isPublicPath("/api/auth-bypass")).toBe(false);
  });
});

describe("isPublicPath — recetas compartidas por link", () => {
  it("deja pasar la página pública de una receta", () => {
    expect(isPublicPath("/r/AbC123_xyz-456")).toBe(true);
  });

  it("abrir /r/ NO abre nada más", () => {
    for (const p of [
      "/recipes",              // mis recetas sigue privada
      "/recipes/abc",
      "/rx/abc",               // prefijo parecido
      "/recetas/abc",
      "/api/recipes",          // la API sigue cerrada
      "/api/recipes/abc/share",
      "/api/ai/generate",      // la IA nunca se abre: cuesta dinero
      "/r",                    // sin token no hay nada que mostrar
      "/settings",
    ]) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });
});
