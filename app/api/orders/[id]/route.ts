import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "../../../../lib/orders-store";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "Falta el ID de la orden." }, { status: 400 });
    }

    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada." }, { status: 404 });
    }

    const isApproved = order.status === "approved";

    // Clean sensitive properties and only return results when approved
    return NextResponse.json({
      id: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      payment_provider: order.payment_provider,
      created_at: order.created_at,
      original_file_name: order.original_file_name,
      allowDownload: isApproved,
      download_token: isApproved ? order.download_token : null,
      // CV optimization details are strictly kept behind paywall until status === 'approved'
      analysis: isApproved ? order.analysis_json : null,
      improvedCV: isApproved ? order.improved_cv_json : null,
    });
  } catch (error: any) {
    console.error("Error in GET /api/orders/[id]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
