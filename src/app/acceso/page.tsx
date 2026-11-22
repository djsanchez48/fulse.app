"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n-context";

function AccesoForm() {
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // Solo rutas internas: `next` termina en un redirect, asi que una URL externa
  // o `javascript:` seria un open redirect.
  const rawNext = searchParams.get("next") ?? "/";
  const next = /^\/(?!\/)/.test(rawNext) ? rawNext : "/";

  // Auth.js manda aqui con ?error= por motivos muy distintos. Solo AccessDenied
  // significa que la allowlist rechazo la cuenta; tratar todo como rechazo hacia
  // que un fallo tecnico (ej. invalid_grant) acusara al usuario de no tener permiso.
  const error = searchParams.get("error");
  const rechazado = error === "AccessDenied";
  const falloTecnico = error !== null && !rechazado;
  const [loading, setLoading] = useState(false);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <span className="text-4xl">🍳</span>
        <h1 className="mt-3 text-xl font-bold">Fulse</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("acceso.subtitle")}</p>
      </div>

      <Button
        onClick={() => { setLoading(true); signIn("google", { callbackUrl: next }); }}
        disabled={loading}
        className="h-11 w-full gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
        {loading ? t("acceso.entering") : t("acceso.sign_in_google")}
      </Button>

      {rechazado && (
        <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">
          {t("acceso.not_allowed")}
        </p>
      )}

      {falloTecnico && (
        <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {t("acceso.try_again")}
        </p>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.0 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37.0 40.2 44 35 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export default function AccesoPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Suspense fallback={<div className="text-zinc-400">Cargando...</div>}>
        <AccesoForm />
      </Suspense>
    </div>
  );
}
