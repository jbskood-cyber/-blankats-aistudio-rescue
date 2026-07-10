import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-950 p-6 text-center font-sans">
      <h2 className="text-2xl font-bold tracking-tight mb-2 text-slate-900">404 - Página no encontrada</h2>
      <p className="text-slate-600 mb-6 text-sm">Lo sentimos, la página que buscas no existe o ha sido movida.</p>
      <Link href="/" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-all text-sm">
        Volver al Inicio
      </Link>
    </div>
  );
}
