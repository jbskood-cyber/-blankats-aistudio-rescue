import { NextRequest, NextResponse } from "next/server";
import { getOrderByDownloadToken } from "../../../../lib/orders-store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const resolvedParams = await params;
    const token = resolvedParams?.token;

    if (!token) {
      return NextResponse.json({ error: "Falta el token de descarga." }, { status: 400 });
    }

    const order = await getOrderByDownloadToken(token);
    if (!order) {
      return NextResponse.json({ error: "Enlace no encontrado." }, { status: 404 });
    }

    if (order.status !== "approved") {
      return NextResponse.json({ error: "La orden no está aprobada." }, { status: 403 });
    }

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      original_file_name: order.original_file_name,
      downloadToken: token,
      analysis: order.analysis_json,
      improvedCV: order.improved_cv_json,
    });
  } catch (error) {
    console.error("Error in GET /api/download/[token]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
