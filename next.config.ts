import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
            value: "DENY", // Impede que o site seja aberto dentro de iframes maliciosos (Clickjacking)
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff", // Bloqueia execução de arquivos disfarçados (MIME sniffing)
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin", // Protege dados de navegação ao clicar em links externos
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload", // Força conexão HTTPS estrita
          },
        ],
      },
    ];
  },
};

export default nextConfig;