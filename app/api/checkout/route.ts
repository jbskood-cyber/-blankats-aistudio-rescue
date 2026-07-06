import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createOrder } from "../../../lib/orders-store";

export async function POST(req: NextRequest) {
  try {
    const { analysis, improvedCV, fileName, customerEmail } = await req.json();

    if (!analysis || !improvedCV) {
      return NextResponse.json(
        { error: "Missing analysis or improvedCV data." },
        { status: 400 }
      );
    }

    // Generate a unique order ID
    const orderId = crypto.randomUUID();
    const downloadToken = crypto.randomUUID();

    // Determine application base URL dynamically
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

    let preferenceId: string | null = null;
    let initPoint: string | null = null;

    const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (mpToken && mpToken.trim() !== "" && mpToken !== "YOUR_MERCADO_PAGO_ACCESS_TOKEN") {
      try {
        console.log("Initializing real Mercado Pago preference for order:", orderId);
        const mpClient = new MercadoPagoConfig({ accessToken: mpToken });
        const preference = new Preference(mpClient);

        // Mercado Pago expects notification_url to be HTTPS for live/sandbox notifications.
        // We set notification_url as required.
        const notificationUrl = `${appUrl}/api/mercadopago/webhook`;

        const response = await preference.create({
          body: {
            items: [
              {
                id: "blankats-premium",
                title: "Optimización de CV Profesional - BlankATS",
                quantity: 1,
                unit_price: 49.00,
                currency_id: "MXN",
              },
            ],
            external_reference: orderId,
            back_urls: {
              success: `${appUrl}/success?orderId=${orderId}`,
              failure: `${appUrl}/paywall?orderId=${orderId}`,
              pending: `${appUrl}/pending?orderId=${orderId}`,
            },
            auto_return: "approved",
            notification_url: notificationUrl,
          },
        });

        preferenceId = response.id || null;
        initPoint = response.init_point || null;
      } catch (mpError) {
        console.error("Failed to create real Mercado Pago preference:", mpError);
      }
    }

    // If real Mercado Pago was not configured or failed to initialize, use Mock Checkout Simulator
    if (!initPoint) {
      console.log("Using Mock Checkout simulator for order:", orderId);
      initPoint = `${appUrl}/api/checkout/mock-pay?orderId=${orderId}`;
    }

    // Create pending order in database
    await createOrder({
      id: orderId,
      amount: 49.00,
      currency: "MXN",
      status: "pending",
      payment_provider: "mercadopago",
      customer_email: customerEmail || null,
      mercado_pago_preference_id: preferenceId,
      analysis_json: analysis,
      improved_cv_json: improvedCV,
      original_file_name: fileName || null,
      download_token: downloadToken,
    });

    return NextResponse.json({
      orderId,
      init_point: initPoint,
      isMock: !mpToken,
    });
  } catch (error: any) {
    console.error("Error in /api/checkout:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
