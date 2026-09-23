import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin esto, Next.js bloquea en desarrollo las peticiones (incluida la
  // conexión de recarga en caliente) que llegan por una IP de red distinta
  // a "localhost" — por eso los botones no respondían al probar desde el
  // celular o desde http://192.168.0.8:3000. *.trycloudflare.com es el
  // dominio que usa "cloudflared tunnel --url" para mostrar el avance sin
  // publicar nada (ver CLAUDE.md).
  allowedDevOrigins: ["192.168.0.8", "*.trycloudflare.com"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default nextConfig;
