import { describe, it, expect } from "vitest";
import { isAllowedEmail, normalizeEmail } from "@/lib/allowlist";

const DUENO = "djsanchez48.DS@gmail.com";

describe("normalizeEmail", () => {
  it("pasa a minúsculas", () => {
    expect(normalizeEmail("David.DS@Gmail.com")).toBe("davidds@gmail.com");
  });

  it("ignora los puntos en Gmail (mismo buzón)", () => {
    expect(normalizeEmail("d.j.sanchez@gmail.com")).toBe("djsanchez@gmail.com");
  });

  it("ignora el sufijo +etiqueta", () => {
    expect(normalizeEmail("dj+fulse@gmail.com")).toBe("dj@gmail.com");
  });

  it("trata googlemail.com como gmail.com", () => {
    expect(normalizeEmail("dj@googlemail.com")).toBe("dj@gmail.com");
  });

  it("NO quita puntos fuera de Gmail, donde sí distinguen cuentas", () => {
    expect(normalizeEmail("david.sanchez@alegra.com")).toBe("david.sanchez@alegra.com");
  });
});

describe("isAllowedEmail — deja entrar al dueño", () => {
  it("acepta el correo exacto", () => {
    expect(isAllowedEmail(DUENO, DUENO)).toBe(true);
  });

  it("acepta como lo devuelve Google: minúsculas y sin puntos", () => {
    expect(isAllowedEmail("djsanchez48ds@gmail.com", DUENO)).toBe(true);
    expect(isAllowedEmail("djsanchez48.ds@gmail.com", DUENO)).toBe(true);
    expect(isAllowedEmail("DJSANCHEZ48.DS@GMAIL.COM", DUENO)).toBe(true);
  });

  it("soporta varios correos separados por coma", () => {
    expect(isAllowedEmail("otro@gmail.com", `${DUENO}, otro@gmail.com`)).toBe(true);
  });
});

describe("isAllowedEmail — bloquea a todos los demás", () => {
  it("rechaza cualquier otra cuenta de Google", () => {
    for (const intruso of ["random@gmail.com", "djsanchez49.ds@gmail.com", "djsanchez48ds@hotmail.com"]) {
      expect(isAllowedEmail(intruso, DUENO), intruso).toBe(false);
    }
  });

  it("no se deja engañar por un dominio parecido", () => {
    expect(isAllowedEmail("djsanchez48ds@gmail.com.attacker.io", DUENO)).toBe(false);
    expect(isAllowedEmail("djsanchez48ds@notgmail.com", DUENO)).toBe(false);
  });

  it("deniega por defecto si no hay allowlist configurada", () => {
    expect(isAllowedEmail(DUENO, undefined)).toBe(false);
    expect(isAllowedEmail(DUENO, "")).toBe(false);
    expect(isAllowedEmail(DUENO, "   ")).toBe(false);
    expect(isAllowedEmail(DUENO, " , , ")).toBe(false);
  });

  it("rechaza cuando Google no devuelve correo", () => {
    expect(isAllowedEmail(null, DUENO)).toBe(false);
    expect(isAllowedEmail(undefined, DUENO)).toBe(false);
    expect(isAllowedEmail("", DUENO)).toBe(false);
  });
});
