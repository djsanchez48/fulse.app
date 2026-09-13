import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo aplica a `next dev`: permite abrir la app desde el celular por la IP de la
  // red local. Sin esto Next bloquea los recursos /_next/ y la pagina carga sin JS.
  allowedDevOrigins: ["192.168.1.59"],
};

export default nextConfig;
