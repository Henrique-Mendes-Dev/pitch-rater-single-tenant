import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { ReactNode } from "react";
import "./globals.css";

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-dm-sans"
});

export const metadata: Metadata = {
  title: "Pitch Rater",
  description: "Sistema de Avaliação de Pitches",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={dmSans.className}>
      <body>{children}</body>
    </html>
  );
}