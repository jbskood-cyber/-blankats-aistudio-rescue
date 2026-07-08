import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "../../../lib/orders-store";

const PRODUCTION_HOSTS = [
  "blankats-cv-mx.netlify.app",
  "production--blankats-cv-mx.netlify.app",
];

function getAppUrl(req: NextRequest) {
  const host = req.headers.get("host") || "localhost:3000";
  const proto = host.includes("localhost") || host.includes("127.0.0.1")
    ? (req.headers.get("x-forwarded-proto") || "http")
    : "https";

  return `${proto}://${host}`.replace(/\/$/, "");
}

function isProductionHost(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();
  const configuredUrl = (process.env.NEXT_PUBLIC_APP_URL || "").toLowerCase();

  return PRODUCTION_HOSTS.some((productionHost) => (
    host.includes(productionHost) || configuredUrl.includes(productionHost)
  ));
}

export async function POST(req: NextRequest) {
  try {
    if (isProductionHost(req)) {
      return NextResponse.json({
        error: "checkout_disabled_on_main",
        details: "Main is a development branch. Mock checkout is blocked on the production host.",
      }, { status: 403 });
    }

    const { analysis, improvedCV, fileName, customerEmail } = await req.json();

    if (!analysis || !improvedCV) {
      return NextResponse.json(
        { error: "Missing analysis or improvedCV data." },
        { status: 400 }
      );
    }

    const orderId = crypto.randomUUID();
    const downloadToken = crypto.randomUUID();
    const appUrl = getAppUrl(req);
    const paidAt = new Date().toISOString();

    console.log("Main development checkout: using mock payment only.", {
      checkoutMode: "mock-main-development",
      appUrl,
    });

    await createOrder({
      id: orderId,
      amount: 49.00,
      currency: "MXN",
      status: "approved",
      payment_provider: "mock",
      customer_email: customerEmail || null,
      mercado_pago_preference_id: null,
      mercado_pago_payment_id: `MOCK-PAY-${orderId.slice(0, 8).toUpperCase()}`,
      analysis_json: analysis,
      improved_cv_json: improvedCV,
      original_file_name: fileName || null,
      download_token: downloadToken,
      paid_at: paidAt,
    });

    return NextResponse.json({
      orderId,
      init_point: `${appUrl}/success?orderId=${orderId}`,
      isMock: true,
    });
  } catch (error: any) {
    console.error("Error in main mock /api/checkout:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
