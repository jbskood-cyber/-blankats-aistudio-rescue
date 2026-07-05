import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlankATS - CV clarity studio",
  description:
    "Analiza tu CV y prepara una version mas clara, profesional y facil de revisar para procesos digitales.",
  applicationName: "BlankATS",
  openGraph: {
    title: "BlankATS - CV clarity studio",
    description:
      "Mejora la estructura y presentacion de tu CV con un diagnostico claro y una vista previa descargable.",
    siteName: "BlankATS",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
