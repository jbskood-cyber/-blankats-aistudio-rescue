import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'BlankATS V1 — Optimizador Profesional de CVs',
  description: 'Convierte tu CV actual en una versión limpia, profesional, clara y fácil de revisar por reclutadores y sistemas de selección digital.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es">
      <body className="font-sans antialiased bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

