import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Permite cargar los recursos de desarrollo desde el movil en la misma wifi.
  // Sin esto, Next 16 bloquea /_next/* desde otra IP y la pagina no se hidrata
  // (se ve pero no responde al toque).
  allowedDevOrigins: ["192.168.0.17"],
};

export default nextConfig;
