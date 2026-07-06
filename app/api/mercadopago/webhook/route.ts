import { NextRequest, NextResponse } from "next/server";
import { getOrderByPreferenceId, updateOrderStatus } from "../../../../lib/orders-store";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));

    console.log("Received Mercado Pago Webhook:", {
      query: Object.fromEntries(searchParams.entries()),
      body,
    });

    // 1. Extract payment ID
    // Webhooks might send payment ID in body.data.id or as a query param 'id' or 'data.id'
    const paymentId = 
      body.data?.id || 
      searchParams.get("data.id") || 
      searchParams.get("id") ||
      body.id;

    // We also support topic-based notifications
    const topic = searchParams.get("topic") || body.type;

    if (!paymentId) {
      console.log("No payment ID found in webhook payload.");
      return NextResponse.json({ success: true }); // Return 200 to prevent retry
    }

    if (topic && topic !== "payment") {
      console.log("Ignoring non-payment topic notification:", topic);
      return NextResponse.json({ success: true });
    }

    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpToken || mpToken.trim() === "" || mpToken === "YOUR_MERCADO_PAGO_ACCESS_TOKEN") {
      console.warn("Mercado Pago token is missing, cannot verify payment with Mercado Pago API.");
      return NextResponse.json({ error: "Mercado Pago is not configured" }, { status: 400 });
    }

    // 2. Fetch payment details from Mercado Pago API
    console.log("Fetching payment details from MP API for ID:", paymentId);
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mpToken}`,
      },
    });

    if (!mpResponse.ok) {
      console.error(`Failed to fetch payment details from MP API. Status: ${mpResponse.status}`);
      return NextResponse.json({ error: "Failed to fetch payment details" }, { status: 500 });
    }

    const paymentData = await mpResponse.json();
    console.log("MP Payment Details:", {
      status: paymentData.status,
      external_reference: paymentData.external_reference,
      preference_id: paymentData.preference_id,
    });

    const orderId = paymentData.external_reference;
    const mpStatus = paymentData.status;

    if (!orderId) {
      console.log("Payment details do not contain an external_reference (orderId). Trying to match by preference_id.");
      // If external_reference is somehow missing, try finding order by preference_id
      const prefId = paymentData.preference_id;
      if (prefId) {
        const matchedOrder = await getOrderByPreferenceId(prefId);
        if (matchedOrder) {
          console.log("Successfully matched order by preference_id:", matchedOrder.id);
          const newStatus = mpStatus === "approved" ? "approved" : mpStatus === "rejected" ? "rejected" : "pending";
          const paidAt = mpStatus === "approved" ? (paymentData.date_approved || new Date().toISOString()) : null;
          await updateOrderStatus(matchedOrder.id, newStatus, paymentId, paidAt);
        }
      }
      return NextResponse.json({ success: true });
    }

    // 3. Update Order Status
    if (mpStatus === "approved") {
      const paidAt = paymentData.date_approved || new Date().toISOString();
      console.log(`Order ${orderId} has been APPROVED! Updating status.`);
      await updateOrderStatus(orderId, "approved", paymentId, paidAt);
    } else if (mpStatus === "rejected") {
      console.log(`Order ${orderId} was REJECTED.`);
      await updateOrderStatus(orderId, "rejected", paymentId, null);
    } else if (mpStatus === "cancelled" || mpStatus === "refunded") {
      console.log(`Order ${orderId} was cancelled/refunded.`);
      await updateOrderStatus(orderId, "expired", paymentId, null);
    } else {
      console.log(`Order ${orderId} is still in state: ${mpStatus}`);
      await updateOrderStatus(orderId, "pending", paymentId, null);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in Mercado Pago Webhook handler:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// Support GET request for easy ping/verification or manual checks
export async function GET(req: NextRequest) {
  return NextResponse.json({ message: "Mercado Pago Webhook endpoint is active." });
}
