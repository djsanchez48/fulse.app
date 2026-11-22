"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/acceso", "/bienvenida"];

/**
 * Ya no decide si hay sesion: de eso se encarga `src/proxy.ts` en el servidor,
 * y la cookie de Auth.js es httpOnly, asi que desde JS no se puede leer —que es
 * justamente el punto. Aqui solo queda el redirect de onboarding.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) return;
    if (onboardingChecked) return;

    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        setOnboardingChecked(true);
        if (p && !p.onboardingCompletedAt) router.replace("/bienvenida");
      })
      .catch(() => setOnboardingChecked(true));
  }, [pathname, router, onboardingChecked]);

  return <>{children}</>;
}
