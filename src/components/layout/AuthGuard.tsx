"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const PUBLIC_PATHS = ["/acceso", "/api/auth/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (PUBLIC_PATHS.includes(pathname)) return;

    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("recepia_session="))
      ?.split("=")[1];

    if (!token) {
      const next = encodeURIComponent(pathname);
      router.replace(`/acceso?next=${next}`);
    }
  }, [pathname, router]);

  return <>{children}</>;
}
