import { NextRequest, NextResponse } from "next/server";
import { getCheckoutMode, isOfficialProductionUrl } from "../../../../lib/checkout-mode";
import { getOrderById } from "../../../../lib/orders-store";

export async function GET(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (getCheckoutMode() !== "mock" || isOfficialProductionUrl(host)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return new NextResponse("Falta el ID de la orden.", { status: 400 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return new NextResponse("Orden no encontrada.", { status: 404 });
  }

  const html = `
<!DOCTYPE html>
<` + `html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simulador de Pago - BlankATS</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#f8fafc] font-sans min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
    <!-- Header -->
    <div class="bg-[#009ee3] p-6 text-white text-center">
      <h1 class="text-xl font-black uppercase tracking-wider">MERCADO PAGO</h1>
      <p class="text-xs font-bold opacity-80 mt-1">Ambiente de Simulación Sandbox</p>
    </div>

    <!-- Content -->
    <div class="p-6">
      <div class="text-center mb-6">
        <p class="text-slate-400 text-xs font-bold uppercase tracking-wider">Estás pagando</p>
        <h3 class="text-lg font-black text-slate-800 mt-1">BlankATS CV Premium</h3>
        <p class="text-4xl font-black text-slate-900 mt-2">$49.00 <span class="text-lg font-bold">MXN</span></p>
      </div>

      <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
        <p class="text-xs text-blue-800 font-medium leading-relaxed">
          <strong>Modo Sandbox Activo:</strong> Mercado Pago no está configurado o está en modo de desarrollo. Utiliza este simulador para probar la pasarela de pagos de manera segura sin dinero real.
        </p>
      </div>

      <div class="space-y-3">
        <a href="/api/checkout/mock-pay/process?orderId=${orderId}&action=approve" 
           class="w-full flex items-center justify-center bg-[#009ee3] hover:bg-[#0089c4] text-white font-black py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition duration-200 text-[14px]">
          Simular Pago Aprobado (Éxito)
        </a>
        <a href="/api/checkout/mock-pay/process?orderId=${orderId}&action=reject" 
           class="w-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-black py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition duration-200 text-[14px]">
          Simular Pago Rechazado (Error)
        </a>
        <a href="/api/checkout/mock-pay/process?orderId=${orderId}&action=pending" 
           class="w-full flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-white font-black py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition duration-200 text-[14px]">
          Simular Pago Pendiente (Pendiente)
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div class="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
      <span>Orden: ${orderId.slice(0, 8)}...</span>
      <span>Simulación BlankATS V1</span>
    </div>
  </div>
</body>
</` + `html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" }
  });
}
