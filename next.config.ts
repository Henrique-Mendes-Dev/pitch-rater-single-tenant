import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuração original do Turbopack para processar o Tailwind CSS
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Remove todos os console.log automaticamente no build de produção
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Injeta Security Headers em todas as rotas
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY", 
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", 
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin", 
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload", 
          },
        ],
      },
    ];
  },
};

export default nextConfig;