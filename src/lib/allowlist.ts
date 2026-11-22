/**
 * Google devuelve el correo en minusculas y sin garantia de conservar los puntos
 * tal como el usuario los escribio. Para Gmail, `d.j@gmail.com` y `dj@gmail.com`
 * son el mismo buzon, igual que todo lo que vaya despues de un `+`.
 * Sin normalizar, la allowlist podria rechazar al unico dueño de la app.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at === -1) return trimmed;

  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.split("+")[0].replaceAll(".", "");
    return `${local}@gmail.com`;
  }

  // En otros dominios los puntos SI distinguen cuentas: solo se quita el sufijo +.
  return `${local.split("+")[0]}@${domain}`;
}

/**
 * Unica puerta de entrada. Por defecto deniega: si no hay allowlist configurada
 * no entra nadie, en vez de abrirle la app al mundo.
 */
export function isAllowedEmail(
  email: string | null | undefined,
  allowlist: string | null | undefined,
): boolean {
  if (!email || !allowlist) return false;

  const permitidos = allowlist
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map(normalizeEmail);

  if (permitidos.length === 0) return false;

  return permitidos.includes(normalizeEmail(email));
}
