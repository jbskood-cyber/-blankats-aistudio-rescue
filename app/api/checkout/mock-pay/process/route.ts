import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus } from "../../../../../lib/orders-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const action = searchParams.get("action");

  if (!orderId) {
    return new NextResponse("Falta el ID de la orden.", { status: 400 });
  }

  // Determine dynamic host and protocol for redirection
  const host = req.headers.get("host") || "localhost:3000";
  let protocol = req.headers.get("x-forwarded-proto") || "http";
  if (!host.includes("localhost") && !host.includes("127.0.0.1")) {
    protocol = "https";
  }
  let appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl || appUrl.trim() === "" || appUrl === "MY_APP_URL" || !appUrl.startsWith("http")) {
    appUrl = `${protocol}://${host}`;
  } else if (appUrl.startsWith("http://") && !appUrl.includes("localhost") && !appUrl.includes("127.0.0.1")) {
    appUrl = appUrl.replace("http://", "https://");
  }

  if (action === "approve") {
    const paymentId = "MOCK-PAY-" + Math.random().toString(36).substring(2, 11).toUpperCase();
    const paidAt = new Date().toISOString();
    await updateOrderStatus(orderId, "approved", paymentId, paidAt);
    return NextResponse.redirect(`${appUrl}/success?orderId=${orderId}`);
  } else if (action === "reject") {
    await updateOrderStatus(orderId, "rejected", null, null);
    return NextResponse.redirect(`${appUrl}/paywall?orderId=${orderId}`);
  } else {
    // pending
    await updateOrderStatus(orderId, "pending", null, null);
    return NextResponse.redirect(`${appUrl}/pending?orderId=${orderId}`);
  }
}
